import { isLanguage } from "@/lib/menu";
import { getMenu, readMenuImage } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; language: string }> }) {
  const { id, language } = await params;
  const menu = await getMenu(id);
  if (!isLanguage(language) || !menu?.languages.includes(language)) return new Response(null, { status: 404 });
  const image = await readMenuImage(id, language);
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(image.length),
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
