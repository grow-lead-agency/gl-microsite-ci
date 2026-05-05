import type { CheckResult } from "../scripts/report.ts";
import { loadPages } from "./_shared.ts";

const BUDGET_KB = 100;

export async function checkHtmlBudget(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  const errors: string[] = [];
  let max = 0;
  let maxFile = "";
  for (const page of pages) {
    const sizeKb = Buffer.byteLength(page.raw, "utf8") / 1024;
    if (sizeKb > max) {
      max = sizeKb;
      maxFile = page.filePath;
    }
    if (sizeKb > BUDGET_KB) {
      errors.push(`${page.filePath}: ${sizeKb.toFixed(1)} KB > ${BUDGET_KB} KB budget`);
    }
  }
  if (errors.length > 0) {
    return {
      id: "html-budget",
      label: "HTML size budget",
      tier: 2,
      status: "fail",
      detail: `${errors.length} page(s) exceed ${BUDGET_KB} KB`,
      errors,
    };
  }
  return {
    id: "html-budget",
    label: "HTML size budget",
    tier: 2,
    status: "pass",
    detail: `max ${max.toFixed(1)} KB / ${BUDGET_KB} KB (${maxFile})`,
  };
}
