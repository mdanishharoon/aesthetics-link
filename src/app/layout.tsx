import type { Metadata } from "next";
import LenisProvider from "@/components/LenisProvider";
import './globals.css';

export const metadata: Metadata = {
  title: "AestheticsLink - Aesthetic by Design, Linked to Results",
  description:
    "Precision-engineered aesthetic skincare formulas backed by science and designed without compromise.",
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
