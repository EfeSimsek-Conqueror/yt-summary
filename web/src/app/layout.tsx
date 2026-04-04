import type { Metadata } from "next";
import { resolveSiteUrlForMetadata } from "@/lib/app-url-server";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await resolveSiteUrlForMetadata();
  const logoPath = "/vidsum-app-logo.png";
  return {
    metadataBase: new URL(`${siteUrl}/`),
    title: {
      default: "VidSum",
      template: "%s · VidSum",
    },
    description:
      "VidSum — AI summaries, segments, and takeaways for your YouTube subscriptions and search.",
    icons: {
      icon: [{ url: logoPath, type: "image/png", sizes: "870x870" }],
      apple: [{ url: logoPath, type: "image/png", sizes: "180x180" }],
      shortcut: logoPath,
    },
    openGraph: {
      type: "website",
      siteName: "VidSum",
      url: siteUrl,
      images: [
        {
          url: logoPath,
          width: 870,
          height: 870,
          alt: "VidSum",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [logoPath],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        {process.env.NODE_ENV === "development" ? (
          <Script
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
