const labels: Record<string, Record<string, string>> = {
  "AP Calculus": { tr: "AP Matematik", es: "Cálculo AP", zh: "AP 微积分" },
  "AP Chemistry": { tr: "AP Kimya", es: "Química AP", zh: "AP 化学" },
  "AP Biology": { tr: "AP Biyoloji", es: "Biología AP", zh: "AP 生物学" },
  "AP Physics": { tr: "AP Fizik", es: "Física AP", zh: "AP 物理" },
  "AP US History": { tr: "AP ABD Tarihi", es: "Historia de EE. UU. AP", zh: "AP 美国历史" },
  "English Literature": { tr: "İngiliz Edebiyatı", es: "Literatura inglesa", zh: "英语文学" },
  "SAT Math Prep": { tr: "SAT Matematik Hazırlık", es: "Preparación de Matemáticas SAT", zh: "SAT 数学备考" },
  "SAT Reading Prep": { tr: "SAT Okuma Hazırlık", es: "Preparación de Lectura SAT", zh: "SAT 阅读备考" },
  Mathematics: { tr: "Matematik", es: "Matemáticas", zh: "数学" },
  English: { tr: "İngilizce", es: "Inglés", zh: "英语" },
  Science: { tr: "Fen Bilimleri", es: "Ciencias", zh: "科学" },
  Social: { tr: "Sosyal Bilimler", es: "Ciencias sociales", zh: "社会科学" },
};

export function getLocalizedCourseName(name: string, language: string) {
  return labels[name]?.[language] || name;
}
