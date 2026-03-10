import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insurance RAG — Superadmin",
  description: "Platform administration for the Insurance RAG system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
