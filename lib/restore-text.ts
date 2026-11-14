import type { MenuLine } from "./menu";

const sampleDepth = 3;

function middle(first: number, second: number, third: number) {
  return first + second + third - Math.min(first, second, third) - Math.max(first, second, third);
}

export function restoreTextPixels(
  image: ImageData,
  start: number,
  end: number,
  direction: "vertical" | "horizontal",
) {
  const { data, width, height } = image;
  const vertical = direction === "vertical";
  const length = vertical ? height : width;
  const columns = vertical ? width : height;
  const offset = (column: number, row: number) => (vertical ? row * width + column : column * width + row) * 4;
  const firstSample = Math.max(0, start - sampleDepth);
  const lastSample = Math.min(length - 1, end + sampleDepth - 1);
  const before = firstSample < start;
  const after = lastSample >= end;
  if (!before && !after) return false;

  const topMiddle = before ? Math.min(firstSample + 1, start - 1) : firstSample;
  const topEnd = before ? Math.min(firstSample + 2, start - 1) : firstSample;
  const bottomMiddle = after ? Math.max(lastSample - 1, end) : lastSample;
  const bottomEnd = after ? Math.max(lastSample - 2, end) : lastSample;
  const fractionAt = (row: number) => before && after ? (row - topMiddle) / (bottomMiddle - topMiddle) : 0;
  const edges = new Float32Array(columns * 8);
  const mask = new Uint8Array((end - start) * columns);
  for (let column = 0; column < columns; column++) {
    const first = offset(column, firstSample);
    const last = offset(column, lastSample);
    const firstMiddle = offset(column, topMiddle);
    const firstEnd = offset(column, topEnd);
    const lastMiddle = offset(column, bottomMiddle);
    const lastEnd = offset(column, bottomEnd);
    const upper = column * 8;
    const lower = upper + 4;
    let variation = 0;
    for (let channel = 0; channel < 4; channel++) {
      const topA = data[first + channel];
      const topB = data[firstMiddle + channel];
      const topC = data[firstEnd + channel];
      const bottomA = data[last + channel];
      const bottomB = data[lastMiddle + channel];
      const bottomC = data[lastEnd + channel];
      const top = middle(topA, topB, topC);
      const bottom = middle(bottomA, bottomB, bottomC);
      edges[upper + channel] = before ? top : bottom;
      edges[lower + channel] = after ? bottom : top;
      const topRange = before ? Math.max(topA, topB, topC) - Math.min(topA, topB, topC) : 0;
      const bottomRange = after ? Math.max(bottomA, bottomB, bottomC) - Math.min(bottomA, bottomB, bottomC) : 0;
      variation = Math.max(variation, topRange, bottomRange);
    }

    const threshold = Math.max(9, variation * 2);
    for (let row = start; row < end; row++) {
      const index = offset(column, row);
      const fraction = fractionAt(row);
      const alpha = edges[upper + 3] + (edges[lower + 3] - edges[upper + 3]) * fraction;
      let difference = Math.abs(data[index + 3] - alpha);
      for (let channel = 0; channel < 3; channel++) {
        const expected = edges[upper + channel] + (edges[lower + channel] - edges[upper + channel]) * fraction;
        difference = Math.max(difference, Math.abs(data[index + channel] * data[index + 3] - expected * alpha) / 255);
      }
      mask[(row - start) * columns + column] = difference >= threshold ? 2 : Number(difference >= 3);
    }
  }

  let restored = false;
  for (let row = start; row < end; row++) {
    for (let column = 0; column < columns; column++) {
      const index = (row - start) * columns + column;
      const touchesText = (column > 0 && mask[index - 1] === 2) ||
        (column + 1 < columns && mask[index + 1] === 2) ||
        mask[index - columns] === 2 || mask[index + columns] === 2;
      if (mask[index] !== 2 && !(mask[index] === 1 && touchesText)) continue;

      const pixel = offset(column, row);
      const edge = column * 8;
      const fraction = fractionAt(row);
      for (let channel = 0; channel < 4; channel++) {
        data[pixel + channel] = edges[edge + channel] + (edges[edge + 4 + channel] - edges[edge + channel]) * fraction;
      }
      restored = true;
    }
  }
  return restored;
}

export function restoreTextArea(ctx: CanvasRenderingContext2D, line: MenuLine) {
  const { width, height } = ctx.canvas;
  const left = Math.max(0, Math.floor(line.x));
  const top = Math.max(0, Math.floor(line.y));
  const right = Math.min(width, Math.ceil(line.x + line.width));
  const bottom = Math.min(height, Math.ceil(line.y + line.height));
  if (right <= left || bottom <= top) return;

  if (top > 0 || bottom < height) {
    const from = Math.max(0, top - sampleDepth);
    const to = Math.min(height, bottom + sampleDepth);
    const tile = ctx.getImageData(left, from, right - left, to - from);
    if (restoreTextPixels(tile, top - from, bottom - from, "vertical")) ctx.putImageData(tile, left, from);
  } else if (left > 0 || right < width) {
    const from = Math.max(0, left - sampleDepth);
    const to = Math.min(width, right + sampleDepth);
    const tile = ctx.getImageData(from, top, to - from, bottom - top);
    if (restoreTextPixels(tile, left - from, right - from, "horizontal")) ctx.putImageData(tile, from, top);
  }
}
