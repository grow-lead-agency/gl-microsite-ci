import { join } from "node:path";
import { stat } from "node:fs/promises";
import type { CheckResult } from "../scripts/report.ts";
import { loadPages } from "./_shared.ts";

/**
 * Internal link integrity: every href starting with "/" must resolve to a real
 * page or asset under dist/.
 */
export async function checkInternalLinks(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  const errors: string[] = [];
  let totalLinks = 0;
  const checked = new Map<string, boolean>();

  const resolveTarget = async (href: string): Promise<boolean> => {
    if (checked.has(href)) return checked.get(href)!;
    // strip query/hash
    let clean = href.split("#")[0].split("?")[0];
    if (clean === "") {
      checked.set(href, true);
      return true;
    }

    const tryPaths: string[] = [];
    if (clean.endsWith("/")) {
      tryPaths.push(join(distDir, clean, "index.html"));
    } else if (/\.[a-z0-9]+$/i.test(clean)) {
      tryPaths.push(join(distDir, clean));
    } else {
      tryPaths.push(join(distDir, clean + ".html"));
      tryPaths.push(join(distDir, clean, "index.html"));
    }

    for (const p of tryPaths) {
      try {
        const s = await stat(p);
        if (s.isFile()) {
          checked.set(href, true);
          return true;
        }
      } catch {
        /* try next */
      }
    }
    checked.set(href, false);
    return false;
  };

  for (const page of pages) {
    const anchors = page.doc.querySelectorAll("a[href]");
    for (const a of anchors) {
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/")) continue; // external or relative
      if (href.startsWith("//")) continue; // protocol-relative
      totalLinks++;
      const ok = await resolveTarget(href);
      if (!ok) {
        errors.push(`${page.filePath} → ${href} (not found in dist/)`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      id: "internal-links",
      label: "Internal links",
      tier: 2,
      status: "fail",
      detail: `${errors.length} broken / ${totalLinks} total`,
      errors,
    };
  }

  return {
    id: "internal-links",
    label: "Internal links",
    tier: 2,
    status: "pass",
    detail: `${totalLinks}/${totalLinks} valid`,
  };
}
