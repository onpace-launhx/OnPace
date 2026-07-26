import type { Metadata } from "next";
import { Header } from "@/components/marketing/Header";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { Footer } from "@/components/marketing/Footer";
import { OAuthTransparency } from "@/components/marketing/OAuthTransparency";

export const metadata: Metadata = {
  title: "OnPace | AI Study Planner for Students",
  description:
    "OnPace is an AI-powered study planning application for students. Organize tasks and exams, analyze notes, create quizzes and flashcards, run focus sessions, and optionally synchronize study events with Google Calendar.",
  applicationName: "OnPace",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "OnPace",
    title: "OnPace | AI Study Planner for Students",
    description:
      "OnPace helps students organize tasks, plan exams, study with AI tools, stay focused, and optionally synchronize study events with Google Calendar.",
  },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OnPace",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "OnPace is an AI-powered study planning application for students. It provides task and exam planning, study notes, quizzes, flashcards, focus sessions, personalized learning tools, and optional Google Calendar synchronization.",
    featureList: [
      "Study task and exam planning",
      "AI-assisted notes, quizzes, and flashcards",
      "Focus sessions and progress tracking",
      "Optional Google Calendar synchronization",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />
      <main className="flex-1">
        <Hero />
        <OAuthTransparency />
        <Features />
      </main>
      <Footer />
    </>
  );
}
