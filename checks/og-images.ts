import { join } from "node:path";
import { stat } from "node:fs/promises";
import type { CheckResult } from "../scripts/report.ts";
import { loadPages, getMeta } from "./_shared.ts";

/**
 * OG image check: every page declaring og:image must reference a file that
 * exists in dist/ (if relative or matches site base URL).
 * External absolute URLs are skipped — we don't make HTTP calls during build.
 */
export async function checkOgImages(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  const errors: string[] = [];
  const warnings: string[] = [];
  let total = 0;
  let local = 0;
  let external = 0;

  for (const page of pages) {
    const og = getMeta(page.doc, "og:image");
    if (!og) {
      warnings.push(`${page.filePath}: no og:image declared`);
      continue;
    }
    total++;

    if (/^https?:\/\//i.test(og)) {
      external++;
      // Try to extract path if it's on the same site (best effort)
      try {
        const url = new URL(og);
        // assume same-origin og:images map to dist root
        const local = join(distDir, url.pathname);
        try {
          await stat(local);
          continue;
        } catch {
          // if path looks like a generated OG (e.g. /og/foo.png), warn
          if (url.pathname.startsWith("/og/") || url.pathname.includes("/og-")) {
            errors.push(`${page.filePath}: og:image "${og}" not found in dist/`);
          }
          // else assume it's a third-party CDN OG and skip
        }
      } catch {
        errors.push(`${page.filePath}: og:image "${og}" is not a valid URL`);
      }
    } else {
      local++;
      const path = join(distDir, og);
      try {
        await stat(path);
      } catch {
        errors.push(`${page.filePath}: og:image "${og}" not found in dist/`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      id: "og-images",
      label: "OG images",
      tier: 2,
      status: "fail",
      detail: `${errors.length} unresolved / ${total} declared`,
      errors,
      warnings,
    };
  }

  if (total === 0) {
    return {
      id: "og-images",
      label: "OG images",
      tier: 2,
      status: "warn",
      detail: "no og:image declared on any page",
    };
  }

  return {
    id: "og-images",
    label: "OG images",
    tier: 2,
    status: "pass",
    detail: `${total} declared (${local} local + ${external} external/CDN)`,
  };
}
