import { languages, maxUpload, type Language } from "@/lib/menu";
import { storeMenu } from "@/lib/storage";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 3 * maxUpload + 65536) {
    return Response.json({ error: "결과 이미지 크기가 너무 큽니다." }, { status: 413 });
  }
  const data = await request.formData().catch(() => null);
  const title = data?.get("title");
  if (typeof title !== "string" || !title.trim() || title.length > 80) {
    return Response.json({ error: "메뉴판 이름을 80자 이내로 입력해 주세요." }, { status: 400 });
  }
  const files = new Map<Language, Buffer>();
  for (const { code } of languages) {
    const file = data?.get(code);
    if (file === null || file === undefined) continue;
    if (!(file instanceof File) || file.type !== "image/webp" || file.size < 12 || file.size > maxUpload) {
      return Response.json({ error: "8MB 이하의 WebP 이미지가 필요합니다." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
      return Response.json({ error: "WebP 이미지 형식이 올바르지 않습니다." }, { status: 400 });
    }
    files.set(code, buffer);
  }
  if (!files.size) return Response.json({ error: "공개할 언어를 선택해 주세요." }, { status: 400 });
  let origin = new URL(request.url).origin;
  if (process.env.PUBLIC_MENU_ORIGIN) {
    try {
      const configured = new URL(process.env.PUBLIC_MENU_ORIGIN);
      if (!["http:", "https:"].includes(configured.protocol)) throw new Error("Invalid origin");
      origin = configured.origin;
    } catch {
      return Response.json({ error: "PUBLIC_MENU_ORIGIN 설정을 확인해 주세요." }, { status: 500 });
    }
  }
  try {
    const id = await storeMenu({ title: title.trim(), languages: [...files.keys()] }, files);
    return Response.json({ url: new URL(`/m/${id}`, origin).href }, { status: 201 });
  } catch {
    return Response.json({ error: "메뉴판을 저장하지 못했습니다." }, { status: 500 });
  }
}
