import { Client } from "@notionhq/client";
import {
  createLimiterStore,
  denyIfCrossOrigin,
  digitsOnly,
  getClientIp,
  isRateLimited,
  json,
  normalizeText,
  readJsonBody,
} from "../_lib/security.js";
import { getDataSourceId } from "../_lib/notion-data-source.js";

const recoverLimiter = createLimiterStore();
const DATE_PROP_NAME = "접수일시";
const NAME_PROP_NAME = "고객명";
const PHONE_PROP_NAME = "연락처";
const RECEIPT_PROP_NAME = "접수번호";
const MAX_RETURN = 5;
const PAGE_SIZE = 100;

function normName(v) {
  return normalizeText(v, 40).replace(/\s+/g, "");
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

function maskPhone(phoneDigits) {
  if (!phoneDigits) return "";
  const d = String(phoneDigits);
  const last4 = d.slice(-4).padStart(4, "*");
  const head = d.slice(0, 3);
  return `${head}****${last4}`;
}

function makeDayRangeISO(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(`${dateStr}T00:00:00+09:00`);
  end.setDate(end.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const crossOrigin = denyIfCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (isRateLimited(recoverLimiter, `recover:${ip}`, 8, 10 * 60 * 1000)) {
    return json({ error: "조회 요청이 많아요. 잠시 후 다시 시도해 주세요." }, 429);
  }

  try {
    const body = await readJsonBody(request);
    const notion = new Client({ auth: env.NOTION_TOKEN });
    const dataSourceId = await getDataSourceId(notion, env);

    const name = normalizeText(body.name, 40);
    const phone = normalizeText(body.phone, 20);
    const date = normalizeText(body.date, 20);

    if (!env.NOTION_DATABASE_ID) return json({ error: "Missing NOTION_DATABASE_ID" }, 500);
    if (!name || !phone || !date) {
      return json({ error: "Missing fields (name, phone, date)" }, 400);
    }

    const inputName = normName(name);
    const inputPhone = digitsOnly(phone);

    if (inputName.length < 2) {
      return json({ error: "Name too short" }, 400);
    }
    if (inputPhone.length < 9 || inputPhone.length > 11) {
      return json({ error: "Invalid phone number" }, 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return json({ error: "Invalid date format (YYYY-MM-DD)" }, 400);
    }

    const { startISO, endISO } = makeDayRangeISO(date);
    let cursor = undefined;
    const hits = [];

    while (true) {
      const resp = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: PAGE_SIZE,
        start_cursor: cursor,
        filter: {
          and: [
            { property: DATE_PROP_NAME, created_time: { on_or_after: startISO } },
            { property: DATE_PROP_NAME, created_time: { before: endISO } },
          ],
        },
        sorts: [{ timestamp: "created_time", direction: "descending" }],
      });

      for (const page of resp.results || []) {
        const props = page.properties || {};
        const receipt = getTitleText(props[RECEIPT_PROP_NAME]);
        if (!receipt) continue;

        const savedName = normName(getRichText(props[NAME_PROP_NAME]));
        const savedPhoneDigits = digitsOnly(getRichText(props[PHONE_PROP_NAME]));

        if (savedName !== inputName) continue;
        if (savedPhoneDigits !== inputPhone) continue;

        hits.push({
          receipt,
          createdKST: formatKST(page.created_time),
          phoneMasked: maskPhone(savedPhoneDigits),
        });

        if (hits.length >= MAX_RETURN) break;
      }

      if (hits.length >= MAX_RETURN) break;
      if (!resp.has_more) break;
      cursor = resp.next_cursor;
    }

    return json(
      {
        success: true,
        count: hits.length,
        items: hits,
        truncated: hits.length >= MAX_RETURN,
      },
      200
    );
  } catch (e) {
    console.error("recover error:", e);
    return json({ error: "Server error" }, 500);
  }
}
