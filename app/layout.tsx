import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Travel Itinerary Manager",
  description: "A local-first, map-centric travel planner",
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
