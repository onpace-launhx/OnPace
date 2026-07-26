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
  title: {
    default: "OnPace | AI Study Planner for Students",
    template: "%s | OnPace",
  },
  description:
    "OnPace is an AI-powered study planning application for students with task, exam, notes, focus, personalized learning, and optional Google Calendar synchronization tools.",
  applicationName: "OnPace",
  creator: "OnPace",
  publisher: "OnPace",
  category: "Education",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
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
