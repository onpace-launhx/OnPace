export type StudyVisualKind = "flow" | "timeline" | "comparison" | "concept_map" | "checklist";

export type StudyVisualItem = {
  label: string;
  detail: string;
  group?: string;
};

export type StudyVisualSpec = {
  kind: StudyVisualKind;
  title: string;
  subtitle: string;
  items: StudyVisualItem[];
  takeaway: string;
};

const visualKinds = new Set<StudyVisualKind>([
  "flow",
  "timeline",
  "comparison",
  "concept_map",
  "checklist",
]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizeStudyVisual(value: unknown): StudyVisualSpec | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const kind = visualKinds.has(source.kind as StudyVisualKind)
    ? (source.kind as StudyVisualKind)
    : "concept_map";
  const items = Array.isArray(source.items)
    ? source.items
        .slice(0, 8)
        .map((item) => {
          const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
          return {
            label: cleanText(row.label, 80),
            detail: cleanText(row.detail, 240),
            group: cleanText(row.group, 40) || undefined,
          };
        })
        .filter((item) => item.label && item.detail)
    : [];

  const title = cleanText(source.title, 120);
  if (!title || items.length < 2) return null;

  return {
    kind,
    title,
    subtitle: cleanText(source.subtitle, 180),
    items,
    takeaway: cleanText(source.takeaway, 280),
  };
}

