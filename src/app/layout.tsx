import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ProofWrite — 생각이 글이 되는 과정",
  description: "글을 읽는 교사와 생각을 펼치는 학생을 위한 작성과정 기록 도구.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
