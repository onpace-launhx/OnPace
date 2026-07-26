export type LegalLanguage = "en" | "tr" | "es" | "zh";
export type LegalDocumentType = "privacy" | "terms";

export type LegalLocaleDocument = {
  title: string;
  last_updated: string;
  summary: string;
  content: string;
  contact_email: string;
};

export type LegalDocuments = Record<
  LegalDocumentType,
  Record<LegalLanguage, LegalLocaleDocument>
>;

const LAST_UPDATED = "26 July 2026";
const CONTACT_EMAIL = "onpace.launchx@gmail.com";

export const DEFAULT_LEGAL_DOCUMENTS: LegalDocuments = {
  privacy: {
    en: {
      title: "Privacy Policy",
      last_updated: LAST_UPDATED,
      summary: "This policy explains how OnPace collects, uses, stores, and protects information when you use our study productivity services.",
      contact_email: CONTACT_EMAIL,
      content: `## Information we collect
We collect account information such as your name, email address, selected language, learning preferences, and subscription status. When you use OnPace, we may also process tasks, notes, study sessions, calendar events, focus records, uploaded images, support requests, and feature usage data.

## Google Calendar and connected services
If you connect Google Calendar, OnPace requests permission to read, create, update, and delete calendar events so that your OnPace schedule and Google Calendar can remain synchronized. We only use Google user data to provide the features you request. You can disconnect Google Calendar at any time from your account settings.

OnPace’s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.

## Artificial intelligence
When you use AI features, the text, images, notes, tasks, or schedule information needed to complete your request may be sent securely to the AI provider configured by OnPace. AI requests are used to generate study plans, organize notes, analyze schedules, create quizzes, and provide similar requested features. Do not submit highly sensitive personal information.

## How we use information
We use information to operate and secure the service, personalize study recommendations, synchronize calendars, send essential account messages, provide optional communications you consent to receive, process subscriptions, prevent abuse, diagnose errors, and improve OnPace.

## Service providers
We may use service providers such as Supabase for authentication and databases, Google for connected calendar features, AI model providers for requested AI processing, Resend for email delivery, Cloudflare R2 for file storage, Netlify for hosting, and payment providers when payments are enabled. These providers process information only as needed to deliver their services.

## Sharing and selling
We do not sell your personal information. We do not share personal information for third-party advertising. Information may be disclosed when required by law, to protect users and the service, or to vendors acting on our instructions.

## Retention and deletion
We retain information while your account is active and as needed for legitimate operational, security, accounting, and legal purposes. You may request account or data deletion by contacting us. Some records may be retained where legally required or necessary to prevent fraud.

## Security
We use reasonable technical and organizational safeguards, access controls, encrypted connections, and restricted server-side credentials. No internet service can guarantee absolute security.

## Your choices and rights
You can update profile information, control optional email communications, disconnect integrations, and request access, correction, export, or deletion of your information. Applicable rights may vary by location.

## Children
OnPace is designed for students. Where local law requires parental or guardian consent for a child to use an online service, the parent or guardian is responsible for providing that consent.

## Changes to this policy
We may update this policy as OnPace evolves. Material changes will be communicated through the service or by email where appropriate.

## Contact
For privacy questions or requests, contact us at the email shown below.`,
    },
    tr: {
      title: "Gizlilik Politikası",
      last_updated: "26 Temmuz 2026",
      summary: "Bu politika, OnPace çalışma verimliliği hizmetlerini kullanırken bilgilerinizin nasıl toplandığını, kullanıldığını, saklandığını ve korunduğunu açıklar.",
      contact_email: CONTACT_EMAIL,
      content: `## Topladığımız bilgiler
Ad, e-posta adresi, seçilen dil, öğrenme tercihleri ve abonelik durumu gibi hesap bilgilerini toplarız. OnPace kullanılırken görevler, notlar, çalışma oturumları, takvim etkinlikleri, odaklanma kayıtları, yüklenen görseller, destek talepleri ve özellik kullanım verileri de işlenebilir.

## Google Takvim ve bağlı hizmetler
Google Takvim’i bağlarsanız OnPace, OnPace programınız ile Google Takvim’in senkronize kalabilmesi için takvim etkinliklerini okuma, oluşturma, güncelleme ve silme izni ister. Google kullanıcı verileri yalnızca talep ettiğiniz özellikleri sunmak için kullanılır. Bağlantıyı hesap ayarlarından istediğiniz zaman kaldırabilirsiniz.

OnPace’in Google API’lerinden aldığı bilgileri kullanması ve aktarması, Sınırlı Kullanım şartları dahil Google API Hizmetleri Kullanıcı Verileri Politikası’na uygundur.

## Yapay zekâ
AI özelliklerini kullandığınızda isteğinizi tamamlamak için gerekli metinler, görseller, notlar, görevler veya program bilgileri OnPace tarafından yapılandırılan AI sağlayıcısına güvenli şekilde gönderilebilir. Bu veriler çalışma planı, not düzenleme, program analizi, quiz ve talep edilen benzer özellikleri üretmek için kullanılır. Çok hassas kişisel bilgileri göndermeyin.

## Bilgileri kullanma amaçlarımız
Bilgileri hizmeti işletmek ve güvenliğini sağlamak, çalışma önerilerini kişiselleştirmek, takvimleri senkronize etmek, zorunlu hesap mesajlarını ve izin verdiğiniz iletişimleri göndermek, abonelikleri işlemek, kötüye kullanımı önlemek, hataları incelemek ve OnPace’i geliştirmek için kullanırız.

## Hizmet sağlayıcılar
Kimlik doğrulama ve veritabanı için Supabase, bağlı takvim özellikleri için Google, AI işlemleri için model sağlayıcıları, e-posta teslimatı için Resend, dosya depolama için Cloudflare R2, barındırma için Netlify ve ödemeler açıldığında ödeme sağlayıcıları kullanılabilir.

## Paylaşım ve satış
Kişisel bilgilerinizi satmayız ve üçüncü taraf reklamcılığı için paylaşmayız. Bilgiler yasal zorunluluk, kullanıcıları veya hizmeti koruma ya da talimatlarımızla çalışan hizmet sağlayıcılar nedeniyle açıklanabilir.

## Saklama ve silme
Bilgiler hesabınız aktifken ve operasyonel, güvenlik, muhasebe veya yasal amaçlarla gerekli olduğu sürece saklanır. Hesabınızın veya verilerinizin silinmesini talep edebilirsiniz. Yasal zorunluluklar veya dolandırıcılığı önleme amacıyla bazı kayıtlar tutulabilir.

## Güvenlik
Makul teknik ve organizasyonel önlemler, erişim kontrolleri, şifreli bağlantılar ve sunucu tarafında korunan kimlik bilgileri kullanırız. Hiçbir internet hizmeti mutlak güvenlik garanti edemez.

## Tercihleriniz ve haklarınız
Profil bilgilerinizi güncelleyebilir, isteğe bağlı e-postaları yönetebilir, entegrasyonları kaldırabilir ve bilgilerinize erişim, düzeltme, dışa aktarma veya silme talebinde bulunabilirsiniz.

## Çocuklar
OnPace öğrenciler için tasarlanmıştır. Yerel mevzuat çevrimiçi hizmet kullanımı için ebeveyn veya vasi onayı gerektiriyorsa bu onayın sağlanmasından ebeveyn veya vasi sorumludur.

## Politika değişiklikleri
OnPace geliştikçe bu politika güncellenebilir. Önemli değişiklikler uygun olduğunda site içinden veya e-posta ile duyurulur.

## İletişim
Gizlilik soruları ve talepleri için aşağıdaki e-posta adresinden bize ulaşabilirsiniz.`,
    },
    es: {
      title: "Política de Privacidad",
      last_updated: "26 de julio de 2026",
      summary: "Esta política explica cómo OnPace recopila, utiliza, almacena y protege la información cuando utilizas nuestros servicios de productividad académica.",
      contact_email: CONTACT_EMAIL,
      content: `## Información que recopilamos
Recopilamos datos de la cuenta, como nombre, correo electrónico, idioma, preferencias de aprendizaje y estado de suscripción. También podemos procesar tareas, notas, sesiones de estudio, eventos del calendario, registros de concentración, imágenes, solicitudes de soporte y datos de uso.

## Google Calendar y servicios conectados
Si conectas Google Calendar, OnPace solicita permiso para leer, crear, actualizar y eliminar eventos con el fin de mantener ambos calendarios sincronizados. Solo usamos los datos de Google para ofrecer las funciones solicitadas. Puedes desconectarlo en cualquier momento.

El uso y la transferencia de información recibida de las API de Google cumplen la Política de Datos de Usuario de los Servicios de API de Google, incluidos los requisitos de Uso Limitado.

## Inteligencia artificial
Al utilizar funciones de IA, el texto, las imágenes, notas, tareas o datos de horario necesarios pueden enviarse de forma segura al proveedor de IA configurado. Se utilizan para crear planes, organizar notas, analizar horarios, generar cuestionarios y prestar funciones solicitadas.

## Cómo usamos la información
Usamos la información para operar y proteger el servicio, personalizar recomendaciones, sincronizar calendarios, enviar mensajes esenciales y comunicaciones autorizadas, gestionar suscripciones, prevenir abusos, diagnosticar errores y mejorar OnPace.

## Proveedores
Podemos utilizar Supabase, Google, proveedores de modelos de IA, Resend, Cloudflare R2, Netlify y proveedores de pago cuando corresponda. Procesan datos únicamente para prestar sus servicios.

## Compartición y venta
No vendemos información personal ni la compartimos para publicidad de terceros. Podemos divulgarla cuando lo exija la ley, para proteger el servicio o a proveedores que actúan bajo nuestras instrucciones.

## Conservación y eliminación
Conservamos la información mientras la cuenta esté activa y durante el tiempo necesario por motivos operativos, de seguridad, contables o legales. Puedes solicitar acceso, corrección o eliminación.

## Seguridad
Utilizamos medidas técnicas y organizativas razonables, controles de acceso, conexiones cifradas y credenciales protegidas. Ningún servicio en Internet puede garantizar seguridad absoluta.

## Tus opciones y derechos
Puedes actualizar tu perfil, controlar correos opcionales, desconectar integraciones y solicitar acceso, corrección, exportación o eliminación de tus datos.

## Menores
OnPace está diseñado para estudiantes. Cuando la legislación local exija consentimiento parental o del tutor, será responsabilidad del padre, madre o tutor proporcionarlo.

## Cambios
Podemos actualizar esta política. Los cambios importantes se comunicarán mediante el servicio o por correo electrónico cuando corresponda.

## Contacto
Para consultas o solicitudes de privacidad, utiliza el correo indicado abajo.`,
    },
    zh: {
      title: "隐私政策",
      last_updated: "2026年7月26日",
      summary: "本政策说明您使用 OnPace 学习效率服务时，我们如何收集、使用、存储和保护信息。",
      contact_email: CONTACT_EMAIL,
      content: `## 我们收集的信息
我们会收集姓名、电子邮件、语言、学习偏好和订阅状态等账户信息。使用 OnPace 时，我们还可能处理任务、笔记、学习时段、日历事件、专注记录、上传图片、支持请求和功能使用数据。

## Google 日历和关联服务
连接 Google 日历后，OnPace 会请求读取、创建、更新和删除日历事件的权限，以保持 OnPace 与 Google 日历同步。Google 用户数据仅用于提供您请求的功能。您可以随时在账户设置中断开连接。

OnPace 对从 Google API 获得的信息的使用和传输遵守 Google API 服务用户数据政策，包括有限使用要求。

## 人工智能
使用 AI 功能时，完成请求所需的文本、图片、笔记、任务或日程信息可能会安全地发送给 OnPace 配置的 AI 提供商，用于生成学习计划、整理笔记、分析日程、创建测验等功能。

## 信息用途
我们使用信息来运营和保护服务、个性化学习建议、同步日历、发送必要的账户消息和您同意的通知、处理订阅、防止滥用、诊断错误并改进 OnPace。

## 服务提供商
我们可能使用 Supabase、Google、AI 模型提供商、Resend、Cloudflare R2、Netlify，以及启用付款时的支付服务商。这些服务商仅在提供服务所需的范围内处理信息。

## 分享和出售
我们不会出售个人信息，也不会为第三方广告分享个人信息。法律要求、保护用户或服务以及受我们指示的服务商可能需要处理相关信息。

## 保留和删除
账户有效期间以及运营、安全、会计或法律所需期限内，我们会保留信息。您可以请求访问、更正、导出或删除数据。

## 安全
我们采用合理的技术和组织措施、访问控制、加密连接和受限的服务器凭据。任何互联网服务都无法保证绝对安全。

## 您的选择和权利
您可以更新个人资料、管理可选邮件、断开集成，并请求访问、更正、导出或删除个人信息。

## 未成年人
OnPace 面向学生。如果当地法律要求父母或监护人同意，应由父母或监护人提供相应同意。

## 政策变更
我们可能随着 OnPace 的发展更新本政策。重大变更会在适当情况下通过服务或电子邮件通知。

## 联系方式
有关隐私的问题或请求，请使用下方电子邮件联系我们。`,
    },
  },
  terms: {
    en: {
      title: "Terms of Service",
      last_updated: LAST_UPDATED,
      summary: "These terms govern access to and use of OnPace, including its study planning, AI, calendar, communication, and subscription features.",
      contact_email: CONTACT_EMAIL,
      content: `## Acceptance
By creating an account or using OnPace, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the service.

## Eligibility and accounts
You must provide accurate information and keep your credentials secure. You are responsible for activity under your account. If local law requires parental or guardian consent, you may use OnPace only after that consent is provided.

## The service
OnPace provides study planning, task management, notes, focus tools, AI assistance, calendar synchronization, study groups, communications, and related features. Features may change, be limited by plan, enter maintenance, or be discontinued.

## Artificial intelligence
AI outputs may be incomplete, inaccurate, or unsuitable. They are study aids and not professional, medical, legal, or financial advice. You are responsible for reviewing outputs before relying on or adding them to your schedule.

## User content
You retain ownership of content you submit. You grant OnPace the limited permission necessary to host, process, transform, and transmit that content solely to operate and improve the requested service features. You must have the right to upload the content.

## Acceptable use
Do not misuse the service, interfere with security, attempt unauthorized access, scrape data, distribute malware, harass others, infringe rights, upload unlawful content, abuse AI or email systems, or use OnPace to cheat in violation of academic rules.

## Connected services
Google Calendar and other integrations are governed by their own terms. You authorize OnPace to perform requested actions on connected services. You can revoke access, but changes already synchronized may remain in the connected service.

## Plans, payments, and trials
Paid features, prices, billing periods, promotions, and trial conditions are shown before purchase. Payment processing may be handled by a third-party provider. Unless required by law or stated otherwise, fees already paid are non-refundable. Cancellation stops future renewals but does not automatically erase the account.

## Availability and maintenance
We aim to provide a reliable service but do not guarantee uninterrupted availability. Planned or emergency maintenance, provider outages, security events, and product updates may temporarily limit access.

## Suspension and termination
We may restrict or terminate access for violations, security risks, fraud, non-payment, legal requirements, or harm to users or the service. You may stop using OnPace and request account deletion.

## Intellectual property
OnPace’s software, design, branding, and original materials are protected by applicable intellectual property laws. These Terms do not grant ownership of OnPace technology or trademarks.

## Disclaimer and liability
The service is provided on an “as available” basis to the extent permitted by law. OnPace is not responsible for indirect or consequential losses, lost study progress, missed events, AI errors, third-party services, or circumstances beyond reasonable control. Rights that cannot legally be excluded remain unaffected.

## Changes
We may update these Terms. Material changes will be communicated when appropriate. Continued use after the effective date constitutes acceptance of the updated Terms.

## Contact
Questions about these Terms can be sent to the email below.`,
    },
    tr: {
      title: "Kullanım Şartları",
      last_updated: "26 Temmuz 2026",
      summary: "Bu şartlar; çalışma planlama, yapay zekâ, takvim, iletişim ve abonelik özellikleri dahil OnPace’e erişimi ve kullanımı düzenler.",
      contact_email: CONTACT_EMAIL,
      content: `## Kabul
Hesap oluşturarak veya OnPace’i kullanarak bu Şartları ve Gizlilik Politikamızı kabul edersiniz. Kabul etmiyorsanız hizmeti kullanmayın.

## Uygunluk ve hesaplar
Doğru bilgi vermeli ve giriş bilgilerinizi güvenli tutmalısınız. Hesabınızdaki faaliyetlerden siz sorumlusunuz. Yerel mevzuat ebeveyn veya vasi izni gerektiriyorsa OnPace yalnızca bu izin sağlandıktan sonra kullanılabilir.

## Hizmet
OnPace çalışma planlama, görev yönetimi, notlar, odak araçları, AI desteği, takvim senkronizasyonu, çalışma grupları ve ilgili özellikler sunar. Özellikler değişebilir, plana göre sınırlandırılabilir, bakıma alınabilir veya kaldırılabilir.

## Yapay zekâ
AI çıktıları eksik, hatalı veya uygunsuz olabilir. Bunlar çalışma desteğidir; profesyonel, tıbbi, hukuki veya mali tavsiye değildir. Çıktıları kullanmadan veya takvime eklemeden önce kontrol etmek sizin sorumluluğunuzdadır.

## Kullanıcı içeriği
Gönderdiğiniz içeriğin mülkiyeti size aittir. OnPace’e yalnızca talep edilen özellikleri işletmek için içeriği barındırma, işleme, dönüştürme ve aktarma konusunda sınırlı izin verirsiniz. Yüklediğiniz içerik üzerinde gerekli haklara sahip olmalısınız.

## Kabul edilebilir kullanım
Hizmeti kötüye kullanamaz, güvenliğe müdahale edemez, yetkisiz erişim deneyemez, veri kazıyamaz, zararlı yazılım dağıtamaz, başkalarını taciz edemez, hakları ihlal edemez, yasa dışı içerik yükleyemez veya AI ve e-posta sistemlerini kötüye kullanamazsınız.

## Bağlı hizmetler
Google Takvim ve diğer entegrasyonlar kendi koşullarına tabidir. OnPace’in bağlı hizmetlerde talep ettiğiniz işlemleri gerçekleştirmesine izin verirsiniz. Erişimi kaldırabilirsiniz; daha önce senkronize edilen değişiklikler bağlı hizmette kalabilir.

## Planlar, ödemeler ve denemeler
Ücretli özellikler, fiyatlar, faturalandırma dönemleri, promosyonlar ve deneme koşulları satın alma öncesinde gösterilir. Ödemeler üçüncü taraf sağlayıcı tarafından işlenebilir. Kanun gerektirmedikçe veya aksi belirtilmedikçe ödenmiş ücretler iade edilmez.

## Kullanılabilirlik ve bakım
Güvenilir hizmet sunmayı hedefleriz ancak kesintisiz erişim garanti etmeyiz. Planlı veya acil bakım, sağlayıcı kesintileri, güvenlik olayları ve ürün güncellemeleri erişimi geçici olarak kısıtlayabilir.

## Askıya alma ve sonlandırma
İhlal, güvenlik riski, dolandırıcılık, ödeme yapılmaması, yasal zorunluluk veya kullanıcı ya da hizmete zarar verilmesi halinde erişim kısıtlanabilir veya sonlandırılabilir.

## Fikri mülkiyet
OnPace yazılımı, tasarımı, markası ve özgün materyalleri fikri mülkiyet mevzuatıyla korunur. Bu Şartlar OnPace teknolojisi veya markaları üzerinde mülkiyet sağlamaz.

## Sorumluluk reddi ve sınırı
Hizmet, kanunun izin verdiği ölçüde “mevcut olduğu haliyle” sunulur. Dolaylı zararlar, kayıp çalışma ilerlemesi, kaçırılan etkinlikler, AI hataları, üçüncü taraf hizmetleri veya makul kontrol dışındaki durumlardan sorumluluk kabul edilmez.

## Değişiklikler
Bu Şartlar güncellenebilir. Önemli değişiklikler uygun şekilde duyurulur. Yürürlük tarihinden sonra kullanıma devam etmek güncellenen Şartların kabulü anlamına gelir.

## İletişim
Bu Şartlarla ilgili sorular aşağıdaki e-posta adresine gönderilebilir.`,
    },
    es: {
      title: "Términos de Servicio",
      last_updated: "26 de julio de 2026",
      summary: "Estos términos regulan el acceso y uso de OnPace, incluidas sus funciones de planificación, IA, calendario, comunicaciones y suscripciones.",
      contact_email: CONTACT_EMAIL,
      content: `## Aceptación
Al crear una cuenta o usar OnPace, aceptas estos Términos y nuestra Política de Privacidad. Si no estás de acuerdo, no utilices el servicio.

## Requisitos y cuentas
Debes proporcionar información correcta y mantener seguras tus credenciales. Eres responsable de la actividad de tu cuenta. Cuando la ley exija consentimiento parental o del tutor, solo podrás utilizar OnPace después de obtenerlo.

## El servicio
OnPace ofrece planificación de estudio, tareas, notas, herramientas de concentración, asistencia de IA, sincronización de calendarios, grupos de estudio y funciones relacionadas. Las funciones pueden cambiar, limitarse según el plan, entrar en mantenimiento o retirarse.

## Inteligencia artificial
Los resultados de IA pueden ser incompletos o incorrectos. Son ayudas de estudio y no asesoramiento profesional, médico, legal o financiero. Debes revisar los resultados antes de utilizarlos.

## Contenido del usuario
Conservas la propiedad de tu contenido. Otorgas a OnPace un permiso limitado para alojarlo, procesarlo, transformarlo y transmitirlo únicamente para prestar las funciones solicitadas.

## Uso aceptable
No debes vulnerar la seguridad, intentar acceso no autorizado, extraer datos, distribuir malware, acosar, infringir derechos, subir contenido ilegal, abusar de sistemas de IA o correo ni utilizar OnPace para incumplir normas académicas.

## Servicios conectados
Google Calendar y otras integraciones se rigen por sus propios términos. Autorizas a OnPace a realizar las acciones solicitadas. Puedes revocar el acceso, aunque los cambios ya sincronizados pueden permanecer.

## Planes y pagos
Las funciones de pago, precios, periodos, promociones y pruebas se muestran antes de comprar. Un proveedor externo puede procesar el pago. Salvo obligación legal o indicación contraria, los importes pagados no son reembolsables.

## Disponibilidad y mantenimiento
No garantizamos disponibilidad ininterrumpida. El mantenimiento, fallos de proveedores, eventos de seguridad y actualizaciones pueden limitar temporalmente el acceso.

## Suspensión y terminación
Podemos restringir o terminar el acceso por incumplimientos, riesgos de seguridad, fraude, impago, requisitos legales o daños al servicio o a otros usuarios.

## Propiedad intelectual
El software, diseño, marca y materiales originales de OnPace están protegidos. Estos Términos no conceden propiedad sobre la tecnología ni las marcas de OnPace.

## Exclusión y limitación de responsabilidad
El servicio se ofrece “según disponibilidad” dentro de lo permitido por la ley. OnPace no responde por pérdidas indirectas, progreso perdido, eventos omitidos, errores de IA, servicios de terceros o circunstancias fuera de control razonable.

## Cambios
Podemos actualizar estos Términos. Los cambios importantes se comunicarán cuando corresponda. El uso continuado implica aceptación.

## Contacto
Las preguntas sobre estos Términos pueden enviarse al correo indicado abajo.`,
    },
    zh: {
      title: "服务条款",
      last_updated: "2026年7月26日",
      summary: "本条款适用于 OnPace 的访问和使用，包括学习计划、AI、日历、通信和订阅功能。",
      contact_email: CONTACT_EMAIL,
      content: `## 接受条款
创建账户或使用 OnPace 即表示您同意本条款和隐私政策。如不同意，请勿使用本服务。

## 资格与账户
您必须提供准确信息并妥善保管登录凭据。您应对账户内的活动负责。如果当地法律要求父母或监护人同意，必须在获得同意后使用。

## 服务内容
OnPace 提供学习计划、任务管理、笔记、专注工具、AI 辅助、日历同步、学习小组等功能。功能可能发生变化、受套餐限制、进入维护或停止提供。

## 人工智能
AI 输出可能不完整、不准确或不适用，仅作为学习辅助，不构成专业、医疗、法律或财务建议。使用或加入日程前，您有责任进行核对。

## 用户内容
您保留所提交内容的所有权。您授予 OnPace 仅为提供所请求功能而托管、处理、转换和传输内容的有限许可。您必须拥有上传内容的权利。

## 可接受使用
不得破坏安全、尝试未经授权的访问、抓取数据、传播恶意软件、骚扰他人、侵犯权利、上传非法内容、滥用 AI 或邮件系统，或违反学术规则作弊。

## 关联服务
Google 日历及其他集成受其各自条款约束。您授权 OnPace 执行请求的操作。撤销访问后，已同步的更改仍可能保留在关联服务中。

## 套餐、付款和试用
付费功能、价格、计费周期、促销和试用条件会在购买前展示。付款可能由第三方处理。除法律要求或另有说明外，已支付费用不予退还。

## 可用性和维护
我们努力提供可靠服务，但不保证持续可用。计划或紧急维护、服务商中断、安全事件和产品更新可能暂时限制访问。

## 暂停与终止
如发生违规、安全风险、欺诈、未付款、法律要求或损害用户或服务的行为，我们可能限制或终止访问。

## 知识产权
OnPace 的软件、设计、品牌和原创材料受知识产权法律保护。本条款不授予 OnPace 技术或商标的所有权。

## 免责声明和责任限制
在法律允许范围内，服务按“可用状态”提供。OnPace 不对间接损失、学习进度损失、错过事件、AI 错误、第三方服务或合理控制之外的情况负责。

## 条款变更
我们可能更新本条款。重大变更会适当通知。生效后继续使用即表示接受更新条款。

## 联系方式
有关本条款的问题可发送至下方电子邮件。`,
    },
  },
};

export function normalizeLegalDocuments(value: unknown): LegalDocuments {
  const source =
    value && typeof value === "object"
      ? value as Partial<LegalDocuments>
      : {};
  const result = structuredClone(DEFAULT_LEGAL_DOCUMENTS);
  for (const documentType of ["privacy", "terms"] as LegalDocumentType[]) {
    for (const language of ["en", "tr", "es", "zh"] as LegalLanguage[]) {
      const incoming = source[documentType]?.[language];
      if (!incoming || typeof incoming !== "object") continue;
      result[documentType][language] = {
        title: typeof incoming.title === "string" ? incoming.title : result[documentType][language].title,
        last_updated: typeof incoming.last_updated === "string" ? incoming.last_updated : result[documentType][language].last_updated,
        summary: typeof incoming.summary === "string" ? incoming.summary : result[documentType][language].summary,
        content: typeof incoming.content === "string" ? incoming.content : result[documentType][language].content,
        contact_email: typeof incoming.contact_email === "string" ? incoming.contact_email : result[documentType][language].contact_email,
      };
    }
  }
  return result;
}
