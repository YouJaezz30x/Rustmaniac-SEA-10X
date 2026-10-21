import type { Metadata } from "next";
import { Barlow, Oswald } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.server} — Store & Plugins`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.tagline,
  openGraph: {
    title: BRAND.server,
    description: BRAND.tagline,
    images: [BRAND.bannerWide],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${oswald.variable} ${barlow.variable} antialiased`}>
        <Providers>
          <div className="shell">
            <SiteHeader />
            <main className="shell__main">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
