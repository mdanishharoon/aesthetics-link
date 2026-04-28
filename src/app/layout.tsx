import type { Metadata } from "next";
import LenisProvider from "@/components/LenisProvider";
import QueryProvider from "@/components/QueryProvider";
import StorefrontNavigationProvider from "@/components/StorefrontNavigationProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { getStorefrontNavigation } from "@/lib/storefront/server";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, toAbsoluteUrl } from "@/lib/site";
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(toAbsoluteUrl("/")),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: toAbsoluteUrl("/"),
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: toAbsoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [toAbsoluteUrl("/twitter-image")],
  },
  manifest: "/manifest.webmanifest",
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
        <a href="#main" className="skip-to-content">Skip to main content</a>
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
