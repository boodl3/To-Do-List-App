import { SectionImageSchema, type SectionImage } from '../../domain/schema';

/** Pictures that can be added. Not SVG: it can carry script. */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Longest side kept. Bigger pictures are scaled down for file size and idle memory. */
const MAX_SIDE = 1600;

/**
 * Decodes the file and re-encodes it through a canvas, so only pixels are stored (no metadata;
 * an animated GIF keeps its first frame). Null when it isn't a picture the board can keep.
 */
export async function readImage(file: Blob): Promise<SectionImage | null> {
  if (!IMAGE_TYPES.includes(file.type)) return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  if (!ctx) return null;
  // WebKit can't encode WebP and falls back to PNG, which the schema also accepts.
  const parsed = SectionImageSchema.safeParse({
    src: canvas.toDataURL('image/webp', 0.85),
    width,
    height,
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Light or dark, from RGBA pixels: their alpha-weighted average luminance (Rec. 709).
 * Null when they are (nearly) transparent, so the card behind decides.
 */
export function tone(pixels: Uint8ClampedArray): 'light' | 'dark' | null {
  let sum = 0;
  let weight = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]! / 255;
    sum += a * (0.2126 * pixels[i]! + 0.7152 * pixels[i + 1]! + 0.0722 * pixels[i + 2]!);
    weight += a;
  }
  if (weight < pixels.length / 4 / 10) return null;
  return sum / weight / 255 < 0.5 ? 'dark' : 'light';
}

/** Tone of the picture's top-right corner, under the options button (sampled at 8×8). */
export function cornerTone(img: HTMLImageElement): 'light' | 'dark' | null {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx || !img.naturalWidth) return null;
  const w = img.naturalWidth * 0.2;
  const h = img.naturalHeight * 0.2;
  ctx.drawImage(img, img.naturalWidth - w, 0, w, h, 0, 0, 8, 8);
  return tone(ctx.getImageData(0, 0, 8, 8).data);
}
