import { normalizeLanguage, type SupportedLanguage } from "@/lib/i18n";

type CourseDefinition = {
  aliases: string[];
  labels: Record<SupportedLanguage, string>;
};

const courseDefinitions: CourseDefinition[] = [
  {
    aliases: ["AP Calculus"],
    labels: { en: "AP Calculus", tr: "AP Matematik", es: "Cálculo AP", zh: "AP 微积分" },
  },
  {
    aliases: ["AP Chemistry"],
    labels: { en: "AP Chemistry", tr: "AP Kimya", es: "Química AP", zh: "AP 化学" },
  },
  {
    aliases: ["AP Biology"],
    labels: { en: "AP Biology", tr: "AP Biyoloji", es: "Biología AP", zh: "AP 生物学" },
  },
  {
    aliases: ["AP Physics"],
    labels: { en: "AP Physics", tr: "AP Fizik", es: "Física AP", zh: "AP 物理" },
  },
  {
    aliases: ["AP US History"],
    labels: { en: "AP US History", tr: "AP ABD Tarihi", es: "Historia de EE. UU. AP", zh: "AP 美国历史" },
  },
  {
    aliases: ["English Literature"],
    labels: { en: "English Literature", tr: "İngiliz Edebiyatı", es: "Literatura inglesa", zh: "英语文学" },
  },
  {
    aliases: ["SAT Math Prep"],
    labels: { en: "SAT Math Prep", tr: "SAT Matematik Hazırlık", es: "Preparación de Matemáticas SAT", zh: "SAT 数学备考" },
  },
  {
    aliases: ["SAT Reading Prep"],
    labels: { en: "SAT Reading Prep", tr: "SAT Okuma Hazırlık", es: "Preparación de Lectura SAT", zh: "SAT 阅读备考" },
  },
  {
    aliases: ["Mathematics", "Math", "Maths", "Matematik", "Matemáticas", "数学"],
    labels: { en: "Mathematics", tr: "Matematik", es: "Matemáticas", zh: "数学" },
  },
  {
    aliases: ["English", "İngilizce", "Inglés", "英语"],
    labels: { en: "English", tr: "İngilizce", es: "Inglés", zh: "英语" },
  },
  {
    aliases: ["Science", "Fen Bilimleri", "Ciencias", "科学"],
    labels: { en: "Science", tr: "Fen Bilimleri", es: "Ciencias", zh: "科学" },
  },
  {
    aliases: ["Social", "Social Studies", "Sosyal Bilimler", "Ciencias sociales", "社会科学"],
    labels: { en: "Social Studies", tr: "Sosyal Bilimler", es: "Ciencias sociales", zh: "社会科学" },
  },
  {
    aliases: ["Geography", "Coğrafya", "Geografía", "地理"],
    labels: { en: "Geography", tr: "Coğrafya", es: "Geografía", zh: "地理" },
  },
  {
    aliases: ["Music", "Müzik", "Música", "音乐"],
    labels: { en: "Music", tr: "Müzik", es: "Música", zh: "音乐" },
  },
  {
    aliases: ["Other Languages", "Diğer Diller", "Otros idiomas", "其他语言"],
    labels: { en: "Other Languages", tr: "Diğer Diller", es: "Otros idiomas", zh: "其他语言" },
  },
  {
    aliases: ["Other Courses", "Other", "Diğer Dersler", "Otros cursos", "其他课程"],
    labels: { en: "Other Courses", tr: "Diğer Dersler", es: "Otros cursos", zh: "其他课程" },
  },
];

function normalizeCourseAlias(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

const courseByAlias = new Map<string, CourseDefinition>();
for (const definition of courseDefinitions) {
  for (const alias of definition.aliases) {
    courseByAlias.set(normalizeCourseAlias(alias), definition);
  }
}

export function getLocalizedCourseName(name: string, language: string) {
  const definition = courseByAlias.get(normalizeCourseAlias(name));
  return definition?.labels[normalizeLanguage(language)] || name.trim();
}

export const suggestedCourseNames = [
  "Mathematics",
  "English",
  "Science",
  "Social Studies",
  "Geography",
  "Music",
  "Other Languages",
  "Other Courses",
] as const;
