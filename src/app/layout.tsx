import type { Metadata } from "next";
import LenisProvider from "@/components/LenisProvider";
import './globals.css';

export const metadata: Metadata = {
  title: "TrueKind - True to Oneself, Kind to Nature",
  description:
    "Unreservedly honest products that truly work, be kind to skin and the planet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LenisProvider />
        {children}
      </body>
    </html>
  );
}
