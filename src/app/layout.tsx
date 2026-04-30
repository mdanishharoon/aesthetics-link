import type { Metadata } from "next";
import Script from "next/script";
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
        <Script
          id="google-tag-manager"
          src="https://www.googletagmanager.com/gtag/js?id=G-E84LVBTR3W"
          strategy="afterInteractive"
        />
        <Script
          id="google-tag-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-E84LVBTR3W');
            `,
          }}
        />

        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '997874069258538');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=997874069258538&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

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
