export type SortableTask = {
  dueDate?: string | null;
  priority?: string | null;
  createdAt?: string | null;
};

const priorityRank: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function calendarDayValue(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function createdAtValue(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function compareTasksByDueDateThenPriority(first: SortableTask, second: SortableTask) {
  const firstDue = calendarDayValue(first.dueDate);
  const secondDue = calendarDayValue(second.dueDate);
  if (firstDue !== secondDue) return firstDue - secondDue;

  const priorityDifference = (priorityRank[first.priority || ""] ?? 1) - (priorityRank[second.priority || ""] ?? 1);
  if (priorityDifference !== 0) return priorityDifference;

  return createdAtValue(first.createdAt) - createdAtValue(second.createdAt);
}
