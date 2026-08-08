import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  Check,
  Clock3,
  CreditCard,
  Focus,
  Globe2,
  LockKeyhole,
  NotebookPen,
  Rocket,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  RELEASE_V1_5,
  UPDATE_LANGUAGES,
  UPDATE_LANGUAGE_LABELS,
  type UpdateLanguage,
} from "@/lib/update-release-v1-5";

const FEATURE_STYLES = [
  { icon: Bot, iconClass: "bg-violet-100 text-violet-700", glow: "from-violet-500/10" },
  { icon: Globe2, iconClass: "bg-cyan-100 text-cyan-700", glow: "from-cyan-500/10" },
  { icon: NotebookPen, iconClass: "bg-amber-100 text-amber-700", glow: "from-amber-500/10" },
  { icon: BookOpenCheck, iconClass: "bg-indigo-100 text-indigo-700", glow: "from-indigo-500/10" },
  { icon: CreditCard, iconClass: "bg-emerald-100 text-emerald-700", glow: "from-emerald-500/10" },
  { icon: LockKeyhole, iconClass: "bg-rose-100 text-rose-700", glow: "from-rose-500/10" },
] as const;

export function UpdateReleasePage({ language }: { language: UpdateLanguage }) {
  const copy = RELEASE_V1_5[language];

  return (
    <div lang={language === "zh" ? "zh-CN" : language} className="min-h-screen overflow-hidden bg-[#F7F8FC] text-surface-dark">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.png" alt="OnPace" width={34} height={34} className="rounded-xl object-contain shadow-sm" priority />
            <span className="text-lg font-black tracking-tight sm:text-xl">OnPace</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <nav aria-label="Language" className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:gap-1">
              {UPDATE_LANGUAGES.map((item) => (
                <Link key={item} href={`/updates/v1-5/${item}`} hrefLang={item} aria-label={UPDATE_LANGUAGE_LABELS[item]} aria-current={item === language ? "page" : undefined} className={`shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-extrabold transition sm:px-3 sm:text-xs ${item === language ? "bg-white text-brand shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-brand"}`}>
                  <span className="sm:hidden">{item === "zh" ? "中文" : item.toUpperCase()}</span>
                  <span className="hidden sm:inline">{UPDATE_LANGUAGE_LABELS[item]}</span>
                </Link>
              ))}
            </nav>
            <Link href="/login" className="hidden items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-hover sm:inline-flex">
              {copy.openOnPace}<ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate border-b border-slate-200/70 bg-white">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-28 top-4 h-80 w-80 rounded-full bg-violet-300/25 blur-3xl" />
            <div className="absolute -right-28 top-20 h-96 w-96 rounded-full bg-cyan-200/30 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b0c_1px,transparent_1px),linear-gradient(to_bottom,#64748b0c_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          </div>
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.12fr_.88fr] lg:px-8 lg:py-28">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-brand"><Sparkles size={13} />{copy.releaseNotes}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500"><Clock3 size={13} />{copy.date}</span>
              </div>
              <p className="mt-7 text-sm font-black uppercase tracking-[0.24em] text-brand">{copy.versionLabel}</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.06] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">{copy.heroTitle}</h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{copy.heroDescription}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand/20 transition hover:-translate-y-0.5 hover:bg-brand-hover">{copy.openOnPace}<ArrowRight size={17} /></Link>
                <Link href="/" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-extrabold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand/30 hover:text-brand">{copy.home}</Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br from-brand/20 via-cyan-200/20 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
                <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-brand/35 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">OnPace</p>
                    <p className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{copy.versionLabel}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Rocket size={23} className="text-violet-300" /></span>
                </div>
                <p className="relative mt-10 text-sm font-bold text-slate-300">{copy.updateReady}</p>
                <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                  {copy.stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:p-4">
                      <p className="text-2xl font-black text-white sm:text-3xl">{stat.value}</p>
                      <p className="mt-1 text-[9px] font-semibold leading-4 text-slate-400 sm:text-[11px]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">{copy.overviewLabel}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">{copy.overviewTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{copy.overviewDescription}</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {copy.features.map((feature, index) => {
              const style = FEATURE_STYLES[index];
              const Icon = style.icon;
              return (
                <article key={feature.title} className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-xl hover:shadow-slate-200/60 sm:p-7">
                  <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${style.glow} to-transparent opacity-0 transition group-hover:opacity-100`} />
                  <div className={`relative flex h-11 w-11 items-center justify-center rounded-2xl ${style.iconClass}`}><Icon size={21} /></div>
                  <h3 className="relative mt-5 text-lg font-black tracking-tight text-slate-900">{feature.title}</h3>
                  <p className="relative mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
                  <ul className="relative mt-5 space-y-3">
                    {feature.points.map((point) => <li key={point} className="flex items-start gap-2.5 text-xs font-semibold leading-5 text-slate-700"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={10} strokeWidth={3} /></span>{point}</li>)}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-emerald-200/80 bg-emerald-50/70 p-6 sm:flex-row sm:items-center sm:p-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"><LockKeyhole size={22} /></span>
            <div><h3 className="text-base font-black text-emerald-950">{copy.safetyTitle}</h3><p className="mt-1.5 text-sm leading-6 text-emerald-900/70">{copy.safetyDescription}</p></div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20 lg:py-24">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-brand/30 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-violet-200"><Sparkles size={13} />{copy.nextLabel}</span>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">{copy.nextTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{copy.nextDescription}</p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-300 ring-1 ring-violet-300/20"><Focus size={23} /></div>
                <h3 className="mt-5 text-xl font-black">{copy.focusTitle}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{copy.focusDescription}</p>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/20"><UsersRound size={23} /></div>
                <h3 className="mt-5 text-xl font-black">{copy.partnerTitle}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{copy.partnerDescription}</p>
              </article>
            </div>
            <p className="mt-6 text-xs font-bold text-slate-500">{copy.roadmapNote}</p>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand to-indigo-700 px-6 py-10 text-center text-white shadow-2xl shadow-brand/20 sm:px-10 sm:py-14">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{copy.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-indigo-100">{copy.ctaDescription}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-brand transition hover:-translate-y-0.5 hover:bg-indigo-50">{copy.ctaPrimary}<ArrowRight size={16} /></Link>
              <Link href="/" className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-white/15">{copy.ctaSecondary}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-7 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div className="flex items-center gap-2"><Image src="/logo.png" alt="" width={26} height={26} className="rounded-lg" /><span className="text-sm font-black">OnPace</span></div>
          <p className="text-xs text-slate-500">{copy.footer}</p>
        </div>
      </footer>
    </div>
  );
}
