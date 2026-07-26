import Link from "next/link";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import type {
  LegalDocumentType,
  LegalLanguage,
  LegalLocaleDocument,
} from "@/lib/legal-documents";

const LANGUAGE_LABELS: Record<LegalLanguage, string> = {
  en: "English",
  tr: "Türkçe",
  es: "Español",
  zh: "中文",
};

function parseSections(content: string) {
  return content
    .split(/^##\s+/m)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [heading, ...body] = part.split("\n");
      return { heading: heading.trim(), body: body.join("\n").trim() };
    });
}

export function LegalDocumentPage({
  type,
  language,
  document,
}: {
  type: LegalDocumentType;
  language: LegalLanguage;
  document: LegalLocaleDocument;
}) {
  const sections = parseSections(document.content);
  const updatedLabel =
    language === "tr"
      ? "Son güncelleme"
      : language === "es"
        ? "Última actualización"
        : language === "zh"
          ? "最后更新"
          : "Last updated";
  const contactLabel =
    language === "tr"
      ? "İletişim"
      : language === "es"
        ? "Contacto"
        : language === "zh"
          ? "联系方式"
          : "Contact";

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-surface-dark">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <CheckCircle2 size={21} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">OnPace</span>
          </Link>
          <nav className="flex flex-wrap justify-end gap-1.5">
            {(Object.keys(LANGUAGE_LABELS) as LegalLanguage[]).map((item) => (
              <Link
                key={item}
                href={`/${type === "privacy" ? "privacy" : "terms"}?lang=${item}`}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  item === language
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-500 hover:text-brand"
                }`}
              >
                {LANGUAGE_LABELS[item]}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <div className="mb-8 rounded-3xl border border-brand/10 bg-gradient-to-br from-white to-brand/5 p-7 shadow-sm sm:p-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-white px-3 py-1.5 text-[11px] font-bold text-brand">
            <ShieldCheck size={14} />
            OnPace Legal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {document.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600">
            {document.summary}
          </p>
          <p className="mt-5 text-xs font-semibold text-gray-400">
            {updatedLabel}: {document.last_updated}
          </p>
        </div>

        <article className="space-y-5">
          {sections.map((section, index) => (
            <section
              key={`${section.heading}-${index}`}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-extrabold text-surface-dark">
                {section.heading}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                {section.body}
              </p>
            </section>
          ))}
        </article>

        <div className="mt-8 rounded-2xl border border-brand/10 bg-brand/5 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-brand">
            {contactLabel}
          </p>
          <a
            href={`mailto:${document.contact_email}`}
            className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-surface-dark hover:text-brand"
          >
            <Mail size={15} />
            {document.contact_email}
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6 text-xs text-gray-500">
          <Link href="/" className="font-bold hover:text-brand">
            ← OnPace
          </Link>
          <div className="flex gap-4">
            <Link href={`/privacy?lang=${language}`} className="hover:text-brand">
              {DEFAULT_LINK_LABELS[language].privacy}
            </Link>
            <Link href={`/terms?lang=${language}`} className="hover:text-brand">
              {DEFAULT_LINK_LABELS[language].terms}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

const DEFAULT_LINK_LABELS: Record<
  LegalLanguage,
  { privacy: string; terms: string }
> = {
  en: { privacy: "Privacy Policy", terms: "Terms of Service" },
  tr: { privacy: "Gizlilik Politikası", terms: "Kullanım Şartları" },
  es: { privacy: "Política de Privacidad", terms: "Términos de Servicio" },
  zh: { privacy: "隐私政策", terms: "服务条款" },
};
