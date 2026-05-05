import type { CheckResult } from "../scripts/report.ts";
import { loadPages, getMeta } from "./_shared.ts";

const MIN = 120;
const MAX = 160;

export async function checkMetaDescriptions(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  const errors: string[] = [];
  const warnings: string[] = [];
  const descs = new Map<string, string[]>();

  for (const page of pages) {
    const desc = getMeta(page.doc, "description");

    if (!desc || !desc.trim()) {
      errors.push(`${page.filePath}: missing <meta name="description">`);
      continue;
    }

    if (desc.length < MIN) {
      warnings.push(`${page.filePath}: description too short (${desc.length}c, need ≥${MIN})`);
    } else if (desc.length > MAX) {
      warnings.push(`${page.filePath}: description too long (${desc.length}c, max ${MAX})`);
    }

    const existing = descs.get(desc) ?? [];
    existing.push(page.filePath);
    descs.set(desc, existing);
  }

  for (const [desc, files] of descs) {
    if (files.length > 1) {
      errors.push(
        `Duplicate description used on ${files.length} pages: ${files.join(", ")} → "${desc.slice(0, 80)}…"`,
      );
    }
  }

  if (errors.length > 0) {
    return {
      id: "meta-descriptions",
      label: "Meta descriptions",
      tier: 1,
      status: "fail",
      detail: `${errors.length} issue(s) in ${pages.length} pages`,
      errors,
      warnings,
    };
  }

  if (warnings.length > 0) {
    return {
      id: "meta-descriptions",
      label: "Meta descriptions",
      tier: 1,
      status: "warn",
      detail: `${pages.length}/${pages.length} present + unique, ${warnings.length} length warning(s)`,
      warnings,
    };
  }

  return {
    id: "meta-descriptions",
    label: "Meta descriptions",
    tier: 1,
    status: "pass",
    detail: `${pages.length}/${pages.length} unique, all ${MIN}–${MAX} chars`,
  };
}
