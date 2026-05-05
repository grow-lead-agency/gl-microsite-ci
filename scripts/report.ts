/**
 * Shared report types and renderers for all quality checks.
 * Every checker returns a CheckResult; the runner aggregates into Report.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  id: string;
  label: string;
  tier: 1 | 2;
  status: CheckStatus;
  detail: string;
  errors?: string[];
  warnings?: string[];
}

export interface Report {
  timestamp: string;
  distDir: string;
  score: { passed: number; warning: number; failed: number; total: number };
  blocked: boolean;
  checks: CheckResult[];
}

const ICONS = { pass: "✅", warn: "⚠️ ", fail: "❌" } as const;

export function aggregate(distDir: string, checks: CheckResult[]): Report {
  const passed = checks.filter((c) => c.status === "pass").length;
  const warning = checks.filter((c) => c.status === "warn").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  return {
    timestamp: new Date().toISOString(),
    distDir,
    score: { passed, warning, failed, total: checks.length },
    blocked: failed > 0,
    checks,
  };
}

export function renderTerminal(report: Report): string {
  const tier1 = report.checks.filter((c) => c.tier === 1);
  const tier2 = report.checks.filter((c) => c.tier === 2);

  const lines: string[] = [];
  lines.push("");
  lines.push("🔍 GL Microsite Quality Check");
  lines.push("");

  const renderCheck = (c: CheckResult): string =>
    `  ${ICONS[c.status]} ${c.label.padEnd(28)} ${c.detail}`;

  if (tier1.length > 0) {
    lines.push("Tier 1 — Required");
    for (const c of tier1) lines.push(renderCheck(c));
    lines.push("");
  }
  if (tier2.length > 0) {
    lines.push("Tier 2 — Quality");
    for (const c of tier2) lines.push(renderCheck(c));
    lines.push("");
  }

  lines.push("─".repeat(40));
  const { passed, warning, failed, total } = report.score;
  const summary = `Score: ${passed}/${total} passed${warning > 0 ? `, ${warning} warning` : ""}${failed > 0 ? `, ${failed} failed` : ""}`;
  lines.push(summary);
  lines.push(`Build: ${report.blocked ? "❌ BLOCKED" : "✅ PASS"}`);
  lines.push("");

  // Detail errors for failed checks
  const failedChecks = report.checks.filter((c) => c.status === "fail");
  if (failedChecks.length > 0) {
    lines.push("Fix these to unblock:");
    for (const c of failedChecks) {
      if (c.errors && c.errors.length > 0) {
        for (const err of c.errors.slice(0, 10)) {
          lines.push(`  • ${err}`);
        }
        if (c.errors.length > 10) {
          lines.push(`  • … and ${c.errors.length - 10} more`);
        }
      } else {
        lines.push(`  • ${c.label}: ${c.detail}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function renderMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push("## 🔍 GL Microsite Quality Check");
  lines.push("");
  lines.push("| Check | Tier | Status | Detail |");
  lines.push("|---|---|---|---|");
  for (const c of report.checks) {
    const statusEmoji = ICONS[c.status];
    lines.push(`| ${c.label} | ${c.tier} | ${statusEmoji} | ${c.detail} |`);
  }
  lines.push("");
  const { passed, warning, failed, total } = report.score;
  lines.push(
    `**Score: ${passed}/${total} passed${warning > 0 ? `, ${warning} warning` : ""}${failed > 0 ? `, ${failed} failed` : ""}** — ${report.blocked ? "❌ BLOCKED" : "✅ PASS"}`,
  );
  lines.push("");

  const failedChecks = report.checks.filter((c) => c.status === "fail");
  if (failedChecks.length > 0) {
    lines.push("### Fix these to unblock");
    lines.push("");
    for (const c of failedChecks) {
      lines.push(`**${c.label}** — ${c.detail}`);
      if (c.errors && c.errors.length > 0) {
        for (const err of c.errors.slice(0, 20)) {
          lines.push(`- ${err}`);
        }
        if (c.errors.length > 20) {
          lines.push(`- _… and ${c.errors.length - 20} more_`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function renderJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}
