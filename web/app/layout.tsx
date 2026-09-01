import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZJUT Sample Platform',
  description: 'XAFS 与 XRD 多谱仪样品测试运营平台视觉原型',
  icons: {
    icon: [{ url: '/gk-logo', type: 'image/png' }],
    shortcut: '/gk-logo',
    apple: '/gk-logo',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
