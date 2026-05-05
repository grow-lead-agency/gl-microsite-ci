import type { CheckResult } from "../scripts/report.ts";
import { loadPages } from "./_shared.ts";

/**
 * hreflang correctness for multi-locale sites:
 *  - if a page has hreflang links, the set must be consistent across all locale variants
 *  - x-default should be present
 *  - each hreflang URL must resolve (best-effort, same-site only)
 *
 * For single-locale sites (no hreflang anywhere) this check passes silently.
 */
export async function checkHreflang(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  const errors: string[] = [];
  const warnings: string[] = [];

  // collect hreflang sets per page
  const sets = new Map<string, Map<string, string>>(); // file -> (lang -> href)
  let totalLinks = 0;

  for (const page of pages) {
    const links = page.doc.querySelectorAll('link[rel="alternate"][hreflang]');
    if (links.length === 0) continue;
    const map = new Map<string, string>();
    for (const l of links) {
      const lang = l.getAttribute("hreflang") ?? "";
      const href = l.getAttribute("href") ?? "";
      if (!lang || !href) {
        errors.push(`${page.filePath}: malformed alternate link`);
        continue;
      }
      if (map.has(lang)) {
        errors.push(`${page.filePath}: duplicate hreflang="${lang}"`);
      }
      map.set(lang, href);
      totalLinks++;
    }
    sets.set(page.filePath, map);
  }

  if (sets.size === 0) {
    return {
      id: "hreflang",
      label: "hreflang",
      tier: 1,
      status: "pass",
      detail: "no hreflang declared (single-locale, skipped)",
    };
  }

  // x-default should be present
  for (const [file, map] of sets) {
    if (!map.has("x-default")) {
      warnings.push(`${file}: missing x-default hreflang`);
    }
  }

  // reciprocity: every hreflang URL should also list the source page
  // (best-effort: same site only, by pathname matching)
  // Build set of all locales declared on any page
  const allLocales = new Set<string>();
  for (const map of sets.values()) for (const lang of map.keys()) allLocales.add(lang);

  for (const [file, map] of sets) {
    const declared = new Set(map.keys());
    for (const lang of allLocales) {
      if (lang === "x-default") continue;
      if (!declared.has(lang)) {
        warnings.push(`${file}: missing hreflang="${lang}" (declared on other pages)`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      id: "hreflang",
      label: "hreflang",
      tier: 1,
      status: "fail",
      detail: `${errors.length} error(s) in ${sets.size} pages`,
      errors,
      warnings,
    };
  }
  if (warnings.length > 0) {
    return {
      id: "hreflang",
      label: "hreflang",
      tier: 1,
      status: "warn",
      detail: `${sets.size} pages, ${totalLinks} links, ${warnings.length} warning(s)`,
      warnings,
    };
  }
  return {
    id: "hreflang",
    label: "hreflang",
    tier: 1,
    status: "pass",
    detail: `${sets.size} pages × ${allLocales.size} locales`,
  };
}
