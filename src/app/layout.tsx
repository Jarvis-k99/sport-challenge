import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sport Challenge",
    template: "%s · Sport Challenge",
  },
  description: "Track our sports challenge — log activities, watch the bucket grow.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#22c55e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-md px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
