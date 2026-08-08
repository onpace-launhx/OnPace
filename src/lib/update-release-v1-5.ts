export const UPDATE_LANGUAGES = ["en", "tr", "es", "zh"] as const;
export type UpdateLanguage = (typeof UPDATE_LANGUAGES)[number];

export type ReleaseFeature = {
  title: string;
  description: string;
  points: [string, string];
};

export type ReleaseCopy = {
  locale: string;
  languageName: string;
  metaTitle: string;
  metaDescription: string;
  releaseNotes: string;
  date: string;
  versionLabel: string;
  heroTitle: string;
  heroDescription: string;
  updateReady: string;
  openOnPace: string;
  home: string;
  overviewLabel: string;
  overviewTitle: string;
  overviewDescription: string;
  stats: Array<{ value: string; label: string }>;
  features: ReleaseFeature[];
  safetyTitle: string;
  safetyDescription: string;
  nextLabel: string;
  nextTitle: string;
  nextDescription: string;
  focusTitle: string;
  focusDescription: string;
  partnerTitle: string;
  partnerDescription: string;
  roadmapNote: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimary: string;
  ctaSecondary: string;
  footer: string;
};

export const UPDATE_LANGUAGE_LABELS: Record<UpdateLanguage, string> = {
  en: "English",
  tr: "Türkçe",
  es: "Español",
  zh: "中文",
};

export const RELEASE_V1_5: Record<UpdateLanguage, ReleaseCopy> = {
  en: {
    locale: "en-US",
    languageName: "English",
    metaTitle: "Version 1.5 Update Information",
    metaDescription: "Discover the AI, mobile, notes, social, subscription, and administration improvements in OnPace Version 1.5.",
    releaseNotes: "Release notes",
    date: "August 8–9, 2026",
    versionLabel: "Version 1.5",
    heroTitle: "A smarter, smoother, and safer OnPace.",
    heroDescription: "Version 1.5 brings two days of improvements together in one focused update—making study planning, AI support, account management, and collaboration more dependable across every screen.",
    updateReady: "A major experience update",
    openOnPace: "Open OnPace",
    home: "Home",
    overviewLabel: "What changed",
    overviewTitle: "Everything in Version 1.5",
    overviewDescription: "The changes below are designed to make everyday studying feel clearer and more reliable without disrupting your existing work.",
    stats: [
      { value: "2", label: "days of improvements" },
      { value: "4", label: "fully supported languages" },
      { value: "1", label: "unified study experience" },
    ],
    features: [
      { title: "AI Coach & chat continuity", description: "Your AI conversations are more dependable and easier to continue.", points: ["Chat history returns when you reopen a conversation", "Clearer responses, stronger context, and friendlier error handling"] },
      { title: "Mobile & language consistency", description: "Core student and administration areas now adapt more naturally.", points: ["Improved phone, tablet, and desktop layouts", "More complete English, Turkish, Spanish, and Chinese coverage"] },
      { title: "Notes, profile & social space", description: "Writing and sharing study progress now feels cleaner and more modern.", points: ["Rich-text tools replace confusing manual formatting", "Refreshed study-partner profile and safely formatted social posts"] },
      { title: "Plans, promo codes & administration", description: "Membership access is clearer and easier to manage responsibly.", points: ["Improved promo-code history and duration reporting", "Audited bulk actions for Free and time-limited complimentary Pro access"] },
      { title: "Payments & localized communication", description: "The manual EshipX process now has a structured verification flow.", points: ["Payment references, claims, renewals, trials, and cancellations are traceable", "Account-language notifications and email content are prepared in four languages"] },
      { title: "Access safety & data continuity", description: "Account changes protect the work students have already completed.", points: ["Country and time-zone information keeps campaign dates accurate", "Notes, tasks, chats, courses, calendars, and study history remain protected"] },
    ],
    safetyTitle: "Your learning data stays yours",
    safetyDescription: "Plan resets, subscription changes, and complimentary access campaigns do not erase your notes, tasks, chats, courses, calendar items, or study history.",
    nextLabel: "A first look at Version 2.0",
    nextTitle: "The next chapter is already taking shape.",
    nextDescription: "Version 2.0 is being shaped around deeper focus and more meaningful student collaboration. Details may evolve as we test the experience.",
    focusTitle: "A better Focus Mode experience",
    focusDescription: "More adaptive study sessions, clearer progress, smarter break guidance, and a calmer environment designed to reduce distractions.",
    partnerTitle: "Better study-partner matching",
    partnerDescription: "More useful matches based on goals, availability, learning preferences, and compatibility—with a smoother and safer way to connect.",
    roadmapNote: "In development · Roadmap details may change",
    ctaTitle: "Ready to study with the new OnPace?",
    ctaDescription: "Your existing work is waiting for you—now inside a more polished experience.",
    ctaPrimary: "Continue to OnPace",
    ctaSecondary: "Visit the home page",
    footer: "Built to help every student move forward at their own pace.",
  },
  tr: {
    locale: "tr-TR",
    languageName: "Türkçe",
    metaTitle: "Version 1.5 Güncelleme Bilgileri",
    metaDescription: "OnPace Version 1.5 ile gelen yapay zekâ, mobil, notlar, sosyal alan, abonelik ve yönetim geliştirmelerini keşfedin.",
    releaseNotes: "Sürüm notları",
    date: "8–9 Ağustos 2026",
    versionLabel: "Version 1.5",
    heroTitle: "Daha akıllı, daha akıcı ve daha güvenli bir OnPace.",
    heroDescription: "Version 1.5, iki günlük geliştirmeyi tek bir güçlü güncellemede birleştiriyor; çalışma planlama, yapay zekâ desteği, hesap yönetimi ve ekip çalışması artık her ekranda daha güvenilir.",
    updateReady: "Kapsamlı deneyim güncellemesi",
    openOnPace: "OnPace’i aç",
    home: "Ana sayfa",
    overviewLabel: "Neler değişti?",
    overviewTitle: "Version 1.5 ile gelenler",
    overviewDescription: "Bu yenilikler, mevcut çalışmalarınıza dokunmadan günlük çalışma deneyiminizi daha anlaşılır ve güvenilir hâle getirmek için hazırlandı.",
    stats: [
      { value: "2", label: "günlük geliştirme" },
      { value: "4", label: "tam desteklenen dil" },
      { value: "1", label: "birleşik çalışma deneyimi" },
    ],
    features: [
      { title: "Yapay Zekâ Koçu ve sohbet devamlılığı", description: "Yapay zekâ konuşmalarınız artık daha güvenilir ve kaldığınız yerden devam etmeye hazır.", points: ["Bir sohbeti yeniden açtığınızda konuşma geçmişi geri gelir", "Daha güçlü bağlam, daha anlaşılır yanıtlar ve kullanıcı dostu hata mesajları"] },
      { title: "Mobil ve dil tutarlılığı", description: "Öğrenci ve yönetim alanları farklı ekranlara artık daha doğal uyum sağlıyor.", points: ["Telefon, tablet ve bilgisayar yerleşimleri iyileştirildi", "İngilizce, Türkçe, İspanyolca ve Çince desteği genişletildi"] },
      { title: "Notlar, profil ve sosyal alan", description: "Çalışmalarınızı yazmak ve paylaşmak daha ferah ve modern bir deneyime dönüştü.", points: ["Karmaşık işaretler yerine zengin metin düzenleme araçları", "Yenilenen çalışma partneri profili ve güvenli biçimlendirilmiş sosyal gönderiler"] },
      { title: "Paketler, promocode ve yönetim", description: "Üyelik erişimleri daha anlaşılır ve kontrollü biçimde yönetilebiliyor.", points: ["Promocode geçmişi ve verilen süreler daha doğru raporlanıyor", "Free ve süreli ücretsiz Pro erişimi için kayıt altına alınan toplu işlemler"] },
      { title: "Ödeme ve yerelleştirilmiş iletişim", description: "Manuel EshipX süreci artık düzenli bir doğrulama akışına sahip.", points: ["Ödeme referansı, bildirim, deneme, yenileme ve iptal süreçleri takip edilebilir", "Kullanıcının hesap diline göre dört dilde bildirim ve e-posta içeriği"] },
      { title: "Erişim güvenliği ve veri devamlılığı", description: "Hesap değişiklikleri öğrencilerin tamamladığı çalışmaları korur.", points: ["Ülke ve saat dilimi bilgisi kampanya tarihlerinin doğru görünmesini sağlar", "Notlar, görevler, sohbetler, dersler, takvim ve çalışma geçmişi korunur"] },
    ],
    safetyTitle: "Çalışma verileriniz her zaman korunur",
    safetyDescription: "Paket sıfırlamaları, abonelik değişiklikleri ve ücretsiz erişim kampanyaları; notlarınızı, görevlerinizi, sohbetlerinizi, derslerinizi, takviminizi veya çalışma geçmişinizi silmez.",
    nextLabel: "Version 2.0’a ilk bakış",
    nextTitle: "OnPace’in yeni dönemi şekillenmeye başladı.",
    nextDescription: "Version 2.0; daha derin odaklanma ve daha anlamlı öğrenci iş birliği etrafında geliştiriliyor. Deneyimi test ettikçe ayrıntılar değişebilir.",
    focusTitle: "Daha iyi bir Focus Mode deneyimi",
    focusDescription: "Daha uyarlanabilir çalışma oturumları, anlaşılır ilerleme, akıllı mola yönlendirmeleri ve dikkat dağıtıcıları azaltan daha sakin bir çalışma ortamı.",
    partnerTitle: "Daha iyi çalışma arkadaşı eşleştirmesi",
    partnerDescription: "Hedef, müsaitlik, öğrenme tercihi ve uyuma göre daha yararlı eşleşmeler; iletişim kurmak için daha akıcı ve güvenli bir deneyim.",
    roadmapNote: "Geliştiriliyor · Yol haritası ayrıntıları değişebilir",
    ctaTitle: "Yeni OnPace ile çalışmaya hazır mısınız?",
    ctaDescription: "Mevcut çalışmalarınız, şimdi daha özenli bir deneyimin içinde sizi bekliyor.",
    ctaPrimary: "OnPace’e devam et",
    ctaSecondary: "Ana sayfaya git",
    footer: "Her öğrencinin kendi hızında ilerlemesine yardımcı olmak için geliştirildi.",
  },
  es: {
    locale: "es-ES",
    languageName: "Español",
    metaTitle: "Información de la actualización Version 1.5",
    metaDescription: "Descubre las mejoras de IA, móvil, notas, espacio social, suscripciones y administración de OnPace Version 1.5.",
    releaseNotes: "Notas de la versión",
    date: "8–9 de agosto de 2026",
    versionLabel: "Version 1.5",
    heroTitle: "Un OnPace más inteligente, fluido y seguro.",
    heroDescription: "Version 1.5 reúne dos días de mejoras en una sola actualización para que la planificación, la ayuda de IA, la gestión de cuentas y la colaboración sean más fiables en cualquier pantalla.",
    updateReady: "Una gran actualización de la experiencia",
    openOnPace: "Abrir OnPace",
    home: "Inicio",
    overviewLabel: "Qué ha cambiado",
    overviewTitle: "Todo lo que incluye Version 1.5",
    overviewDescription: "Estas novedades hacen que el estudio diario sea más claro y fiable sin alterar el trabajo que ya has realizado.",
    stats: [
      { value: "2", label: "días de mejoras" },
      { value: "4", label: "idiomas con soporte completo" },
      { value: "1", label: "experiencia de estudio unificada" },
    ],
    features: [
      { title: "Coach de IA y continuidad del chat", description: "Tus conversaciones con la IA son más fiables y fáciles de continuar.", points: ["El historial vuelve cuando abres de nuevo una conversación", "Mejor contexto, respuestas más claras y errores fáciles de entender"] },
      { title: "Coherencia móvil y de idiomas", description: "Las áreas de estudiantes y administración se adaptan mejor a cada pantalla.", points: ["Diseños mejorados para móvil, tableta y ordenador", "Cobertura ampliada en inglés, turco, español y chino"] },
      { title: "Notas, perfil y espacio social", description: "Escribir y compartir tu progreso ahora es más limpio y moderno.", points: ["Herramientas de texto enriquecido en lugar de formatos manuales confusos", "Perfil de compañero renovado y publicaciones con formato seguro"] },
      { title: "Planes, códigos promocionales y administración", description: "El acceso de las membresías se gestiona con más claridad y control.", points: ["Historial y duración de códigos promocionales más precisos", "Acciones masivas auditadas para planes Gratis y acceso Pro gratuito temporal"] },
      { title: "Pagos y comunicación localizada", description: "El proceso manual de EshipX cuenta ahora con una verificación estructurada.", points: ["Referencias, avisos, pruebas, renovaciones y cancelaciones rastreables", "Notificaciones y correos en los cuatro idiomas según el idioma de la cuenta"] },
      { title: "Seguridad de acceso y continuidad de datos", description: "Los cambios de cuenta protegen el trabajo ya realizado por el estudiante.", points: ["El país y la zona horaria mantienen correctas las fechas de campaña", "Se conservan notas, tareas, chats, cursos, calendario e historial de estudio"] },
    ],
    safetyTitle: "Tus datos de aprendizaje siguen siendo tuyos",
    safetyDescription: "Los cambios de plan, las cancelaciones y las campañas gratuitas no eliminan tus notas, tareas, chats, cursos, elementos del calendario ni historial de estudio.",
    nextLabel: "Un primer vistazo a Version 2.0",
    nextTitle: "El próximo capítulo ya está tomando forma.",
    nextDescription: "Version 2.0 se está diseñando alrededor de una concentración más profunda y una colaboración más útil entre estudiantes. Los detalles pueden evolucionar durante las pruebas.",
    focusTitle: "Una mejor experiencia de Focus Mode",
    focusDescription: "Sesiones más adaptables, progreso más claro, pausas más inteligentes y un entorno tranquilo que ayuda a reducir las distracciones.",
    partnerTitle: "Mejores compañeros de estudio",
    partnerDescription: "Coincidencias más útiles según objetivos, disponibilidad, preferencias de aprendizaje y compatibilidad, con una forma más segura de conectar.",
    roadmapNote: "En desarrollo · La hoja de ruta puede cambiar",
    ctaTitle: "¿Listo para estudiar con el nuevo OnPace?",
    ctaDescription: "Tu trabajo sigue esperándote, ahora dentro de una experiencia más cuidada.",
    ctaPrimary: "Continuar a OnPace",
    ctaSecondary: "Visitar la página de inicio",
    footer: "Creado para ayudar a cada estudiante a avanzar a su propio ritmo.",
  },
  zh: {
    locale: "zh-CN",
    languageName: "中文",
    metaTitle: "Version 1.5 更新信息",
    metaDescription: "了解 OnPace Version 1.5 带来的 AI、移动端、笔记、社交、订阅和管理体验改进。",
    releaseNotes: "版本说明",
    date: "2026年8月8日至9日",
    versionLabel: "Version 1.5",
    heroTitle: "更智能、更流畅、更安全的 OnPace。",
    heroDescription: "Version 1.5 将两天的改进汇集为一次重要更新，让学习规划、AI 支持、账户管理和协作在各种设备上都更加可靠。",
    updateReady: "一次重要的体验升级",
    openOnPace: "打开 OnPace",
    home: "首页",
    overviewLabel: "更新内容",
    overviewTitle: "Version 1.5 的全部改进",
    overviewDescription: "这些更新旨在让日常学习更清晰、更可靠，同时不会影响您已经完成的学习内容。",
    stats: [
      { value: "2", label: "天集中改进" },
      { value: "4", label: "种完整支持语言" },
      { value: "1", label: "套统一学习体验" },
    ],
    features: [
      { title: "AI 学习教练与聊天连续性", description: "AI 对话更加可靠，也更容易从上次的位置继续。", points: ["重新打开对话时可看到聊天历史", "上下文更完整、回答更清晰、错误提示更友好"] },
      { title: "移动端与多语言一致性", description: "学生端和管理端现在能更自然地适配不同屏幕。", points: ["优化手机、平板和电脑布局", "扩展英语、土耳其语、西班牙语和中文支持"] },
      { title: "笔记、个人资料与社交空间", description: "记录并分享学习进度变得更清爽、更现代。", points: ["使用富文本工具，不再依赖复杂的手动格式符号", "重新设计学习伙伴资料，并安全显示格式化动态"] },
      { title: "套餐、优惠码与管理", description: "会员权限现在可以得到更清晰、更稳妥的管理。", points: ["更准确地记录优惠码使用历史和有效期", "支持可审计的免费套餐及限时免费 Pro 批量操作"] },
      { title: "付款与本地化沟通", description: "EshipX 手动付款现已拥有结构化核对流程。", points: ["可追踪付款参考号、通知、试用、续费和取消记录", "根据账户语言提供四种语言的通知与邮件内容"] },
      { title: "权限安全与数据连续性", description: "账户变更不会影响学生已经完成的学习成果。", points: ["国家和时区信息可确保活动时间准确显示", "笔记、任务、聊天、课程、日历和学习记录均会保留"] },
    ],
    safetyTitle: "您的学习数据始终受到保护",
    safetyDescription: "套餐重置、订阅变更和免费权限活动不会删除您的笔记、任务、聊天、课程、日历内容或学习记录。",
    nextLabel: "抢先了解 Version 2.0",
    nextTitle: "OnPace 的下一阶段已经开始成形。",
    nextDescription: "Version 2.0 将围绕更深入的专注体验和更有意义的学生协作进行设计。随着测试推进，具体细节可能有所调整。",
    focusTitle: "更出色的 Focus Mode 体验",
    focusDescription: "更灵活的学习时段、更清晰的进度、更智能的休息建议，以及帮助减少干扰的安静学习环境。",
    partnerTitle: "更好的学习伙伴匹配",
    partnerDescription: "根据目标、空闲时间、学习偏好和契合度提供更有价值的匹配，并以更顺畅、更安全的方式建立联系。",
    roadmapNote: "正在开发 · 路线图内容可能调整",
    ctaTitle: "准备好体验全新的 OnPace 了吗？",
    ctaDescription: "您已有的学习内容仍在这里，现在拥有更加完善的使用体验。",
    ctaPrimary: "继续使用 OnPace",
    ctaSecondary: "返回首页",
    footer: "帮助每一位学生按照自己的节奏不断前进。",
  },
};

export function isUpdateLanguage(value: string): value is UpdateLanguage {
  return UPDATE_LANGUAGES.includes(value as UpdateLanguage);
}
