export function formatBugReportTrackingNumber(reportId: string | null | undefined) {
  const compactId = String(reportId || "").replace(/-/g, "").slice(0, 10).toUpperCase();
  return compactId ? `OP-${compactId}` : "OP-PENDING";
}

