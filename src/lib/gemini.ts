import { GoogleGenerativeAI } from '@google/generative-ai';

import { env } from '@/lib/env';

let queue = Promise.resolve();
let lastRequestStartedAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('429') || /quota exceeded/i.test(message) || /too many requests/i.test(message);
}

function parseRetryDelayMs(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const retrySeconds = message.match(/retry in\s+(\d+)s/i)?.[1];
  if (retrySeconds) return Number(retrySeconds) * 1000 + 750;
  const retryDelay = message.match(/retryDelay["':\s]+(\d+)s/i)?.[1];
  if (retryDelay) return Number(retryDelay) * 1000 + 750;
  return env.geminiMinRequestIntervalMs;
}

async function runWithGeminiRateLimit<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => {
    const elapsed = Date.now() - lastRequestStartedAt;
    if (elapsed < env.geminiMinRequestIntervalMs) {
      await sleep(env.geminiMinRequestIntervalMs - elapsed);
    }

    let attempt = 0;
    while (true) {
      try {
        lastRequestStartedAt = Date.now();
        return await task();
      } catch (error) {
        if (!isRetryableGeminiError(error) || attempt >= env.geminiMaxRetries) throw error;
        attempt += 1;
        await sleep(parseRetryDelayMs(error));
      }
    }
  };

  const result = queue.then(run, run);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

export type ExtractedPropertyPayload = {
  name: string;
  business_item_registrant_name: string | null;
  business_item_editor_name: string | null;
  asset_type: string | null;
  address: string;
  price_amount_yen: number | null;
  price_raw_text: string | null;
  land_area_sqm: number | null;
  floor_area_sqm: number | null;
  zoning: string | null;
  coverage_ratio_raw: string | null;
  road_access: string | null;
  transaction_type: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  visibility: 'internal' | 'external';
};

export async function analyzePropertyPdf(file: File): Promise<ExtractedPropertyPayload> {
  if (!env.geminiApiKey) {
    return buildFallbackPayload(file.name);
  }

  const bytes = Buffer.from(await file.arrayBuffer()).toString('base64');
  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: env.geminiModel });

  return runWithGeminiRateLimit(async () => {
    const result = await model.generateContent([
      {
        text: `不動産の物件概要PDFから仕入マップ登録用JSONを抽出してください。\n` +
          `必ずJSONのみを返してください。キーは name, business_item_registrant_name, business_item_editor_name, asset_type, address, price_amount_yen, price_raw_text, land_area_sqm, floor_area_sqm, zoning, coverage_ratio_raw, road_access, transaction_type, latitude, longitude, notes, visibility です。\n` +
          `価格が0または相談の場合は price_amount_yen を null にし、元表記を price_raw_text に入れてください。visibility は通常 internal にしてください。`
      },
      {
        inlineData: {
          mimeType: file.type || 'application/pdf',
          data: bytes
        }
      }
    ]);

    const text = result.response.text().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return normalizeExtractedPayload(JSON.parse(text));
  });
}

function buildFallbackPayload(filename: string): ExtractedPropertyPayload {
  return {
    name: filename.replace(/\.pdf$/i, ''),
    business_item_registrant_name: null,
    business_item_editor_name: null,
    asset_type: '戸建/ビル',
    address: '',
    price_amount_yen: null,
    price_raw_text: '未解析',
    land_area_sqm: null,
    floor_area_sqm: null,
    zoning: null,
    coverage_ratio_raw: null,
    road_access: null,
    transaction_type: null,
    latitude: null,
    longitude: null,
    notes: 'GEMINI_API_KEY 未設定のため、ファイル名のみを仮登録しています。',
    visibility: 'internal'
  };
}

function normalizeExtractedPayload(payload: Partial<ExtractedPropertyPayload>): ExtractedPropertyPayload {
  return {
    name: payload.name || '名称未設定',
    business_item_registrant_name: payload.business_item_registrant_name ?? null,
    business_item_editor_name: payload.business_item_editor_name ?? null,
    asset_type: payload.asset_type ?? null,
    address: payload.address || '',
    price_amount_yen: payload.price_amount_yen && payload.price_amount_yen > 0 ? payload.price_amount_yen : null,
    price_raw_text: payload.price_raw_text ?? null,
    land_area_sqm: payload.land_area_sqm ?? null,
    floor_area_sqm: payload.floor_area_sqm ?? null,
    zoning: payload.zoning ?? null,
    coverage_ratio_raw: payload.coverage_ratio_raw ?? null,
    road_access: payload.road_access ?? null,
    transaction_type: payload.transaction_type ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    notes: payload.notes ?? null,
    visibility: payload.visibility === 'external' ? 'external' : 'internal'
  };
}
