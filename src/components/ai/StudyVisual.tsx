import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GitCompareArrows,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type { StudyVisualItem, StudyVisualSpec } from "@/lib/study-visual";

const kindIcons = {
  flow: ArrowRight,
  timeline: Clock,
  comparison: GitCompareArrows,
  concept_map: BookOpen,
  checklist: CheckCircle2,
};

function VisualCard({ item, index }: { item: StudyVisualItem; index: number }) {
  return (
    <article className="relative min-w-0 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
      <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-xl bg-brand text-[11px] font-extrabold text-white shadow-sm shadow-brand/20">
        {index + 1}
      </span>
      <p className="break-words text-sm font-extrabold text-surface-dark">{item.label}</p>
      <p className="mt-1.5 break-words text-xs leading-relaxed text-gray-500">{item.detail}</p>
    </article>
  );
}

function FlowVisual({ items }: { items: StudyVisualItem[] }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="contents">
            <VisualCard item={item} index={index} />
            {index < items.length - 1 && (
              <div className={`${index > 1 ? "lg:hidden" : ""} flex items-center justify-center text-brand/60`} aria-hidden="true">
                <ArrowDown className="lg:hidden" size={18} />
                <ArrowRight className="hidden lg:block" size={18} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineVisual({ items }: { items: StudyVisualItem[] }) {
  return (
    <ol className="relative space-y-3 p-4 before:absolute before:bottom-8 before:left-[2.05rem] before:top-8 before:w-px before:bg-gradient-to-b before:from-brand before:to-indigo-200 sm:p-5 sm:before:left-[2.3rem]">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="relative grid grid-cols-[2.4rem_1fr] gap-3 sm:grid-cols-[2.7rem_1fr]">
          <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-indigo-50 bg-brand text-[10px] font-extrabold text-white">
            {index + 1}
          </span>
          <div className="min-w-0 rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
            <p className="break-words text-sm font-extrabold text-surface-dark">{item.label}</p>
            <p className="mt-1 break-words text-xs leading-relaxed text-gray-500">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ConceptMapVisual({ title, items }: { title: string; items: StudyVisualItem[] }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="mx-auto mb-5 flex max-w-sm items-center justify-center rounded-2xl bg-gradient-to-r from-brand to-indigo-500 px-5 py-4 text-center text-sm font-extrabold text-white shadow-lg shadow-brand/15">
        {title}
      </div>
      <div className="relative grid gap-3 sm:grid-cols-2">
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-brand/15 sm:block" aria-hidden="true" />
        {items.map((item, index) => (
          <article key={`${item.label}-${index}`} className="relative min-w-0 rounded-2xl border border-brand/10 bg-white/90 p-4 shadow-sm">
            <span className="mb-2 inline-flex rounded-full bg-brand/10 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-brand">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="break-words text-sm font-extrabold text-surface-dark">{item.label}</p>
            <p className="mt-1 break-words text-xs leading-relaxed text-gray-500">{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ComparisonVisual({ items }: { items: StudyVisualItem[] }) {
  const groups = Array.from(new Set(items.map((item) => item.group || "A"))).slice(0, 2);
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr] sm:p-5">
      {groups.map((group, groupIndex) => (
        <div key={group} className="contents">
          <section className="min-w-0 rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
            <p className="mb-3 break-words text-xs font-extrabold uppercase tracking-wide text-brand">{group}</p>
            <div className="space-y-2">
              {items.filter((item) => (item.group || "A") === group).map((item, index) => (
                <div key={`${group}-${index}`} className="rounded-xl bg-slate-50 p-3">
                  <p className="break-words text-xs font-bold text-surface-dark">{item.label}</p>
                  <p className="mt-1 break-words text-[11px] leading-relaxed text-gray-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
          {groupIndex === 0 && groups.length > 1 && (
            <div className="flex items-center justify-center text-brand/70" aria-hidden="true">
              <GitCompareArrows size={20} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChecklistVisual({ items }: { items: StudyVisualItem[] }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
      {items.map((item, index) => (
        <article key={`${item.label}-${index}`} className="flex min-w-0 gap-3 rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={20} />
          <div className="min-w-0">
            <p className="break-words text-sm font-extrabold text-surface-dark">{item.label}</p>
            <p className="mt-1 break-words text-xs leading-relaxed text-gray-500">{item.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function StudyVisual({ visual }: { visual: StudyVisualSpec }) {
  const Icon = kindIcons[visual.kind];

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-brand/15 bg-gradient-to-br from-white via-brand-light/15 to-indigo-50 shadow-sm">
      <header className="border-b border-brand/10 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand">
          <Icon size={15} /> Structured study visual
        </div>
        <h3 className="mt-2 break-words text-lg font-extrabold text-surface-dark">{visual.title}</h3>
        {visual.subtitle && <p className="mt-1 break-words text-xs leading-relaxed text-gray-500">{visual.subtitle}</p>}
      </header>

      {visual.kind === "flow" && <FlowVisual items={visual.items} />}
      {visual.kind === "timeline" && <TimelineVisual items={visual.items} />}
      {visual.kind === "comparison" && <ComparisonVisual items={visual.items} />}
      {visual.kind === "concept_map" && <ConceptMapVisual title={visual.title} items={visual.items} />}
      {visual.kind === "checklist" && <ChecklistVisual items={visual.items} />}

      {visual.takeaway && (
        <footer className="mx-4 mb-4 flex min-w-0 gap-2 rounded-2xl border border-brand/10 bg-brand/5 px-4 py-3 text-xs font-semibold leading-relaxed text-brand sm:mx-5 sm:mb-5">
          <Lightbulb size={15} className="mt-0.5 shrink-0" />
          <span className="break-words">{visual.takeaway}</span>
          <Sparkles size={13} className="ml-auto mt-0.5 shrink-0 opacity-60" />
        </footer>
      )}
    </section>
  );
}
