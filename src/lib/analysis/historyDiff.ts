import type { WebsiteAudit, HistoryDiffReport } from "../../types";

export function compareAudits(prev: WebsiteAudit, curr: WebsiteAudit): HistoryDiffReport {
  // Score shifts
  const scoreChange = {
    overall: curr.overall_score - prev.overall_score,
    seo: curr.seo_score - prev.seo_score,
    accessibility: curr.accessibility_score - prev.accessibility_score,
    security: curr.security_score - prev.security_score,
    content: curr.content_score - prev.content_score,
    performance: (curr.performance_score !== null && prev.performance_score !== null)
      ? curr.performance_score - prev.performance_score
      : 0,
  };

  const regressions: HistoryDiffReport["regressions"] = [];
  const improvements: HistoryDiffReport["improvements"] = [];

  // Match checks in audit_data.breakdown
  const prevChecks = prev.audit_data?.breakdown || [];
  const currChecks = curr.audit_data?.breakdown || [];

  const prevMap = new Map<string, typeof prevChecks[number]>();
  for (const c of prevChecks) {
    prevMap.set(c.check, c);
  }

  for (const currCheck of currChecks) {
    const prevCheck = prevMap.get(currCheck.check);
    if (!prevCheck) continue;

    // Check status changes
    const prevPassed = prevCheck.status === "passed";
    const currPassed = currCheck.status === "passed";

    if (prevPassed && !currPassed) {
      // Regressed!
      regressions.push({
        category: currCheck.category,
        message: `Regression: "${currCheck.check}" went from Passed to ${currCheck.status.toUpperCase()}. Impact: ${currCheck.impact}`,
        severity: currCheck.status === "failed" ? "high" : "medium",
      });
    } else if (!prevPassed && currPassed) {
      // Improved!
      improvements.push({
        category: currCheck.category,
        message: `Resolved: "${currCheck.check}" is now passing. ${currCheck.opportunity || ""}`,
        severity: "low",
      });
    }
  }

  // Meta Changes
  const prevParsed = prev.audit_data?.parsed;
  const currParsed = curr.audit_data?.parsed;

  const titleChanged = prevParsed?.title !== currParsed?.title;
  const descChanged = prevParsed?.metaDescription !== currParsed?.metaDescription;

  return {
    scoreChange,
    regressions,
    improvements,
    metaChanges: {
      titleChanged,
      prevTitle: prevParsed?.title || null,
      currTitle: currParsed?.title || null,
      descChanged,
      prevDesc: prevParsed?.metaDescription || null,
      currDesc: currParsed?.metaDescription || null,
    },
  };
}
