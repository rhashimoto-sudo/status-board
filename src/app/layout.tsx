import type { Metadata } from "next";
import { NetworkBackground } from "@/components/ui/network-background";
import "./globals.css";

export const metadata: Metadata = {
  title: "status-board",
  description: "自分RPG ステータスボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {/* 背景のネットワーク。装飾のみで情報を持たない（aria-hidden / pointer-events-none）。 */}
        <NetworkBackground />
        {children}
      </body>
    </html>
  );
}
