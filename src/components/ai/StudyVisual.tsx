import { ArrowRight, BookOpen, CheckCircle2, Clock, GitCommit, Sparkles } from "lucide-react";
import type { StudyVisualSpec } from "@/lib/study-visual";

const kindIcons = {
  flow: ArrowRight,
  timeline: Clock,
  comparison: GitCommit,
  concept_map: BookOpen,
  checklist: CheckCircle2,
};

export function StudyVisual({ visual }: { visual: StudyVisualSpec }) {
  const Icon = kindIcons[visual.kind];
  const grouped = visual.kind === "comparison"
    ? Array.from(new Set(visual.items.map((item) => item.group || "A")))
    : [];

  return (
    <section className="overflow-hidden rounded-3xl border border-brand/15 bg-gradient-to-br from-white via-brand-light/15 to-indigo-50 shadow-sm">
      <header className="border-b border-brand/10 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand">
          <Icon size={15} /> Study visual
        </div>
        <h3 className="mt-2 text-lg font-extrabold text-surface-dark">{visual.title}</h3>
        {visual.subtitle && <p className="mt-1 text-xs leading-relaxed text-gray-500">{visual.subtitle}</p>}
      </header>

      {visual.kind === "comparison" && grouped.length > 1 ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {grouped.map((group) => (
            <div key={group} className="rounded-2xl border border-white bg-white/85 p-4 shadow-xs">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand">{group}</p>
              <div className="space-y-3">
                {visual.items.filter((item) => (item.group || "A") === group).map((item, index) => (
                  <div key={`${group}-${index}`} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-bold text-surface-dark">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {visual.items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="relative rounded-2xl border border-white bg-white/90 p-4 shadow-xs">
              <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-xl bg-brand text-[11px] font-extrabold text-white">
                {visual.kind === "checklist" ? "✓" : index + 1}
              </span>
              <p className="text-sm font-extrabold text-surface-dark">{item.label}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>
      )}

      {visual.takeaway && (
        <footer className="mx-4 mb-4 flex gap-2 rounded-2xl border border-brand/10 bg-brand/5 px-4 py-3 text-xs font-semibold leading-relaxed text-brand sm:mx-5 sm:mb-5">
          <Sparkles size={15} className="mt-0.5 shrink-0" /> {visual.takeaway}
        </footer>
      )}
    </section>
  );
}
