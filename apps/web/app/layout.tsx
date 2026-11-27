import type { Metadata } from "next";

import { MeProvider } from "@/components/MeProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import "./globals.css";

export const metadata: Metadata = {
  title: "めぐる市｜見つけて、競って、次の人へ",
  description: "個人同士で、安心して入札できるオークション。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // globals.css の scroll-behavior: smooth を Next.js に伝える（ページ移動時は通常のスクロールにする）
    <html lang="ja" data-scroll-behavior="smooth">
      <head>
        {/* 静的デモと同じフォント（Google Fonts）。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <MeProvider>
          <div className="announcement">
            毎日に、ちょうどいい出会いを。 <span>はじめての方も安心してご利用いただけます</span>
          </div>
          <SiteHeader />
          {children}
          <SiteFooter />
        </MeProvider>
      </body>
    </html>
  );
}
