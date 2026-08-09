import { Sparkles } from "lucide-react";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";

type AIResponseCardProps = {
  content: string;
  label: string;
  compact?: boolean;
};

export function AIResponseCard({ content, label, compact = false }: AIResponseCardProps) {
  return (
    <article
      className={`overflow-hidden border border-brand/15 bg-gradient-to-br from-white via-white to-brand/[0.035] shadow-[0_8px_28px_rgba(79,70,229,0.06)] ${
        compact ? "rounded-2xl rounded-bl-md" : "rounded-3xl rounded-tl-md"
      }`}
    >
      <div className={`flex items-center gap-2 border-b border-brand/10 bg-brand/[0.035] ${compact ? "px-3 py-2" : "px-5 py-3"}`}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Sparkles size={compact ? 12 : 13} />
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand/80">
          {label}
        </span>
      </div>
      <MarkdownRenderer
        content={content}
        className={`${compact ? "px-3 py-3 text-xs leading-5" : "px-5 py-5 text-sm leading-7 sm:px-6 sm:py-6"} text-surface-dark [&_h1]:!text-lg [&_h2]:!text-base [&_h3]:!text-sm [&_li]:pl-0.5 [&_ol]:space-y-2 [&_ul]:space-y-2`}
      />
    </article>
  );
}
