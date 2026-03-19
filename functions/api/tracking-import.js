import { Client } from "@notionhq/client";
import {
  createLimiterStore,
  denyIfCrossOrigin,
  getClientIp,
  isRateLimited,
  json,
  readJsonBody,
  safeEqual,
} from "../_lib/security.js";
import { getDataSourceId } from "../_lib/notion-data-source.js";

const TARGET_STATUS = "출고준비";
const DEFAULT_LOOKBACK_DAYS = 14;
const UPDATE_DELAY_MS = 350;
const MISS_CHECK_DELAY_MS = 120;
const MAX_MISS_STATUS_CHECK = 30;

const requestLimiter = createLimiterStore();
const passwordLimiter = createLimiterStore();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function kstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function ymdKST() {
  const d = kstNow();
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatKST(iso) {
  try {
    const d = new Date(iso);
    const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const yy = k.getUTCFullYear();
    const mm = String(k.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(k.getUTCDate()).padStart(2, "0");
    const hh = String(k.getUTCHours()).padStart(2, "0");
    const mi = String(k.getUTCMinutes()).padStart(2, "0");
    return `${yy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return "";
  }
}

function getTitleText(prop) {
  try {
    const t = prop?.title || [];
    return t.map((x) => x.plain_text).join("").trim();
  } catch {
    return "";
  }
}

function getRichText(prop) {
  try {
    const rt = prop?.rich_text || [];
    return rt.map((x) => x.plain_text).join("").trim();
  } catch {
    return "";
  }
}

function getStatusName(prop) {
  try {
    return prop?.status?.name || "";
  } catch {
    return "";
  }
}

function isValidReceipt(v) {
  return /^\d{6}-\d{6}-.{1,40}-\d{4}$/.test(String(v || "").trim());
}

function isValidTracking(v) {
  return /^\d[\d-]{7,25}$/.test(String(v || "").trim());
}

async function buildReceiptMap(notion, dataSourceId, lookbackDays) {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const map = new Map();
  const dup = new Set();

  let cursor = undefined;
  while (true) {
    const resp = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
      filter: {
        and: [
          { property: "접수일시", created_time: { on_or_after: since } },
          { property: "처리상태", status: { equals: TARGET_STATUS } },
        ],
      },
    });

    for (const page of resp.results || []) {
      const props = page.properties || {};
      const receipt = getTitleText(props["접수번호"]);
      if (!receipt) continue;

      if (map.has(receipt)) {
        dup.add(receipt);
      } else {
        const existingTracking = getRichText(props["송장번호"]);
        map.set(receipt, { pageId: page.id, existingTracking });
      }
    }

    if (!resp.has_more) break;
    cursor = resp.next_cursor;
  }

  return { map, dup };
}

async function queryPagesByReceipt(notion, dataSourceId, receipt) {
  return await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 5,
    filter: {
      property: "접수번호",
      title: { equals: receipt },
    },
  });
}

async function updateTracking({ notion, pageId, trackingNo, setDone, overwrite, existingTracking }) {
  if (existingTracking && !overwrite) {
    return { updated: false, reason: "이미 송장번호가 있음", existing: existingTracking };
  }

  const newProps = {
    송장번호: { rich_text: [{ text: { content: trackingNo } }] },
  };

  if (setDone) {
    newProps["처리상태"] = { status: { name: "출고완료" } };
    newProps["출고일시"] = { date: { start: ymdKST() } };
  }

  await notion.pages.update({
    page_id: pageId,
    properties: newProps,
  });

  return { updated: true };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const crossOrigin = denyIfCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (isRateLimited(requestLimiter, `tracking:${ip}`, 20, 10 * 60 * 1000)) {
    return json({ error: "요청이 많아요. 잠시 후 다시 시도해 주세요." }, 429);
  }

  try {
    const notion = new Client({ auth: env.NOTION_TOKEN });
    const dataSourceId = await getDataSourceId(notion, env);
    const body = await readJsonBody(request);

    const {
      pass,
      items,
      overwrite = false,
      setDone = true,
      dryRun = true,
      lookbackDays,
      checkMissStatus = false,
    } = body;

    if (!env.TRACKING_ADMIN_PASS) {
      return json(
        {
          error: "서버 설정 오류: TRACKING_ADMIN_PASS가 설정되지 않았습니다.",
          hint: "Cloudflare Pages > Settings > Variables and Secrets 에 TRACKING_ADMIN_PASS를 추가한 뒤 다시 배포하세요.",
        },
        500
      );
    }

    if (!pass || !safeEqual(pass, env.TRACKING_ADMIN_PASS)) {
      const badPassKey = `tracking-pass:${ip}`;
      if (isRateLimited(passwordLimiter, badPassKey, 5, 15 * 60 * 1000)) {
        return json({ error: "비밀번호 시도가 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429);
      }
      return json(
        {
          error: "운영자 비밀번호가 올바르지 않습니다.",
          hint: "비밀번호를 다시 확인해 주세요.",
        },
        401
      );
    }

    if (!env.NOTION_DATABASE_ID) {
      return json({ error: "Missing NOTION_DATABASE_ID" }, 500);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: "items is empty" }, 400);
    }

    if (items.length > 150) {
      return json({ error: "한 번에 처리할 수 있는 행 수를 초과했습니다. 파일을 나눠서 다시 시도해 주세요." }, 400);
    }

    for (const row of items) {
      if (!isValidReceipt(row.receipt) || !isValidTracking(row.tracking)) {
        return json({ error: "엑셀 데이터 형식을 다시 확인해 주세요. (접수번호/운송장번호)" }, 400);
      }
    }

    const lb = Number.isFinite(Number(lookbackDays)) ? Number(lookbackDays) : DEFAULT_LOOKBACK_DAYS;
    const { map, dup } = await buildReceiptMap(notion, dataSourceId, lb);

    const results = [];
    let ok = 0, miss = 0, duplicated = 0, skipped = 0, updated = 0;
    let missCheckCount = 0;

    for (const it of items) {
      const receipt = String(it.receipt || "").trim();
      const tracking = String(it.tracking || "").trim();
      if (!receipt || !tracking) continue;

      if (dup.has(receipt)) {
        duplicated++;
        results.push({ receipt, tracking, status: "중복(출고준비에서 같은 접수번호 2개 이상)" });
        continue;
      }

      const hit = map.get(receipt);

      if (!hit) {
        if (dryRun && checkMissStatus) {
          if (missCheckCount >= MAX_MISS_STATUS_CHECK) {
            miss++;
            results.push({ receipt, tracking, status: `미일치(상태 확인 생략: 최대 ${MAX_MISS_STATUS_CHECK}건만 조회)` });
            continue;
          }

          missCheckCount++;

          try {
            const q = await queryPagesByReceipt(notion, dataSourceId, receipt);
            await sleep(MISS_CHECK_DELAY_MS);
            const found = q.results || [];

            if (found.length === 0) {
              miss++;
              results.push({ receipt, tracking, status: "미일치(노션에 없음)" });
              continue;
            }

            if (found.length > 1) {
              duplicated++;
              results.push({ receipt, tracking, status: `중복(노션에 동일 접수번호 ${found.length}개 존재)` });
              continue;
            }

            const page = found[0];
            const props = page.properties || {};
            const st = getStatusName(props["처리상태"]) || "(상태없음)";
            const existing = getRichText(props["송장번호"]);
            const created = formatKST(page.created_time);

            miss++;
            results.push({
              receipt,
              tracking,
              status: `미일치(노션에는 있음: 처리상태='${st}'${existing ? `, 기존 송장='${existing}'` : ""}${created ? `, 접수=${created}` : ""})`,
            });
            continue;
          } catch {
            miss++;
            results.push({ receipt, tracking, status: "미일치(상태 확인 실패: 잠시 후 다시 시도)" });
            continue;
          }
        }

        miss++;
        results.push({ receipt, tracking, status: `미일치(노션에 없음 또는 처리상태가 '${TARGET_STATUS}' 아님)` });
        continue;
      }

      ok++;

      if (dryRun) {
        if (hit.existingTracking && !overwrite) {
          skipped++;
          results.push({ receipt, tracking, status: `건너뜀: 이미 송장번호 있음(${hit.existingTracking})` });
        } else {
          results.push({ receipt, tracking, status: "일치(적용 가능)" });
        }
      } else {
        const r = await updateTracking({
          notion,
          pageId: hit.pageId,
          trackingNo: tracking,
          setDone,
          overwrite,
          existingTracking: hit.existingTracking,
        });

        if (r.updated) {
          updated++;
          results.push({ receipt, tracking, status: "업데이트 완료" });
        } else {
          skipped++;
          results.push({ receipt, tracking, status: `건너뜀: ${r.reason}` });
        }

        await sleep(UPDATE_DELAY_MS);
      }
    }

    return json(
      {
        success: true,
        dryRun,
        lookbackDays: lb,
        summary: { ok, miss, duplicated, updated, skipped },
        results,
        missStatusChecked: dryRun && checkMissStatus ? Math.min(missCheckCount, MAX_MISS_STATUS_CHECK) : 0,
      },
      200
    );
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
}
