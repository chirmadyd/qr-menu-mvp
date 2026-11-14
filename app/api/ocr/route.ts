import { detectLines } from "@/lib/google";
import { maxUpload } from "@/lib/menu";

export async function POST(request: Request) {
  const key = process.env.GOOGLE_CLOUD_API_KEY;
  if (!key) return Response.json({ error: "Google API 키가 설정되면 자동 OCR을 사용할 수 있습니다." }, { status: 503 });
  if (Number(request.headers.get("content-length")) > maxUpload + 65536) {
    return Response.json({ error: "이미지 크기는 최대 8MB입니다." }, { status: 413 });
  }
  const data = await request.formData().catch(() => null);
  const file = data?.get("image");
  if (!(file instanceof File) || !["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size || file.size > maxUpload) {
    return Response.json({ error: "8MB 이하의 JPG, PNG, WebP 이미지를 선택해 주세요." }, { status: 400 });
  }
  try {
    return Response.json({ lines: await detectLines(file, key) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "OCR 처리 중 문제가 발생했습니다." }, { status: 502 });
  }
}
