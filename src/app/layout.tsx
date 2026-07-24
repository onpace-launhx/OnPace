import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeInjector } from "@/components/dashboard/ThemeInjector";
import { FloatingAICoach } from "@/components/dashboard/FloatingAICoach";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OnPace | Smart Study Productivity",
  description: "A premium productivity platform for students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeInjector />
        {children}
        <FloatingAICoach />
      </body>
    </html>
  );
}
