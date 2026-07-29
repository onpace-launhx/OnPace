"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Flame,
  Languages,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  UsersRound,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

type Language = "en" | "tr" | "es" | "zh";

const copy = {
  en: {
    nav: {
      how: "How it works",
      features: "Features",
      pricing: "Pricing",
      faq: "FAQ",
      signIn: "Sign in",
      start: "Start free",
    },
    hero: {
      badge: "AI planning that adapts to your real workload",
      lead: "Turn study chaos into",
      accent: "a plan you can finish.",
      description:
        "OnPace brings assignments, exams, notes, focus sessions, and an AI study coach into one calm workspace—so you always know what to do next.",
      primary: "Build my free study plan",
      secondary: "See how it works",
      assurances: ["Free plan available", "Set up in minutes", "Built for students"],
    },
    preview: {
      today: "Today’s plan",
      date: "Wednesday · July 29",
      status: "On pace",
      tasks: [
        ["SAT Reading", "Main idea practice", "09:00"],
        ["Mathematics", "Functions review", "11:30"],
        ["Biology", "Cell transport notes", "15:00"],
      ],
      coach: "AI Coach",
      coachText: "Your 16:00 slot is open. I can move Biology there and keep your evening free.",
      focus: "Focus mode",
      progress: "Weekly progress",
      progressValue: "82%",
      cards: "12 cards ready",
      start: "Start",
      minutes: "min",
    },
    proof: {
      eyebrow: "One workspace. Every part of studying.",
      items: ["Tasks & exams", "AI study plans", "Notes & practice", "Focus & progress"],
    },
    how: {
      eyebrow: "Simple by design",
      title: "Go from overwhelmed to organized in three steps.",
      description:
        "Tell OnPace what matters, review the plan, then work one focused block at a time.",
      steps: [
        {
          title: "Add your goals",
          description: "Bring in courses, deadlines, exams, and the time you actually have.",
        },
        {
          title: "Review your AI plan",
          description: "Get a realistic daily path built around priorities and open calendar slots.",
        },
        {
          title: "Focus and improve",
          description: "Complete sessions, track momentum, and let the next plan adapt.",
        },
      ],
    },
    features: {
      eyebrow: "Everything works together",
      title: "A study system—not another disconnected tool.",
      description:
        "Every OnPace feature shares the same context, so your plan stays useful when school gets busy.",
      items: [
        {
          title: "AI day planning",
          description: "Turn open tasks and deadlines into a plan you can review before anything is scheduled.",
        },
        {
          title: "Focus without friction",
          description: "Run study blocks with gentle ambient audio, break timers, and session history.",
        },
        {
          title: "Notes that become practice",
          description: "Transform notes and PDFs into explanations, flashcards, and quizzes.",
        },
        {
          title: "Smaller next steps",
          description: "Break intimidating assignments into concrete, manageable actions.",
        },
        {
          title: "Exam roadmaps",
          description: "See days remaining, topic readiness, and the work still ahead.",
        },
        {
          title: "Study partner matching",
          description: "Find compatible peers using subjects, goals, learning styles, and availability.",
        },
      ],
      matchingSignals: ["Goals", "Subjects", "Learning style", "Availability"],
    },
    outcome: {
      eyebrow: "Designed for real student life",
      title: "Know what matters now—and what can wait.",
      description:
        "OnPace keeps the day actionable without hiding the bigger picture. Your dashboard connects the next task, upcoming exam, daily goal, and actual focus history.",
      bullets: [
        "A clear next action instead of an endless list",
        "Plans that respect deadlines and available time",
        "Progress based on completed work and focus sessions",
        "Optional Google Calendar synchronization",
      ],
      cardTitle: "Today at a glance",
      cardHeadline: "Next up: SAT reading—main idea practice",
      cardMeta: "09:00 · 30 min",
      cardButton: "Start focus",
    },
    pricing: {
      eyebrow: "Start small, upgrade when it helps",
      title: "A plan for every pace.",
      description: "Try the core workflow for free. Choose more AI capacity and advanced tools when you need them.",
      popular: "Most popular",
      plans: [
        {
          name: "Free",
          price: "$0",
          cadence: "forever",
          description: "The essentials for building a better study routine.",
          features: ["Core task planning", "Basic calendar", "Daily AI allowance", "Focus timer"],
          cta: "Start free",
        },
        {
          name: "Pro Monthly",
          price: "$6.99",
          cadence: "per month",
          description: "Full flexibility for active students and exam seasons.",
          features: ["Unlimited AI coach", "Advanced study tools", "Study groups", "Progress analytics"],
          cta: "Choose monthly",
        },
        {
          name: "Pro Annual",
          price: "$59.99",
          cadence: "per year",
          description: "The best value for a complete academic year.",
          features: ["Everything in Pro", "Priority AI processing", "Early feature access", "Annual savings"],
          cta: "Choose annual",
        },
      ],
    },
    trust: {
      eyebrow: "Your data stays under your control",
      title: "Connect only what you want.",
      description:
        "Google Calendar is optional. When connected, OnPace uses calendar access only for the scheduling actions you request. Your Google data is not sold or used for advertising.",
      privacy: "Read Privacy Policy",
      terms: "Read Terms",
    },
    faq: {
      eyebrow: "Questions, answered",
      title: "Everything you need before you begin.",
      items: [
        ["Can I use OnPace for free?", "Yes. The Free plan includes the core task, calendar, focus, and limited AI workflow."],
        ["Does AI change my calendar automatically?", "No. AI-generated plans are shown for review before you add them to your day."],
        ["Which languages are supported?", "OnPace currently supports English, Turkish, Spanish, and Chinese across its core workflows."],
        ["Is Google Calendar required?", "No. Calendar connection is optional, and OnPace can be used without it."],
      ],
    },
    cta: {
      badge: "Your next study session can feel different",
      title: "Build a plan you’ll actually follow.",
      description: "Start with today’s tasks. OnPace will help you turn them into a calmer, clearer path forward.",
      primary: "Start studying free",
      secondary: "Sign in",
    },
    footer: {
      description: "AI-powered planning, focus, and study tools for students.",
      product: "Product",
      company: "Company",
      legal: "Legal",
      features: "Features",
      pricing: "Pricing",
      how: "How it works",
      about: "About OnPace",
      contact: "Contact",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      rights: "All rights reserved.",
      secure: "Secure by design",
    },
  },
  tr: {
    nav: {
      how: "Nasıl çalışır?",
      features: "Özellikler",
      pricing: "Fiyatlandırma",
      faq: "SSS",
      signIn: "Giriş yap",
      start: "Ücretsiz başla",
    },
    hero: {
      badge: "Gerçek çalışma yüküne uyum sağlayan AI planlama",
      lead: "Çalışma karmaşasını",
      accent: "bitirebileceğin bir plana dönüştür.",
      description:
        "OnPace; görevlerini, sınavlarını, notlarını, odak oturumlarını ve AI çalışma koçunu sakin bir çalışma alanında birleştirir. Böylece sırada ne olduğunu her zaman bilirsin.",
      primary: "Ücretsiz çalışma planımı oluştur",
      secondary: "Nasıl çalıştığını gör",
      assurances: ["Ücretsiz plan mevcut", "Dakikalar içinde kurulum", "Öğrenciler için tasarlandı"],
    },
    preview: {
      today: "Bugünün planı",
      date: "Çarşamba · 29 Temmuz",
      status: "Planında",
      tasks: [
        ["SAT Okuma", "Ana fikir çalışması", "09:00"],
        ["Matematik", "Fonksiyon tekrarı", "11:30"],
        ["Biyoloji", "Hücre taşınımı notları", "15:00"],
      ],
      coach: "AI Koçu",
      coachText: "16.00 saatin boş. Biyolojiyi buraya taşıyıp akşamını boş bırakabilirim.",
      focus: "Odak modu",
      progress: "Haftalık ilerleme",
      progressValue: "%82",
      cards: "12 kart hazır",
      start: "Başlat",
      minutes: "dk",
    },
    proof: {
      eyebrow: "Tek çalışma alanı. Çalışmanın her parçası.",
      items: ["Görevler ve sınavlar", "AI çalışma planları", "Notlar ve pratik", "Odak ve ilerleme"],
    },
    how: {
      eyebrow: "Sade ve anlaşılır",
      title: "Üç adımda karmaşadan düzene geç.",
      description:
        "OnPace’e önemli olanları anlat, planını gözden geçir ve her seferinde tek bir odak bloğuyla ilerle.",
      steps: [
        {
          title: "Hedeflerini ekle",
          description: "Derslerini, son tarihlerini, sınavlarını ve gerçekten ayırabildiğin zamanı gir.",
        },
        {
          title: "AI planını incele",
          description: "Önceliklerine ve takvimindeki boşluklara göre gerçekçi bir günlük yol haritası al.",
        },
        {
          title: "Odaklan ve geliştir",
          description: "Oturumları tamamla, ivmeni takip et ve sonraki planın sana uyum sağlasın.",
        },
      ],
    },
    features: {
      eyebrow: "Her şey birlikte çalışır",
      title: "Birbirinden kopuk araçlar değil, bütün bir çalışma sistemi.",
      description:
        "OnPace özellikleri aynı bağlamı paylaşır; okul yoğunlaştığında bile planın anlamlı kalır.",
      items: [
        {
          title: "AI ile gün planlama",
          description: "Açık görevleri ve son tarihleri, takvime eklemeden önce onaylayabileceğin bir plana dönüştür.",
        },
        {
          title: "Kesintisiz odak",
          description: "Yumuşak ortam sesleri, mola sayaçları ve oturum geçmişiyle çalışma blokları başlat.",
        },
        {
          title: "Pratiğe dönüşen notlar",
          description: "Notları ve PDF’leri açıklamalara, bilgi kartlarına ve quizlere dönüştür.",
        },
        {
          title: "Daha küçük adımlar",
          description: "Göz korkutan görevleri somut ve yönetilebilir sonraki adımlara ayır.",
        },
        {
          title: "Sınav yol haritaları",
          description: "Kalan günü, konu hazırlığını ve yapılması gereken çalışmayı tek yerde gör.",
        },
        {
          title: "Çalışma partneri eşleştirme",
          description: "Ders, hedef, öğrenme stili ve uygunluğa göre uyumlu partnerler bul.",
        },
      ],
      matchingSignals: ["Hedefler", "Dersler", "Öğrenme stili", "Uygunluk"],
    },
    outcome: {
      eyebrow: "Gerçek öğrenci hayatı için tasarlandı",
      title: "Şimdi neyin önemli olduğunu ve neyin bekleyebileceğini bil.",
      description:
        "OnPace büyük resmi kaybetmeden günü uygulanabilir tutar. Panelin sıradaki görevi, yaklaşan sınavı, günlük hedefi ve gerçek odak geçmişini birbirine bağlar.",
      bullets: [
        "Sonsuz liste yerine net bir sonraki adım",
        "Son tarihlere ve uygun zamanına saygı duyan planlar",
        "Tamamlanan işler ve odak oturumlarına dayalı ilerleme",
        "İsteğe bağlı Google Takvim senkronizasyonu",
      ],
      cardTitle: "Bugüne genel bakış",
      cardHeadline: "Sıradaki: SAT okuma—ana fikir çalışması",
      cardMeta: "09:00 · 30 dk",
      cardButton: "Odağı başlat",
    },
    pricing: {
      eyebrow: "Küçük başla, fayda gördükçe yükselt",
      title: "Her çalışma temposuna uygun bir plan.",
      description: "Temel akışı ücretsiz kullan. Daha fazla AI kapasitesi ve gelişmiş araçlar gerektiğinde planını yükselt.",
      popular: "En popüler",
      plans: [
        {
          name: "Ücretsiz",
          price: "$0",
          cadence: "süresiz",
          description: "Daha iyi bir çalışma düzeni kurmak için temel araçlar.",
          features: ["Temel görev planlama", "Temel takvim", "Günlük AI hakkı", "Odak sayacı"],
          cta: "Ücretsiz başla",
        },
        {
          name: "Pro Aylık",
          price: "$6.99",
          cadence: "aylık",
          description: "Yoğun dönemler ve aktif öğrenciler için tam esneklik.",
          features: ["Sınırsız AI koçu", "Gelişmiş çalışma araçları", "Çalışma grupları", "İlerleme analizi"],
          cta: "Aylık planı seç",
        },
        {
          name: "Pro Yıllık",
          price: "$59.99",
          cadence: "yıllık",
          description: "Tam bir akademik yıl için en avantajlı seçenek.",
          features: ["Tüm Pro özellikleri", "Öncelikli AI işlemleri", "Yeni özelliklere erken erişim", "Yıllık avantaj"],
          cta: "Yıllık planı seç",
        },
      ],
    },
    trust: {
      eyebrow: "Verilerin senin kontrolünde",
      title: "Yalnızca istediğin bağlantıları kur.",
      description:
        "Google Takvim tamamen isteğe bağlıdır. Bağlandığında OnPace takvim erişimini yalnızca senin istediğin planlama işlemleri için kullanır. Google verilerin satılmaz veya reklam amacıyla kullanılmaz.",
      privacy: "Gizlilik Politikasını oku",
      terms: "Kullanım Şartlarını oku",
    },
    faq: {
      eyebrow: "Merak edilenler",
      title: "Başlamadan önce bilmen gerekenler.",
      items: [
        ["OnPace’i ücretsiz kullanabilir miyim?", "Evet. Ücretsiz plan temel görev, takvim, odak ve sınırlı AI akışını içerir."],
        ["AI takvimimi otomatik olarak değiştirir mi?", "Hayır. AI tarafından hazırlanan planlar gününe eklenmeden önce onayına sunulur."],
        ["Hangi diller destekleniyor?", "OnPace temel akışlarda İngilizce, Türkçe, İspanyolca ve Çinceyi destekler."],
        ["Google Takvim zorunlu mu?", "Hayır. Takvim bağlantısı isteğe bağlıdır ve OnPace bağlantı olmadan da kullanılabilir."],
      ],
    },
    cta: {
      badge: "Bir sonraki çalışma oturumun farklı olabilir",
      title: "Gerçekten uygulayacağın bir plan oluştur.",
      description: "Bugünün görevleriyle başla. OnPace onları daha sakin ve net bir ilerleme yoluna dönüştürmene yardım etsin.",
      primary: "Ücretsiz çalışmaya başla",
      secondary: "Giriş yap",
    },
    footer: {
      description: "Öğrenciler için AI destekli planlama, odak ve çalışma araçları.",
      product: "Ürün",
      company: "Şirket",
      legal: "Yasal",
      features: "Özellikler",
      pricing: "Fiyatlandırma",
      how: "Nasıl çalışır?",
      about: "OnPace hakkında",
      contact: "İletişim",
      privacy: "Gizlilik Politikası",
      terms: "Kullanım Şartları",
      rights: "Tüm hakları saklıdır.",
      secure: "Güvenli tasarım",
    },
  },
  es: {
    nav: {
      how: "Cómo funciona",
      features: "Funciones",
      pricing: "Precios",
      faq: "Preguntas",
      signIn: "Iniciar sesión",
      start: "Empezar gratis",
    },
    hero: {
      badge: "Planificación con IA que se adapta a tu carga real",
      lead: "Convierte el caos de estudiar en",
      accent: "un plan que puedas terminar.",
      description:
        "OnPace reúne tareas, exámenes, apuntes, sesiones de enfoque y un coach de IA en un espacio tranquilo para que siempre sepas qué hacer después.",
      primary: "Crear mi plan gratuito",
      secondary: "Ver cómo funciona",
      assurances: ["Plan gratuito disponible", "Configuración en minutos", "Hecho para estudiantes"],
    },
    preview: {
      today: "Plan de hoy",
      date: "Miércoles · 29 de julio",
      status: "Al día",
      tasks: [
        ["Lectura SAT", "Práctica de idea principal", "09:00"],
        ["Matemáticas", "Repaso de funciones", "11:30"],
        ["Biología", "Notas de transporte celular", "15:00"],
      ],
      coach: "Coach de IA",
      coachText: "Tu franja de las 16:00 está libre. Puedo mover Biología allí y dejar libre tu tarde.",
      focus: "Modo enfoque",
      progress: "Progreso semanal",
      progressValue: "82%",
      cards: "12 tarjetas listas",
      start: "Empezar",
      minutes: "min",
    },
    proof: {
      eyebrow: "Un espacio para cada parte del estudio.",
      items: ["Tareas y exámenes", "Planes con IA", "Apuntes y práctica", "Enfoque y progreso"],
    },
    how: {
      eyebrow: "Simple por diseño",
      title: "Pasa del agobio al orden en tres pasos.",
      description: "Cuéntale a OnPace qué importa, revisa el plan y avanza bloque a bloque.",
      steps: [
        { title: "Añade tus objetivos", description: "Incluye cursos, fechas límite, exámenes y el tiempo que realmente tienes." },
        { title: "Revisa tu plan de IA", description: "Obtén una ruta diaria basada en prioridades y huecos del calendario." },
        { title: "Concéntrate y mejora", description: "Completa sesiones, sigue tu ritmo y adapta el siguiente plan." },
      ],
    },
    features: {
      eyebrow: "Todo funciona en conjunto",
      title: "Un sistema de estudio, no otra herramienta aislada.",
      description: "Cada función comparte el mismo contexto para que tu plan siga siendo útil.",
      items: [
        { title: "Planificación diaria con IA", description: "Convierte tareas y fechas límite en un plan revisable antes de programarlo." },
        { title: "Enfoque sin fricción", description: "Estudia con sonido ambiental, descansos e historial de sesiones." },
        { title: "Apuntes que se vuelven práctica", description: "Transforma apuntes y PDF en explicaciones, tarjetas y cuestionarios." },
        { title: "Pasos más pequeños", description: "Divide tareas difíciles en acciones concretas y manejables." },
        { title: "Rutas de examen", description: "Consulta días restantes, preparación por tema y trabajo pendiente." },
        { title: "Compañeros compatibles", description: "Encuentra estudiantes por materias, objetivos, estilo y disponibilidad." },
      ],
      matchingSignals: ["Metas", "Asignaturas", "Estilo de aprendizaje", "Disponibilidad"],
    },
    outcome: {
      eyebrow: "Diseñado para la vida estudiantil real",
      title: "Sabe qué importa ahora y qué puede esperar.",
      description: "OnPace mantiene el día accionable sin perder la visión general.",
      bullets: [
        "Una siguiente acción clara, no una lista infinita",
        "Planes que respetan fechas y tiempo disponible",
        "Progreso basado en trabajo y sesiones reales",
        "Sincronización opcional con Google Calendar",
      ],
      cardTitle: "Resumen de hoy",
      cardHeadline: "Siguiente: lectura SAT—idea principal",
      cardMeta: "09:00 · 30 min",
      cardButton: "Iniciar enfoque",
    },
    pricing: {
      eyebrow: "Empieza poco a poco",
      title: "Un plan para cada ritmo.",
      description: "Usa gratis el flujo principal y amplía las herramientas cuando lo necesites.",
      popular: "Más popular",
      plans: [
        { name: "Gratis", price: "$0", cadence: "para siempre", description: "Lo esencial para mejorar tu rutina.", features: ["Planificación básica", "Calendario básico", "Uso diario de IA", "Temporizador"], cta: "Empezar gratis" },
        { name: "Pro Mensual", price: "$6.99", cadence: "al mes", description: "Flexibilidad para épocas intensas.", features: ["Coach de IA ilimitado", "Herramientas avanzadas", "Grupos de estudio", "Analíticas"], cta: "Elegir mensual" },
        { name: "Pro Anual", price: "$59.99", cadence: "al año", description: "Mejor valor para todo el curso.", features: ["Todo Pro", "IA prioritaria", "Acceso anticipado", "Ahorro anual"], cta: "Elegir anual" },
      ],
    },
    trust: {
      eyebrow: "Tus datos bajo tu control",
      title: "Conecta solo lo que quieras.",
      description: "Google Calendar es opcional. OnPace usa el acceso solo para las acciones que solicitas y no vende tus datos.",
      privacy: "Leer Política de Privacidad",
      terms: "Leer Términos",
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Lo que necesitas saber antes de empezar.",
      items: [
        ["¿Puedo usar OnPace gratis?", "Sí. El plan Gratis incluye tareas, calendario, enfoque y un uso limitado de IA."],
        ["¿La IA cambia mi calendario sola?", "No. Los planes se muestran para revisión antes de añadirlos."],
        ["¿Qué idiomas admite?", "Inglés, turco, español y chino en los flujos principales."],
        ["¿Google Calendar es obligatorio?", "No. La conexión es opcional."],
      ],
    },
    cta: {
      badge: "Tu próxima sesión puede sentirse diferente",
      title: "Crea un plan que realmente sigas.",
      description: "Empieza con las tareas de hoy y conviértelas en un camino más claro.",
      primary: "Empezar gratis",
      secondary: "Iniciar sesión",
    },
    footer: {
      description: "Planificación, enfoque y herramientas de IA para estudiantes.",
      product: "Producto",
      company: "Empresa",
      legal: "Legal",
      features: "Funciones",
      pricing: "Precios",
      how: "Cómo funciona",
      about: "Sobre OnPace",
      contact: "Contacto",
      privacy: "Privacidad",
      terms: "Términos",
      rights: "Todos los derechos reservados.",
      secure: "Seguridad desde el diseño",
    },
  },
  zh: {
    nav: {
      how: "使用方式",
      features: "功能",
      pricing: "价格",
      faq: "常见问题",
      signIn: "登录",
      start: "免费开始",
    },
    hero: {
      badge: "适应真实学习任务的 AI 规划",
      lead: "把学习中的混乱变成",
      accent: "真正能完成的计划。",
      description:
        "OnPace 将任务、考试、笔记、专注时段和 AI 学习教练整合在一个清晰的空间中，让你始终知道下一步该做什么。",
      primary: "创建免费学习计划",
      secondary: "了解使用方式",
      assurances: ["提供免费方案", "几分钟即可开始", "专为学生设计"],
    },
    preview: {
      today: "今日计划",
      date: "星期三 · 7月29日",
      status: "进度正常",
      tasks: [
        ["SAT 阅读", "主旨练习", "09:00"],
        ["数学", "函数复习", "11:30"],
        ["生物", "细胞运输笔记", "15:00"],
      ],
      coach: "AI 教练",
      coachText: "16:00 还有空档，我可以把生物安排到这里，并保留晚上的时间。",
      focus: "专注模式",
      progress: "每周进度",
      progressValue: "82%",
      cards: "12 张卡片已准备",
      start: "开始",
      minutes: "分钟",
    },
    proof: {
      eyebrow: "一个空间，覆盖学习的每个环节。",
      items: ["任务与考试", "AI 学习计划", "笔记与练习", "专注与进度"],
    },
    how: {
      eyebrow: "简单清晰",
      title: "三步从压力走向有序。",
      description: "告诉 OnPace 重要目标，检查计划，然后一次完成一个专注时段。",
      steps: [
        { title: "添加目标", description: "录入课程、截止日期、考试和真正可用的时间。" },
        { title: "检查 AI 计划", description: "根据优先级和日历空档获得现实的每日路线。" },
        { title: "专注并改进", description: "完成学习时段、跟踪进度，让下一份计划继续适应你。" },
      ],
    },
    features: {
      eyebrow: "所有功能协同工作",
      title: "一套学习系统，而不是又一个孤立工具。",
      description: "OnPace 的功能共享同一学习背景，即使任务繁忙，计划仍然有用。",
      items: [
        { title: "AI 每日规划", description: "把任务和截止日期变成可先检查再加入日程的计划。" },
        { title: "轻松保持专注", description: "使用环境音、休息计时和学习记录完成专注时段。" },
        { title: "把笔记变成练习", description: "将笔记和 PDF 转换为讲解、记忆卡和测验。" },
        { title: "更小的下一步", description: "把困难任务拆分为具体、可管理的行动。" },
        { title: "考试路线图", description: "查看剩余天数、各主题准备度和待完成学习。" },
        { title: "学习伙伴匹配", description: "根据科目、目标、学习方式和时间寻找合适伙伴。" },
      ],
      matchingSignals: ["目标", "科目", "学习方式", "可用时间"],
    },
    outcome: {
      eyebrow: "为真实学生生活设计",
      title: "知道现在最重要的事，也知道什么可以稍后处理。",
      description: "OnPace 让每日行动清晰，同时保留完整视角。",
      bullets: [
        "清楚的下一步，而不是无尽清单",
        "尊重截止日期和可用时间的计划",
        "基于真实完成任务和专注时段的进度",
        "可选的 Google 日历同步",
      ],
      cardTitle: "今日概览",
      cardHeadline: "下一项：SAT 阅读—主旨练习",
      cardMeta: "09:00 · 30 分钟",
      cardButton: "开始专注",
    },
    pricing: {
      eyebrow: "从基础开始，需要时升级",
      title: "适合每种学习节奏的方案。",
      description: "免费体验核心流程，需要更多 AI 和高级工具时再升级。",
      popular: "最受欢迎",
      plans: [
        { name: "免费版", price: "$0", cadence: "长期", description: "建立更好学习习惯的基础工具。", features: ["基础任务规划", "基础日历", "每日 AI 额度", "专注计时"], cta: "免费开始" },
        { name: "Pro 月度版", price: "$6.99", cadence: "每月", description: "适合考试季和高强度学习。", features: ["无限 AI 教练", "高级学习工具", "学习小组", "进度分析"], cta: "选择月度版" },
        { name: "Pro 年度版", price: "$59.99", cadence: "每年", description: "完整学年的高性价比方案。", features: ["全部 Pro 功能", "优先 AI 处理", "新功能抢先体验", "年度优惠"], cta: "选择年度版" },
      ],
    },
    trust: {
      eyebrow: "数据由你掌控",
      title: "只连接你需要的服务。",
      description: "Google 日历连接完全可选。OnPace 仅执行你要求的日程操作，不出售数据或用于广告。",
      privacy: "查看隐私政策",
      terms: "查看服务条款",
    },
    faq: {
      eyebrow: "常见问题",
      title: "开始之前需要了解的内容。",
      items: [
        ["可以免费使用 OnPace 吗？", "可以。免费版包含基础任务、日历、专注和有限 AI 功能。"],
        ["AI 会自动修改日历吗？", "不会。AI 计划会先供你检查，确认后才加入日程。"],
        ["支持哪些语言？", "核心流程支持英语、土耳其语、西班牙语和中文。"],
        ["必须连接 Google 日历吗？", "不需要，连接完全可选。"],
      ],
    },
    cta: {
      badge: "下一次学习可以更轻松",
      title: "创建一份你真正会执行的计划。",
      description: "从今天的任务开始，让 OnPace 帮你建立更清晰的前进路线。",
      primary: "免费开始学习",
      secondary: "登录",
    },
    footer: {
      description: "面向学生的 AI 规划、专注和学习工具。",
      product: "产品",
      company: "公司",
      legal: "法律",
      features: "功能",
      pricing: "价格",
      how: "使用方式",
      about: "关于 OnPace",
      contact: "联系我们",
      privacy: "隐私政策",
      terms: "服务条款",
      rights: "保留所有权利。",
      secure: "安全设计",
    },
  },
} as const;

const languageLabels: Array<{ value: Language; label: string; short: string }> = [
  { value: "en", label: "English", short: "EN" },
  { value: "tr", label: "Türkçe", short: "TR" },
  { value: "es", label: "Español", short: "ES" },
  { value: "zh", label: "中文", short: "中文" },
];

const featureIcons = [
  WandSparkles,
  TimerReset,
  BookOpenCheck,
  CheckCircle2,
  Target,
  UsersRound,
];

const stepIcons = [Target, CalendarDays, BarChart3];

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="OnPace home">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-[0_8px_30px_rgba(79,70,229,0.14)]">
        <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg object-contain" />
      </span>
      <span className="text-xl font-black tracking-[-0.04em] text-slate-950">OnPace</span>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
      )}
    </div>
  );
}

function ProductPreview({ text }: { text: (typeof copy)[Language]["preview"] }) {
  return (
    <div className="relative mx-auto w-full max-w-[620px] lg:mr-0">
      <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-r from-indigo-200/60 via-violet-200/45 to-cyan-200/50 blur-3xl" />
      <div className="marketing-float-slow absolute -left-5 top-14 z-20 hidden w-[190px] rounded-2xl border border-white/90 bg-white/90 p-4 shadow-[0_24px_70px_rgba(45,38,120,0.18)] backdrop-blur-xl sm:block">
        <div className="flex items-center gap-2 text-[11px] font-black text-indigo-700">
          <Sparkles size={13} />
          {text.coach}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-600">{text.coachText}</p>
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-3 shadow-[0_35px_100px_rgba(50,42,120,0.17)]">
        <div className="rounded-[24px] border border-slate-100 bg-[#f6f7ff] p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#4dd4ac]" />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-[10px] font-extrabold text-indigo-700 shadow-sm">
              <CheckCircle2 size={12} />
              {text.status}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_155px]">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{text.today}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{text.date}</p>
                </div>
                <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                  <CalendarDays size={15} />
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {text.tasks.map((task, index) => (
                  <div
                    key={task[1]}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        index === 0
                          ? "bg-indigo-500"
                          : index === 1
                            ? "bg-cyan-500"
                            : "bg-emerald-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-black text-slate-800">{task[0]}</p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-400">{task[1]}</p>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">{task[2]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 text-center shadow-sm">
                <div className="flex items-center justify-between text-left">
                  <p className="text-[10px] font-black text-slate-800">{text.focus}</p>
                  <Clock3 size={13} className="text-slate-400" />
                </div>
                <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full border-[7px] border-indigo-100 border-t-indigo-500 border-r-violet-500">
                  <span className="text-xl font-black tracking-tight text-slate-950">25:00</span>
                </div>
                <div className="mt-4 h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-[10px] font-black leading-8 text-white">
                  <Play size={11} className="mr-1 inline fill-white" />
                  {text.start}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-800">{text.progress}</p>
                  <Zap size={13} className="text-amber-500" />
                </div>
                <p className="mt-3 text-2xl font-black text-indigo-600">{text.progressValue}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                </div>
                <p className="mt-2 text-[9px] font-semibold text-slate-400">{text.cards}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="marketing-float absolute -bottom-7 right-5 z-20 hidden w-[190px] rounded-2xl border border-indigo-100 bg-white p-4 shadow-[0_22px_65px_rgba(45,38,120,0.16)] sm:block">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <BrainCircuit size={18} />
          </div>
          <span className="text-xl font-black text-slate-950">+18%</span>
        </div>
        <p className="mt-3 text-[10px] font-bold text-slate-500">{text.progress}</p>
      </div>
    </div>
  );
}

export function MarketingLandingPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const stored = window.localStorage.getItem("language");
    if (stored === "tr" || stored === "es" || stored === "zh" || stored === "en") {
      window.setTimeout(() => setLanguage(stored), 0);
    }
  }, []);

  const text = copy[language];

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem("language", nextLanguage);
    window.dispatchEvent(new Event("language-change"));
  };

  return (
    <div className="marketing-shell min-h-screen overflow-x-hidden bg-[#fbfcff] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Brand />

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
            <a href="#how-it-works" className="text-sm font-bold text-slate-600 transition-colors hover:text-indigo-600">
              {text.nav.how}
            </a>
            <a href="#features" className="text-sm font-bold text-slate-600 transition-colors hover:text-indigo-600">
              {text.nav.features}
            </a>
            <a href="#pricing" className="text-sm font-bold text-slate-600 transition-colors hover:text-indigo-600">
              {text.nav.pricing}
            </a>
            <a href="#faq" className="text-sm font-bold text-slate-600 transition-colors hover:text-indigo-600">
              {text.nav.faq}
            </a>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <label className="relative">
              <span className="sr-only">Language</span>
              <Languages className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <select
                value={language}
                onChange={(event) => changeLanguage(event.target.value as Language)}
                className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-extrabold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              >
                {languageLabels.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </label>
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-100">
              {text.nav.signIn}
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              {text.nav.start}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 sm:hidden"
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-5 py-5 shadow-xl sm:hidden">
            <nav className="grid gap-2">
              {[
                ["#how-it-works", text.nav.how],
                ["#features", text.nav.features],
                ["#pricing", text.nav.pricing],
                ["#faq", text.nav.faq],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/login" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-extrabold text-slate-700">
                {text.nav.signIn}
              </Link>
              <Link href="/register" className="rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-extrabold text-white">
                {text.nav.start}
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {languageLabels.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeLanguage(item.value)}
                  className={`rounded-xl border px-2 py-2 text-xs font-extrabold ${
                    language === item.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  {item.short}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40 lg:pb-32">
          <div className="marketing-grid absolute inset-0 -z-20 opacity-60" />
          <div className="absolute left-[-12rem] top-[-8rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-indigo-200/55 blur-3xl" />
          <div className="absolute right-[-10rem] top-[2rem] -z-10 h-[30rem] w-[30rem] rounded-full bg-cyan-100/70 blur-3xl" />
          <div className="absolute left-[42%] top-[42%] -z-10 h-[22rem] w-[22rem] rounded-full bg-violet-100/70 blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3.5 py-2 text-xs font-extrabold text-indigo-700 shadow-sm backdrop-blur">
                <Sparkles size={14} />
                {text.hero.badge}
              </div>
              <h1 className="mt-7 text-[2.75rem] font-black leading-[1.03] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.35rem]">
                {text.hero.lead}{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
                  {text.hero.accent}
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {text.hero.description}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-sm font-black text-white shadow-[0_18px_45px_rgba(79,70,229,0.3)] transition hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(79,70,229,0.35)]"
                >
                  {text.hero.primary}
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:text-indigo-700"
                >
                  <Play size={16} className="fill-current" />
                  {text.hero.secondary}
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3">
                {text.hero.assurances.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <ProductPreview text={text.preview} />
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <p className="max-w-xs text-sm font-black tracking-tight text-slate-950">{text.proof.eyebrow}</p>
            <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
              {text.proof.items.map((item, index) => {
                const icons = [CheckCircle2, WandSparkles, FileText, Flame];
                const Icon = icons[index];
                return (
                  <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs font-extrabold text-slate-600">
                    <Icon size={15} className="text-indigo-600" />
                    {item}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <SectionHeading eyebrow={text.how.eyebrow} title={text.how.title} description={text.how.description} />
            <div className="relative mt-14 grid gap-5 lg:grid-cols-3">
              <div className="absolute left-[16%] right-[16%] top-9 hidden border-t-2 border-dashed border-indigo-200 lg:block" />
              {text.how.steps.map((step, index) => {
                const Icon = stepIcons[index];
                return (
                  <article key={step.title} className="relative rounded-[28px] border border-slate-200 bg-[#fbfcff] p-7 shadow-[0_18px_55px_rgba(30,41,59,0.06)]">
                    <div className="flex items-center justify-between">
                      <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-lg shadow-indigo-100/70">
                        <Icon size={27} />
                      </span>
                      <span className="text-5xl font-black tracking-[-0.07em] text-indigo-100">0{index + 1}</span>
                    </div>
                    <h3 className="mt-7 text-xl font-black tracking-tight text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-y border-slate-200/70 bg-[#f5f7ff] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <SectionHeading eyebrow={text.features.eyebrow} title={text.features.title} description={text.features.description} />
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {text.features.items.map((feature, index) => {
                const Icon = featureIcons[index];
                return (
                  <article
                    key={feature.title}
                    className={`group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(30,41,59,0.06)] transition duration-300 hover:-translate-y-1.5 hover:border-indigo-200 hover:shadow-[0_26px_75px_rgba(79,70,229,0.12)] ${
                      index === 0 || index === 5 ? "lg:col-span-2" : ""
                    }`}
                  >
                    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-100/60 blur-2xl transition group-hover:bg-violet-200/70" />
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600">
                      <Icon size={22} />
                    </span>
                    <h3 className="relative mt-6 text-xl font-black tracking-tight text-slate-950">{feature.title}</h3>
                    <p className="relative mt-3 max-w-xl text-sm leading-6 text-slate-600">{feature.description}</p>
                    {index === 0 && (
                      <div className="relative mt-7 grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-3">
                        {text.preview.tasks.map((task) => (
                          <div key={task[1]} className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-[10px] font-black text-slate-800">{task[0]}</p>
                            <p className="mt-1 truncate text-[9px] text-slate-400">{task[1]}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {index === 5 && (
                      <div className="relative mt-7 flex flex-wrap gap-2">
                        {text.features.matchingSignals.map((item) => (
                          <span key={item} className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-extrabold text-indigo-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <SectionHeading eyebrow={text.outcome.eyebrow} title={text.outcome.title} description={text.outcome.description} align="left" />
              <ul className="mt-8 space-y-4">
                {text.outcome.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="mt-9 inline-flex items-center gap-2 text-sm font-black text-indigo-700 hover:text-indigo-900">
                {text.hero.primary} <ArrowRight size={16} />
              </Link>
            </div>

            <div className="relative rounded-[36px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 shadow-[0_32px_90px_rgba(79,70,229,0.13)] sm:p-8">
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-100/40">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-indigo-600">
                    <Sparkles size={14} />
                    {text.outcome.cardTitle}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-700">
                    {text.preview.status}
                  </span>
                </div>
                <h3 className="mt-7 text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-3xl">
                  {text.outcome.cardHeadline}
                </h3>
                <p className="mt-3 text-sm font-bold text-slate-400">{text.outcome.cardMeta}</p>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[
                    [CheckCircle2, "12", text.proof.items[0]],
                    [TimerReset, "60", text.preview.minutes],
                    [Target, "1", text.proof.items[1]],
                  ].map(([Icon, value, label]) => {
                    const CardIcon = Icon as typeof CheckCircle2;
                    return (
                      <div key={String(label)} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <CardIcon size={14} className="text-indigo-600" />
                        <p className="mt-3 text-xl font-black text-slate-950">{String(value)}</p>
                        <p className="mt-1 truncate text-[9px] font-bold text-slate-400">{String(label)}</p>
                      </div>
                    );
                  })}
                </div>
                <Link href="/register" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
                  <Play size={15} className="fill-white" />
                  {text.outcome.cardButton}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-y border-slate-200/70 bg-[#f7f8ff] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <SectionHeading eyebrow={text.pricing.eyebrow} title={text.pricing.title} description={text.pricing.description} />
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {text.pricing.plans.map((plan, index) => (
                <article
                  key={plan.name}
                  className={`relative flex flex-col rounded-[30px] border bg-white p-7 shadow-[0_18px_60px_rgba(30,41,59,0.06)] ${
                    index === 1
                      ? "border-indigo-400 ring-4 ring-indigo-100"
                      : "border-slate-200"
                  }`}
                >
                  {index === 1 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
                      {text.pricing.popular}
                    </span>
                  )}
                  <h3 className="text-lg font-black text-slate-950">{plan.name}</h3>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
                  <div className="mt-7 flex items-end gap-2">
                    <span className="text-4xl font-black tracking-[-0.05em] text-slate-950">{plan.price}</span>
                    <span className="pb-1 text-xs font-bold text-slate-400">/ {plan.cadence}</span>
                  </div>
                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
                        <Check size={15} className="text-emerald-500" strokeWidth={3} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-8 flex items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-black transition ${
                      index === 1
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                        : "border border-slate-200 text-slate-800 hover:border-indigo-300 hover:text-indigo-700"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-indigo-50 p-7 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-lg shadow-emerald-100">
                  <ShieldCheck size={27} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{text.trust.eyebrow}</p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{text.trust.title}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{text.trust.description}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <Link href={`/privacy?lang=${language}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm">
                    <LockKeyhole size={14} /> {text.trust.privacy}
                  </Link>
                  <Link href={`/terms?lang=${language}`} className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-xs font-black text-indigo-700">
                    {text.trust.terms}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 bg-white pb-24 pt-12 sm:pb-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <SectionHeading eyebrow={text.faq.eyebrow} title={text.faq.title} align="left" />
            <div className="space-y-3">
              {text.faq.items.map(([question, answer], index) => {
                const open = openFaq === index;
                return (
                  <article key={question} className="overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcff]">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      aria-expanded={open}
                    >
                      <span className="text-sm font-black text-slate-900">{question}</span>
                      <ChevronDown size={18} className={`shrink-0 text-indigo-600 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && <p className="px-5 pb-5 text-sm leading-6 text-slate-600">{answer}</p>}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-slate-950 px-6 py-14 text-white shadow-[0_35px_90px_rgba(15,23,42,0.25)] sm:px-12 lg:px-16">
            <div className="marketing-grid-dark absolute inset-0 opacity-30" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/35 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-200">
                  <Sparkles size={13} />
                  {text.cta.badge}
                </span>
                <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-[-0.045em] sm:text-5xl">{text.cta.title}</h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{text.cta.description}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-indigo-700 transition hover:-translate-y-1">
                  {text.cta.primary} <ArrowRight size={17} />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-4 text-sm font-black text-white transition hover:bg-white/10">
                  {text.cta.secondary}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr]">
            <div>
              <Brand />
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-500">{text.footer.description}</p>
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-400">
                <MessageSquareText size={14} />
                onpace.launchx@gmail.com
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950">{text.footer.product}</h3>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500">
                <a href="#features" className="hover:text-indigo-600">{text.footer.features}</a>
                <a href="#pricing" className="hover:text-indigo-600">{text.footer.pricing}</a>
                <a href="#how-it-works" className="hover:text-indigo-600">{text.footer.how}</a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950">{text.footer.company}</h3>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500">
                <a href="#features" className="hover:text-indigo-600">{text.footer.about}</a>
                <a href="mailto:onpace.launchx@gmail.com" className="hover:text-indigo-600">{text.footer.contact}</a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950">{text.footer.legal}</h3>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500">
                <Link href={`/privacy?lang=${language}`} className="hover:text-indigo-600">{text.footer.privacy}</Link>
                <Link href={`/terms?lang=${language}`} className="hover:text-indigo-600">{text.footer.terms}</Link>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-slate-100 pt-6 text-xs font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} OnPace. {text.footer.rights}</p>
            <p className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> {text.footer.secure}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
