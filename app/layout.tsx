import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "메뉴링크 | 다국어 QR 메뉴",
  description: "메뉴판 이미지를 번역해 외국인 고객용 QR 메뉴로 공유하세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
