import { newLine, type MenuLine } from "./menu";

type Vertex = { x?: number; y?: number };
type Word = {
  boundingBox?: { vertices?: Vertex[] };
  symbols?: { text?: string; property?: { detectedBreak?: { type?: string } } }[];
};
type VisionResponse = {
  responses?: {
    error?: { message?: string };
    fullTextAnnotation?: {
      pages?: { blocks?: { paragraphs?: { words?: Word[] }[] }[] }[];
    };
  }[];
};

export async function googleRequest<T>(url: string, key: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Google API 요청이 실패했습니다 (${response.status}). API 사용 설정과 키 권한을 확인해 주세요.`);
  }
  return response.json() as Promise<T>;
}

export async function detectLines(file: File, key: string) {
  const content = Buffer.from(await file.arrayBuffer()).toString("base64");
  const result = await googleRequest<VisionResponse>(
    "https://vision.googleapis.com/v1/images:annotate",
    key,
    { requests: [{ image: { content }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] }] },
  );
  const annotation = result.responses?.[0];
  if (annotation?.error) throw new Error("Google OCR이 이 이미지를 읽지 못했습니다.");

  const output: MenuLine[] = [];
  for (const page of annotation?.fullTextAnnotation?.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        let row: Word[] = [];
        for (const word of paragraph.words ?? []) {
          row.push(word);
          const breakType = word.symbols?.at(-1)?.property?.detectedBreak?.type;
          if (breakType === "LINE_BREAK" || breakType === "EOL_SURE_SPACE") {
            appendRow(output, row);
            row = [];
          }
        }
        appendRow(output, row);
      }
    }
  }
  return output.slice(0, 100);
}

function appendRow(output: MenuLine[], row: Word[]) {
  const words = row.map((word) => ({
    text: word.symbols?.map((symbol) => symbol.text ?? "").join("") ?? "",
    vertices: word.boundingBox?.vertices ?? [],
  }));
  while (words.length && /^(?:[₩￦]|[\d,]+(?:[.\d]+)?원?|원)$/.test(words.at(-1)!.text)) words.pop();
  const text = words.map((word) => word.text).join(" ").trim();
  const vertices = words.flatMap((word) => word.vertices);
  if (!text || !vertices.length) return;
  const xs = vertices.map(({ x }) => x ?? 0);
  const ys = vertices.map(({ y }) => y ?? 0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  if (width > 0 && height > 0) output.push(newLine(String(output.length), text, { x, y, width, height }));
}
