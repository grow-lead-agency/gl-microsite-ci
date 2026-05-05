import type { CheckResult } from "../scripts/report.ts";
import { loadPages } from "./_shared.ts";

const MIN = 30;
const MAX = 60;

export async function checkMetaTitles(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  if (pages.length === 0) {
    return {
      id: "meta-titles",
      label: "Meta titles",
      tier: 1,
      status: "fail",
      detail: "no HTML pages found in dist/",
      errors: [`Expected .html files in ${distDir} — did you run \`bun run build\`?`],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const titles = new Map<string, string[]>();

  for (const page of pages) {
    const titleEl = page.doc.querySelector("title");
    const title = titleEl?.text?.trim() ?? "";

    if (!title) {
      errors.push(`${page.filePath}: missing <title>`);
      continue;
    }

    if (title.length < MIN) {
      warnings.push(`${page.filePath}: title too short (${title.length}c, need ≥${MIN}): "${title}"`);
    } else if (title.length > MAX) {
      warnings.push(`${page.filePath}: title too long (${title.length}c, max ${MAX}): "${title}"`);
    }

    const existing = titles.get(title) ?? [];
    existing.push(page.filePath);
    titles.set(title, existing);
  }

  for (const [title, files] of titles) {
    if (files.length > 1) {
      errors.push(`Duplicate title "${title}" used on: ${files.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    return {
      id: "meta-titles",
      label: "Meta titles",
      tier: 1,
      status: "fail",
      detail: `${errors.length} issue(s) in ${pages.length} pages`,
      errors,
      warnings,
    };
  }

  if (warnings.length > 0) {
    return {
      id: "meta-titles",
      label: "Meta titles",
      tier: 1,
      status: "warn",
      detail: `${pages.length}/${pages.length} present + unique, ${warnings.length} length warning(s)`,
      warnings,
    };
  }

  return {
    id: "meta-titles",
    label: "Meta titles",
    tier: 1,
    status: "pass",
    detail: `${pages.length}/${pages.length} unique, all ${MIN}–${MAX} chars`,
  };
}
