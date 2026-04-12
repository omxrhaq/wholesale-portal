import type { Metadata } from "next";

import { getUserLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wholesale Portal",
  description: "B2B wholesale ordering portal for small and mid-sized wholesalers.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUserLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
