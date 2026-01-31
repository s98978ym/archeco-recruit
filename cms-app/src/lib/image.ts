import sharp from 'sharp';

interface OptimizeOptions {
  width: number;
  height: number;
  quality?: number;
}

export async function optimizeImage(
  input: Buffer,
  options: OptimizeOptions
): Promise<Buffer> {
  const { width, height, quality = 80 } = options;

  return sharp(input)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .webp({ quality })
    .toBuffer();
}

export async function optimizeEyecatch(input: Buffer): Promise<Buffer> {
  return optimizeImage(input, { width: 1200, height: 630, quality: 85 });
}

export async function optimizeInsertImage(input: Buffer): Promise<Buffer> {
  return optimizeImage(input, { width: 800, height: 600, quality: 80 });
}

export async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
