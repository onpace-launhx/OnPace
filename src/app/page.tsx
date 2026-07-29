import type { Metadata } from "next";
import { MarketingLandingPage } from "@/components/marketing/MarketingLandingPage";

export const metadata: Metadata = {
  title: "OnPace | Plan Smarter. Study With Focus.",
  description:
    "Turn assignments, exams, notes, and open time into a realistic study plan with OnPace—your AI planning, focus, and learning workspace.",
  applicationName: "OnPace",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "OnPace",
    title: "OnPace | Plan Smarter. Study With Focus.",
    description:
      "Turn assignments, exams, notes, and open time into a realistic study plan with OnPace.",
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
      <MarketingLandingPage />
    </>
  );
}
