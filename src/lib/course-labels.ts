import { normalizeLanguage, type SupportedLanguage } from "@/lib/i18n";

type CourseDefinition = {
  aliases: string[];
  labels: Record<SupportedLanguage, string>;
};

export type CourseCatalogItem = {
  key: string;
  name: string;
  color: string;
  source: "catalog" | "exam_suggestion";
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
    aliases: ["Biology"],
    labels: { en: "Biology", tr: "Biyoloji", es: "Biología", zh: "生物学" },
  },
  {
    aliases: ["Chemistry"],
    labels: { en: "Chemistry", tr: "Kimya", es: "Química", zh: "化学" },
  },
  {
    aliases: ["Physics"],
    labels: { en: "Physics", tr: "Fizik", es: "Física", zh: "物理" },
  },
  {
    aliases: ["Politics", "Political Science"],
    labels: { en: "Politics", tr: "Siyaset Bilimi", es: "Política", zh: "政治学" },
  },
  {
    aliases: ["SAT"],
    labels: { en: "SAT", tr: "SAT", es: "SAT", zh: "SAT" },
  },
  {
    aliases: ["IB Programme", "International Baccalaureate"],
    labels: { en: "IB Programme", tr: "IB Programı", es: "Programa IB", zh: "IB 课程" },
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
  "Biology",
  "Chemistry",
  "Physics",
  "Social Studies",
  "Politics",
  "Geography",
  "Music",
  "Other Languages",
  "Other Courses",
] as const;

const catalogColors = ["#4F46E5", "#06B6D4", "#10B981", "#EF4444", "#F59E0B", "#EC4899", "#8B5CF6"];

const countryExamSuggestions: Record<string, string[]> = {
  TR: ["YKS", "TYT", "AYT", "LGS"],
  US: ["SAT", "ACT", "AP Calculus", "AP Biology", "AP Chemistry", "AP Physics", "AP US History"],
  GB: ["GCSE", "A-Level"],
  CA: ["SAT", "AP Biology", "AP Chemistry", "AP Physics"],
  AU: ["ATAR"],
  DE: ["Abitur"],
  FR: ["Baccalauréat"],
  ES: ["EBAU / Selectividad"],
  CN: ["Gaokao"],
  JP: ["Common Test for University Admissions"],
  KR: ["CSAT / Suneung"],
  IN: ["JEE", "NEET"],
  PK: ["MDCAT", "ECAT"],
  BR: ["ENEM"],
  MX: ["EXANI-II"],
  SG: ["GCE O-Level", "GCE A-Level"],
};

function catalogKey(name: string) {
  return name.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function getSuggestedCourseCatalog(country?: string | null): CourseCatalogItem[] {
  const examNames = country ? countryExamSuggestions[country.toUpperCase()] || [] : [];
  const generalNames = [...suggestedCourseNames, "IB Programme"];
  return [...examNames, ...generalNames].map((name, index) => ({
    key: catalogKey(name),
    name,
    color: catalogColors[index % catalogColors.length],
    source: examNames.includes(name) ? "exam_suggestion" : "catalog",
  }));
}

export function isCatalogCourseName(name: string) {
  const normalized = normalizeCourseAlias(name);
  return getSuggestedCourseCatalog(null).some((item) => normalizeCourseAlias(item.name) === normalized)
    || Object.values(countryExamSuggestions).flat().some((item) => normalizeCourseAlias(item) === normalized);
}
