import type { Metadata } from "next";
import { Header } from "@/components/marketing/Header";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "OnPace | AI Study Planner for Students",
  description:
    "OnPace is an AI-powered study planner for students. Organize tasks, plan exam study sessions, turn notes into flashcards and quizzes, and stay focused.",
  applicationName: "OnPace",
};

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </>
  );
}
