import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const iransansX = localFont({
  src: "../fonts/IRANSansX-Bold.ttf",
  variable: "--font-iransansx",
  weight: "700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HMS — Hospital Management System",
  description: "Hospital Management System — مدیریت سیستم بیمارستانی",
  keywords: ["HMS", "Hospital", "Management", "Afghanistan", "بیمارستان"],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'HMS',
    'theme-color': '#10b981',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${iransansX.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
