import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIAD TODO",
  description: "TODO app scaffold built with Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
