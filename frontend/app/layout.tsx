import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar, Footer } from "@/components/layout";
import QueryProvider from "@/components/providers/QueryProvider";
import UserInitializer from "@/components/providers/UserInitializer";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Seedling - Startup Competition Platform",
  description: "Compete, showcase your startup, and win prizes on Seedling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} antialiased flex flex-col min-h-screen`}
      >
        <QueryProvider>
          <UserInitializer>
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </UserInitializer>
        </QueryProvider>
      </body>
    </html>
  );
}
