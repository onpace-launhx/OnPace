"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  CalendarCheck2,
  CheckSquare,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

const copy = {
  en: {
    eyebrow: "About the OnPace application",
    title: "OnPace is an AI-powered study planner for students",
    description:
      "OnPace is an educational productivity application. It helps students organize assignments and exams, create study schedules, work with notes using AI, practice with quizzes and flashcards, and track focused study time from one dashboard.",
    planning: "Plan schoolwork",
    planningDesc:
      "Organize tasks, courses, exam dates, priorities, and study sessions.",
    learning: "Study with AI tools",
    learningDesc:
      "Analyze notes or PDFs and create personalized explanations, quizzes, and flashcards.",
    focus: "Stay focused",
    focusDesc:
      "Use focus timers, daily goals, progress tracking, and study reminders.",
    googleTitle: "Optional Google Calendar connection",
    googleDescription:
      "After signing in, a user may choose to connect Google Calendar. OnPace requests Calendar access only to show relevant calendar events, detect scheduling conflicts, and create, update, or delete study events when the user asks OnPace to do so. Connecting Google Calendar is optional and can be revoked at any time.",
    dataPromise:
      "OnPace does not sell Google user data or use it for advertising. Google data is used only to provide the calendar synchronization features requested by the user.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  tr: {
    eyebrow: "OnPace uygulaması hakkında",
    title: "OnPace, öğrenciler için yapay zeka destekli bir çalışma planlayıcısıdır",
    description:
      "OnPace bir eğitim ve verimlilik uygulamasıdır. Öğrencilerin ödev ve sınavlarını düzenlemesine, çalışma programları oluşturmasına, notlarını yapay zeka araçlarıyla işlemesine, quiz ve bilgi kartlarıyla pratik yapmasına ve odaklı çalışma süresini tek panelden izlemesine yardımcı olur.",
    planning: "Okul çalışmalarını planla",
    planningDesc:
      "Görevleri, dersleri, sınav tarihlerini, öncelikleri ve çalışma oturumlarını düzenle.",
    learning: "Yapay zeka araçlarıyla öğren",
    learningDesc:
      "Notları veya PDF’leri analiz et; kişiselleştirilmiş anlatımlar, quizler ve bilgi kartları oluştur.",
    focus: "Odağını koru",
    focusDesc:
      "Odak sayaçlarını, günlük hedefleri, ilerleme takibini ve çalışma hatırlatmalarını kullan.",
    googleTitle: "İsteğe bağlı Google Takvim bağlantısı",
    googleDescription:
      "Kullanıcı giriş yaptıktan sonra isterse Google Takvim’i bağlayabilir. OnPace, Takvim erişimini yalnızca ilgili etkinlikleri göstermek, zaman çakışmalarını belirlemek ve kullanıcının talebiyle çalışma etkinlikleri oluşturmak, güncellemek veya silmek için ister. Bağlantı isteğe bağlıdır ve her zaman kaldırılabilir.",
    dataPromise:
      "OnPace, Google kullanıcı verilerini satmaz veya reklam amacıyla kullanmaz. Google verileri yalnızca kullanıcının istediği takvim senkronizasyon özelliklerini sunmak için kullanılır.",
    privacy: "Gizlilik Politikası",
    terms: "Kullanım Şartları",
  },
  es: {
    eyebrow: "Acerca de la aplicación OnPace",
    title: "OnPace es un planificador de estudio con IA para estudiantes",
    description:
      "OnPace es una aplicación educativa de productividad. Ayuda a organizar tareas y exámenes, crear horarios, trabajar con apuntes mediante IA, practicar con cuestionarios y tarjetas, y registrar el tiempo de estudio concentrado desde un único panel.",
    planning: "Planifica los estudios",
    planningDesc:
      "Organiza tareas, cursos, fechas de examen, prioridades y sesiones de estudio.",
    learning: "Estudia con herramientas de IA",
    learningDesc:
      "Analiza apuntes o PDF y crea explicaciones personalizadas, cuestionarios y tarjetas.",
    focus: "Mantén la concentración",
    focusDesc:
      "Utiliza temporizadores, objetivos diarios, seguimiento del progreso y recordatorios.",
    googleTitle: "Conexión opcional con Google Calendar",
    googleDescription:
      "Después de iniciar sesión, el usuario puede conectar Google Calendar si lo desea. OnPace solicita acceso únicamente para mostrar eventos relevantes, detectar conflictos y crear, actualizar o eliminar eventos de estudio cuando el usuario lo pide. La conexión es opcional y puede revocarse en cualquier momento.",
    dataPromise:
      "OnPace no vende datos de usuarios de Google ni los utiliza para publicidad. Los datos se usan únicamente para las funciones de sincronización solicitadas.",
    privacy: "Política de Privacidad",
    terms: "Términos de Servicio",
  },
  zh: {
    eyebrow: "关于 OnPace 应用",
    title: "OnPace 是一款面向学生的 AI 学习规划应用",
    description:
      "OnPace 是一款教育效率应用，可帮助学生整理作业和考试、制定学习计划、使用 AI 处理笔记、通过测验和记忆卡练习，并在一个面板中记录专注学习时间。",
    planning: "规划学习任务",
    planningDesc: "整理任务、课程、考试日期、优先级和学习时段。",
    learning: "使用 AI 学习工具",
    learningDesc: "分析笔记或 PDF，生成个性化讲解、测验和记忆卡。",
    focus: "保持专注",
    focusDesc: "使用专注计时器、每日目标、进度跟踪和学习提醒。",
    googleTitle: "可选的 Google 日历连接",
    googleDescription:
      "登录后，用户可以选择连接 Google 日历。OnPace 仅为显示相关事件、检测时间冲突，以及根据用户要求创建、更新或删除学习事件而申请日历权限。连接完全可选，并可随时撤销。",
    dataPromise:
      "OnPace 不会出售 Google 用户数据，也不会将其用于广告。Google 数据仅用于提供用户主动请求的日历同步功能。",
    privacy: "隐私政策",
    terms: "服务条款",
  },
} as const;

const featureIcons = [CheckSquare, BrainCircuit, CalendarCheck2];

export function OAuthTransparency() {
  const [language, setLanguage] = useState<keyof typeof copy>("en");

  useEffect(() => {
    const updateLanguage = () => {
      const stored = window.localStorage.getItem("language");
      setLanguage(stored === "tr" || stored === "es" || stored === "zh" ? stored : "en");
    };
    updateLanguage();
    window.addEventListener("language-change", updateLanguage);
    return () => window.removeEventListener("language-change", updateLanguage);
  }, []);

  const text = copy[language];
  const features = [
    { title: text.planning, description: text.planningDesc },
    { title: text.learning, description: text.learningDesc },
    { title: text.focus, description: text.focusDesc },
  ];

  return (
    <section id="about-onpace" className="border-y border-gray-100 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">
            {text.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-surface-dark sm:text-4xl">
            {text.title}
          </h2>
          <p className="mt-5 text-base leading-7 text-gray-600">
            {text.description}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <article key={feature.title} className="rounded-2xl border border-gray-150 bg-surface-secondary p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon size={19} />
                </span>
                <h3 className="mt-4 text-sm font-extrabold text-surface-dark">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-5xl rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
              <CalendarCheck2 size={21} />
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-surface-dark">
                {text.googleTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {text.googleDescription}
              </p>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">
                <ShieldCheck className="mt-0.5 shrink-0" size={16} />
                <span>{text.dataPromise}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/privacy" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline">
                  {text.privacy} <ExternalLink size={12} />
                </Link>
                <Link href="/terms" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline">
                  {text.terms} <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
