import { googleRequest } from "@/lib/google";
import { isLanguage } from "@/lib/menu";

type TranslationResult = { data?: { translations?: { translatedText?: string }[] } };

export async function POST(request: Request) {
  const key = process.env.GOOGLE_CLOUD_API_KEY;
  if (!key) return Response.json({ error: "Google API 키가 설정되면 자동 번역을 사용할 수 있습니다." }, { status: 503 });
  const data = await request.json().catch(() => null);
  const { texts, targets } = data ?? {};
  if (!Array.isArray(texts) || !texts.length || texts.length > 100 ||
      !texts.every((text) => typeof text === "string" && text.trim() && text.length <= 500) ||
      !Array.isArray(targets) || !targets.length || targets.length > 3 || !targets.every(isLanguage)) {
    return Response.json({ error: "번역할 메뉴명이나 언어를 확인해 주세요." }, { status: 400 });
  }
  try {
    const translated = await Promise.all([...new Set(targets)].map(async (target) => {
      const result = await googleRequest<TranslationResult>("https://translation.googleapis.com/language/translate/v2", key, {
        q: texts, target, format: "text",
      });
      const entries = result.data?.translations;
      if (entries?.length !== texts.length || entries.some((entry) => !entry.translatedText)) {
        throw new Error("일부 메뉴명 번역을 받지 못했습니다.");
      }
      return [target, entries.map((entry) => entry.translatedText)];
    }));
    return Response.json({ translations: Object.fromEntries(translated) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "번역 중 문제가 발생했습니다." }, { status: 502 });
  }
}
