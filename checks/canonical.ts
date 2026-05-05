import type { CheckResult } from "../scripts/report.ts";
import { loadPages } from "./_shared.ts";

/**
 * Canonical URL check: every page has <link rel="canonical">, valid absolute URL,
 * and points to itself (modulo trailing slash).
 */
export async function checkCanonical(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const page of pages) {
    const link = page.doc.querySelector('link[rel="canonical"]');
    const href = link?.getAttribute("href");

    if (!link || !href) {
      errors.push(`${page.filePath}: missing <link rel="canonical">`);
      continue;
    }

    if (!/^https?:\/\//i.test(href)) {
      errors.push(`${page.filePath}: canonical "${href}" is not absolute`);
      continue;
    }

    // self-reference check (modulo trailing slash)
    let expected = page.pathname;
    if (!expected.endsWith("/") && !expected.includes(".")) expected += "/";
    const url = new URL(href);
    let actual = url.pathname;
    if (!actual.endsWith("/") && !actual.includes(".")) actual += "/";
    if (actual !== expected) {
      warnings.push(`${page.filePath}: canonical points to "${actual}", expected "${expected}"`);
    }
  }

  if (errors.length > 0) {
    return {
      id: "canonical",
      label: "Canonical URLs",
      tier: 2,
      status: "fail",
      detail: `${errors.length} issue(s) in ${pages.length} pages`,
      errors,
      warnings,
    };
  }

  if (warnings.length > 0) {
    return {
      id: "canonical",
      label: "Canonical URLs",
      tier: 2,
      status: "warn",
      detail: `${pages.length} present, ${warnings.length} not self-referencing`,
      warnings,
    };
  }

  return {
    id: "canonical",
    label: "Canonical URLs",
    tier: 2,
    status: "pass",
    detail: `${pages.length}/${pages.length} self-referencing`,
  };
}
