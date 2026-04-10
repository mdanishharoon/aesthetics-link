import type { Metadata } from "next";
import LenisProvider from "@/components/LenisProvider";
import QueryProvider from "@/components/QueryProvider";
import StorefrontNavigationProvider from "@/components/StorefrontNavigationProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { getStorefrontNavigation } from "@/lib/storefront/server";
import './globals.css';

export const metadata: Metadata = {
  title: "AestheticsLink - Aesthetic by Design, Linked to Results",
  description:
    "Precision-engineered aesthetic skincare formulas backed by science and designed without compromise.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navigation = await getStorefrontNavigation();

  return (
    <html lang="en">
      <body>
        <StorefrontNavigationProvider navigation={navigation}>
          <QueryProvider>
            <AuthProvider>
              <LenisProvider />
              {children}
            </AuthProvider>
          </QueryProvider>
        </StorefrontNavigationProvider>
      </body>
    </html>
  );
}
