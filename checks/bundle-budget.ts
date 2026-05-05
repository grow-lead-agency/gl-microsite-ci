import { join } from "node:path";
import { stat } from "node:fs/promises";
import fg from "fast-glob";
import type { CheckResult } from "../scripts/report.ts";

const CSS_BUDGET_KB = 50;
const JS_BUDGET_KB = 30;

export async function checkBundleBudget(distDir: string): Promise<CheckResult> {
  // Astro emits to dist/_astro/*.css and dist/_astro/*.js by default
  const cssFiles = await fg("**/*.css", { cwd: distDir, absolute: true });
  const jsFiles = await fg("**/*.js", { cwd: distDir, absolute: true });

  let cssTotal = 0;
  for (const f of cssFiles) {
    const s = await stat(f);
    cssTotal += s.size;
  }
  let jsTotal = 0;
  for (const f of jsFiles) {
    const s = await stat(f);
    jsTotal += s.size;
  }
  const cssKb = cssTotal / 1024;
  const jsKb = jsTotal / 1024;
  const errors: string[] = [];
  if (cssKb > CSS_BUDGET_KB) {
    errors.push(`CSS total ${cssKb.toFixed(1)} KB exceeds ${CSS_BUDGET_KB} KB budget (${cssFiles.length} files)`);
  }
  if (jsKb > JS_BUDGET_KB) {
    errors.push(`JS total ${jsKb.toFixed(1)} KB exceeds ${JS_BUDGET_KB} KB budget (${jsFiles.length} files)`);
  }
  if (errors.length > 0) {
    return {
      id: "bundle-budget",
      label: "Bundle budget",
      tier: 2,
      status: "fail",
      detail: `CSS ${cssKb.toFixed(1)}/${CSS_BUDGET_KB} KB, JS ${jsKb.toFixed(1)}/${JS_BUDGET_KB} KB`,
      errors,
    };
  }
  return {
    id: "bundle-budget",
    label: "Bundle budget",
    tier: 2,
    status: "pass",
    detail: `CSS ${cssKb.toFixed(1)} KB, JS ${jsKb.toFixed(1)} KB`,
  };
}
