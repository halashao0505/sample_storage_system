import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** 直接读取项目原位置的 Logo，避免复制文件触发加密或改写。 */
export async function GET() {
  const logoPath = path.resolve(process.cwd(), '..', '_image_files', 'gk_logo.png');
  const logo = await readFile(logoPath);
  return new Response(new Uint8Array(logo), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
