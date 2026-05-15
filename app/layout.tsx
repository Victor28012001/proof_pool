import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  icons: {
    icon: '/logo.jpg',
  },
  title: "BountyProtocol — Trust-minimized competitions",
  description:
    "Decentralized bounty and competition protocol. Funds lock in escrow. Teams compete. Judges evaluate. Peer review validates. Payouts are automated.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}