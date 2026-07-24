"use client";

import { useEffect, useState } from "react";
import { getTranslations } from "@/lib/translations";
import { CheckCircle2, Calendar, BrainCircuit, ShieldAlert, Sparkles, Trophy, BookMarked, MessageSquare } from "lucide-react";

export function Features() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const updateLang = () => {
      setLang(localStorage.getItem("language") || "en");
    };
    updateLang();
    window.addEventListener("language-change", updateLang);
    return () => window.removeEventListener("language-change", updateLang);
  }, []);

  const t = getTranslations(lang);

  const translatedFeatures = [
    {
      name: t.ai?.title || "AI Study Coach Assistant",
      description: t.ai?.subtitle || "Your personal academic mentor. Discuss difficult subjects, clear doubts, get study tips, and break down goals on the fly.",
      icon: Sparkles,
      color: "bg-indigo-50 border-indigo-100 text-indigo-600",
    },
    {
      name: t.notes?.flashcards?.title || "Interactive AI Flashcards",
      description: t.notes?.flashcards?.desc || "Paste notes or textbook pages and watch AI compile comprehensive card decks. Interactive 3D flip card visual review desks.",
      icon: BookMarked,
      color: "bg-purple-50 border-purple-100 text-purple-600",
    },
    {
      name: t.notes?.quiz?.title || "Diagnostic Exam Quizzes",
      description: t.notes?.quiz?.desc || "Evaluate your prep level. AI drafts customized multiple-choice practice items, complete with descriptive answer explanations.",
      icon: Trophy,
      color: "bg-amber-50 border-amber-100 text-amber-600",
    },
    {
      name: t.tasks?.aiSubtasks || "Smart Task Breakdown",
      description: t.tasks?.subtitle || "Overwhelmed by huge assignments? AI splits your master checklists into 3 small, actionable sub-tasks.",
      icon: CheckCircle2,
      color: "bg-emerald-50 border-emerald-100 text-emerald-600",
    },
    {
      name: t.focus?.title || "Pomodoro Focus Cabinets",
      description: t.focus?.subtitle || "Built-in timers and ambient sound controllers (rain, white noise) help you stay in the zone and record actual deep work minutes.",
      icon: BrainCircuit,
      color: "bg-cyan-50 border-cyan-100 text-cyan-600",
    },
    {
      name: t.calendar?.title || "Integrated Study Calendar",
      description: t.calendar?.subtitle || "Map your tasks, exam dates, and courses in a unified visual timeline to prevent last-minute cramming.",
      icon: Calendar,
      color: "bg-red-50 border-red-100 text-red-600",
    }
  ];

  return (
    <section id="features" className="py-24 bg-white sm:py-32 border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand/10 text-brand">
            {t.marketing?.navFeatures || "Features"}
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-surface-dark sm:text-4xl">
            {t.marketing?.featuresTitle || "Study smarter, stay on track."}
          </h2>
          <p className="text-base text-gray-500 font-medium">
            {t.marketing?.featuresSub || "OnPace integrates all your school planning, checklist tasks, note storage, and AI diagnostics into a single dashboard."}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {translatedFeatures.map((feature, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-gray-150 hover:border-brand/30 p-6.5 rounded-3xl hover:shadow-lg transition-all hover:-translate-y-1 group relative flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Icon Wrapper */}
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shadow-sm ${feature.color} shrink-0 group-hover:scale-105 transition-all`}>
                    <feature.icon size={22} />
                  </div>
                  
                  <div>
                    <h3 className="text-base font-bold text-surface-dark group-hover:text-brand transition-colors">
                      {feature.name}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500 font-medium">
                      {feature.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-50 flex items-center text-[10px] font-bold text-brand group-hover:underline">
                  {lang === "zh" ? "了解它是如何工作的" : lang === "es" ? "Aprende cómo funciona" : lang === "tr" ? "Nasıl çalıştığını öğrenin" : "Learn how it works"} &rarr;
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
