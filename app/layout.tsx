import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Subscriptions",
  description:
    "Track your monthly subscriptions.",
  applicationName: "Subscriptions",

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Subscriptions",
  },

  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#090A0B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}