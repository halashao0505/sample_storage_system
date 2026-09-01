import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

/**
 * 从原始图片位置读取 Logo，不复制、不移动原文件。
 * 兼容开发服务器和生产服务器不同的工作目录。
 */
export async function GET() {
  const candidates = [
    path.resolve(process.cwd(), '..', '_image_files', 'gk_logo.png'),
    path.resolve(process.cwd(), '_image_files', 'gk_logo.png'),
    path.resolve(process.cwd(), '..', '..', '_image_files', 'gk_logo.png'),
  ];

  for (const logoPath of candidates) {
    try {
      const logo = await readFile(logoPath);
      return new Response(logo, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      // 继续尝试下一个由不同运行目录推导出的原始路径。
    }
  }

  return new Response('Logo not found', { status: 404 });
}
