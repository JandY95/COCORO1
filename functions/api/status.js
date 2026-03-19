import { Client } from "@notionhq/client";
import {
  createLimiterStore,
  denyIfCrossOrigin,
  getClientIp,
  isRateLimited,
  json,
  readJsonBody,
} from "../_lib/security.js";
import { getDataSourceId } from "../_lib/notion-data-source.js";

const statusLimiter = createLimiterStore();
const PROP_RECEIPT = "접수번호";
const PROP_STATUS = "처리상태";
const PROP_TRACK = "송장번호";
const RECEIPT_PATTERN = /^\d{6}-\d{6}-.{1,40}-\d{4}$/;

function titleText(p) {
  const t = p?.title || [];
  return t.map((x) => x.plain_text || "").join("").trim();
}

function richText(p) {
  const t = p?.rich_text || [];
  return t.map((x) => x.plain_text || "").join("").trim();
}

function toDebug(err, env) {
  return {
    name: err?.name || "",
    code: err?.code || "",
    status: String(err?.status || err?.statusCode || 0),
    message: err?.message || String(err),
    hasNotionToken: !!String(env?.NOTION_TOKEN || "").trim(),
    hasNotionDbId: !!String(env?.NOTION_DATABASE_ID || "").trim(),
    notionDbIdPreview: String(env?.NOTION_DATABASE_ID || "").trim().slice(0, 8),
    body: err?.body || null,
  };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const crossOrigin = denyIfCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (isRateLimited(statusLimiter, `status:${ip}`, 60, 10 * 60 * 1000)) {
    return json(
      {
        error: "TOO_MANY_REQUESTS",
        message: "조회 요청이 많아요. 잠시 후 다시 시도해 주세요.",
      },
      429
    );
  }

  const url = new URL(request.url);
  const debugMode = url.searchParams.get("debug") === "1";
  const body = request.method === "POST" ? await readJsonBody(request) : {};
  const receipt = String(
    request.method === "GET"
      ? url.searchParams.get("receipt")
      : body?.receipt || ""
  ).trim();

  if (!receipt) {
    return json({ error: "Missing receipt" }, 400);
  }

  if (receipt.length > 80 || !RECEIPT_PATTERN.test(receipt)) {
    return json(
      {
        error: "INVALID_RECEIPT",
        message: "접수번호 형식을 다시 확인해 주세요.",
      },
      400
    );
  }

  try {
    const notion = new Client({ auth: env.NOTION_TOKEN });
    const dataSourceId = await getDataSourceId(notion, env);

    const q = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: PROP_RECEIPT,
        title: { equals: receipt },
      },
      page_size: 1,
    });

    if (!q.results?.length) {
      return json(
        {
          error: "NOT_FOUND",
          message: "입력하신 접수번호를 찾을 수 없어요.",
        },
        404
      );
    }

    const page = q.results[0];
    const props = page.properties || {};

    const receiptTitle = titleText(props[PROP_RECEIPT]);
    const statusName =
      props[PROP_STATUS]?.status?.name ||
      props[PROP_STATUS]?.select?.name ||
      "접수";
    const trackingNumber =
      richText(props[PROP_TRACK]) ||
      props[PROP_TRACK]?.number?.toString?.() ||
      "";

    return json(
      {
        receipt: receiptTitle,
        status: statusName,
        trackingNumber,
      },
      200
    );
  } catch (err) {
    console.error(err);

    const payload = {
      error: "LOOKUP_FAILED",
      message: "조회 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
    };

    if (debugMode) {
      payload.debug = toDebug(err, env);
    }

    return json(payload, 500);
  }
}
