import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qack.dev",
  description: "Temporary email for CI/CD pipelines",
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
