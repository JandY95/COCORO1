import { Client } from "@notionhq/client";
import {
  createLimiterStore,
  denyIfCrossOrigin,
  getClientIp,
  isRateLimited,
  isValidKoreanPhone,
  json,
  normalizeText,
  readJsonBody,
} from "../_lib/security.js";

const submitLimiter = createLimiterStore();

function getKoreanDateTimeParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const yy = parts.find((p) => p.type === "year")?.value || "00";
  const mm = parts.find((p) => p.type === "month")?.value || "00";
  const dd = parts.find((p) => p.type === "day")?.value || "00";
  const hh = parts.find((p) => p.type === "hour")?.value || "00";
  const mi = parts.find((p) => p.type === "minute")?.value || "00";
  const ss = parts.find((p) => p.type === "second")?.value || "00";

  return { yy, mm, dd, hh, mi, ss };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const crossOrigin = denyIfCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (isRateLimited(submitLimiter, `submit:${ip}`, 12, 10 * 60 * 1000)) {
    return json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429);
  }

  try {
    const body = await readJsonBody(request);
    const notion = new Client({ auth: env.NOTION_TOKEN });

    const customerName = normalizeText(body.customerName, 40);
    const phone = normalizeText(body.phone, 20);
    const postcode = normalizeText(body.postcode, 10);
    const baseAddress = normalizeText(body.baseAddress, 140);
    const detailAddress = normalizeText(body.detailAddress, 140);
    const requestText = normalizeText(body.request, 300);
    const website = normalizeText(body.website, 120);

    if (website) {
      return json({ error: "Invalid request" }, 400);
    }

    if (!customerName || !phone || !postcode || !baseAddress || !detailAddress) {
      return json({ error: "입력되지 않은 필수 항목이 있어요." }, 400);
    }

    if (customerName.length < 2) {
      return json({ error: "성함을 다시 확인해 주세요." }, 400);
    }

    if (!isValidKoreanPhone(phone)) {
      return json({ error: "연락처 형식을 다시 확인해 주세요." }, 400);
    }

    if (!/^\d{5}$/.test(postcode)) {
      return json({ error: "우편번호를 다시 확인해 주세요." }, 400);
    }

    const { yy, mm, dd, hh, mi, ss } = getKoreanDateTimeParts();
    const cleanName = customerName.replace(/\s+/g, "");
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneLast4 = phoneDigits.slice(-4).padStart(4, "0");
    const receiptTitle = `${yy}${mm}${dd}-${hh}${mi}${ss}-${cleanName}-${phoneLast4}`;

    await notion.pages.create({
      parent: { database_id: env.NOTION_DATABASE_ID },
      properties: {
        접수번호: { title: [{ text: { content: receiptTitle } }] },
        고객명: { rich_text: [{ text: { content: customerName } }] },
        연락처: { rich_text: [{ text: { content: phone } }] },
        우편번호: { rich_text: [{ text: { content: postcode } }] },
        기본주소: { rich_text: [{ text: { content: baseAddress } }] },
        상세주소: { rich_text: [{ text: { content: detailAddress } }] },
        요청사항: { rich_text: [{ text: { content: requestText || "" } }] },
        처리상태: { status: { name: "접수" } },
      },
    });

    return json({ success: true, receiptTitle }, 200);
  } catch (e) {
    console.error("Notion save error:", e);
    return json({ error: "접수 저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요." }, 500);
  }
}
