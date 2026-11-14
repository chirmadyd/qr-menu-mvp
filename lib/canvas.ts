import { maxImageSide, newLine, type Language, type MenuImage, type MenuLine } from "./menu";
import { restoreTextArea } from "./restore-text";

const font = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const paper = "#faf4e9";
const ink = "#312720";
const items = [
  { text: "돌솥 비빔밥", price: "12,000", en: "Stone Pot Bibimbap", ja: "石焼ビビンバ", "zh-CN": "石锅拌饭" },
  { text: "소불고기 덮밥", price: "13,000", en: "Beef Bulgogi Rice Bowl", ja: "牛プルコギ丼", "zh-CN": "韩式烤牛肉盖饭" },
  { text: "바삭한 해물파전", price: "15,000", en: "Crispy Seafood Pancake", ja: "海鮮チヂミ", "zh-CN": "香脆海鲜葱饼" },
  { text: "유자 에이드", price: "6,000", en: "Sparkling Yuzu Ade", ja: "柚子ソーダ", "zh-CN": "柚子气泡饮" },
];

function context(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("이 브라우저에서 이미지를 편집할 수 없습니다.");
  return ctx;
}

export function imageBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("이미지를 저장할 수 없습니다. 더 작은 이미지를 사용해 주세요."));
    }, type, 0.92);
  });
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
    image.src = url;
  });
}

export async function prepareImage(file: File): Promise<MenuImage> {
  const url = URL.createObjectURL(file);
  try {
    const source = await loadImage(url);
    const scale = Math.min(1, maxImageSide / Math.max(source.naturalWidth, source.naturalHeight));
    const width = Math.max(1, Math.round(source.naturalWidth * scale));
    const height = Math.max(1, Math.round(source.naturalHeight * scale));
    if (scale === 1) return { url, name: file.name, width, height };
    const ctx = context(width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, width, height);
    const resized = URL.createObjectURL(await imageBlob(ctx.canvas));
    URL.revokeObjectURL(url);
    return { url: resized, name: file.name, width, height };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function renderMenu(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement,
  lines: MenuLine[],
  language?: Language,
) {
  await document.fonts.ready;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(source, 0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!language) return;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const translatedLines = lines.flatMap((line) => {
    const text = line.translations[language]?.trim();
    return text ? [{ line, text }] : [];
  });
  for (const { line } of translatedLines) {
    if (line.backgroundMode !== "fill") {
      restoreTextArea(ctx, line);
    }
  }
  for (const { line } of translatedLines) {
    if (line.backgroundMode === "fill") {
      ctx.save();
      ctx.globalAlpha = 1 - (line.backgroundTransparency ?? 0) / 100;
      ctx.fillStyle = line.background;
      ctx.fillRect(line.x, line.y, line.width, line.height);
      ctx.restore();
    }
  }
  for (const { line, text } of translatedLines) {
    const padding = Math.min(5, line.width / 5);
    const textWidth = line.width - 2 * padding;
    ctx.font = `600 ${Math.min(line.fontSize, line.height * 0.8)}px ${font}`;
    const measured = ctx.measureText(text).width;
    if (measured > textWidth) {
      const fit = Math.min(line.fontSize, line.height * 0.8) * (textWidth / measured);
      ctx.font = `600 ${Math.max(1, fit)}px ${font}`;
    }
    ctx.fillStyle = line.color;
    ctx.fillText(text, line.x + padding, line.y + line.height / 2, textWidth);
  }
}

export async function exportMenu(source: HTMLImageElement, lines: MenuLine[], language: Language) {
  const ctx = context(source.naturalWidth, source.naturalHeight);
  await renderMenu(ctx, source, lines, language);
  const blob = await imageBlob(ctx.canvas, "image/webp");
  if (blob.type !== "image/webp") throw new Error("WebP 저장이 가능한 브라우저를 사용해 주세요.");
  return blob;
}

export async function sampleMenu() {
  await document.fonts.ready;
  const width = 1000;
  const height = 690;
  const ctx = context(width, height);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#b28560";
  ctx.lineWidth = 2;
  ctx.strokeRect(29, 28, 942, 634);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#915c3b";
  ctx.font = `600 19px ${font}`;
  ctx.fillText("S E O U L    ·    K O R E A", 500, 86);
  ctx.fillStyle = ink;
  ctx.font = '56px Georgia, serif';
  ctx.fillText("TABLE & SEOUL", 500, 150);
  ctx.fillStyle = "#906f56";
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText("Korean Kitchen", 500, 203);
  ctx.strokeStyle = "#c4a88e";
  ctx.beginPath();
  ctx.moveTo(96, 244);
  ctx.lineTo(904, 244);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `600 18px ${font}`;
  ctx.fillText("M E N U", 500, 275);

  const lines = items.map((item, index) => {
    const y = 315 + index * 75;
    ctx.fillStyle = ink;
    ctx.textAlign = "left";
    ctx.font = `600 34px ${font}`;
    ctx.fillText(item.text, 121, y + 22);
    ctx.textAlign = "right";
    ctx.font = '30px Georgia, serif';
    ctx.fillText(item.price, 879, y + 22);
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = "#cdb69f";
    ctx.beginPath();
    ctx.moveTo(121, y + 56);
    ctx.lineTo(879, y + 56);
    ctx.stroke();
    ctx.setLineDash([]);
    return {
      ...newLine(String(index), item.text, { x: 116, y, width: 610, height: 44 }),
      fontSize: 34,
      background: paper,
      color: ink,
      translations: { en: item.en, ja: item.ja, "zh-CN": item["zh-CN"] },
    };
  });
  const url = URL.createObjectURL(await imageBlob(ctx.canvas));
  return { image: { url, name: "table-and-seoul.png", width, height }, lines };
}
