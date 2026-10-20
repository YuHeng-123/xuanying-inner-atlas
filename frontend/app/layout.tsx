import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "玄境 | 命盘、人际关系与问卦",
  description: "在未来命理观测站阅读八字、紫微与十二星次，探索人际关系，体验签筒抽签、掷筊、六爻起卦与日常选择。",
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="app-light">{children}</body>
    </html>
  );
}
