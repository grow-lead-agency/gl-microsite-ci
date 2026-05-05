import { join } from "node:path";
import type { CheckResult } from "../scripts/report.ts";
import { readFileSafe } from "./_shared.ts";

export async function checkSitemap(distDir: string): Promise<CheckResult> {
  // Astro 6 sitemap integration emits sitemap-index.xml + sitemap-0.xml
  const indexPath = join(distDir, "sitemap-index.xml");
  const fallbackPath = join(distDir, "sitemap.xml");
  let xml = await readFileSafe(indexPath);
  let location = "sitemap-index.xml";
  if (!xml) {
    xml = await readFileSafe(fallbackPath);
    location = "sitemap.xml";
  }

  if (!xml) {
    return {
      id: "sitemap",
      label: "Sitemap generated",
      tier: 1,
      status: "fail",
      detail: "no sitemap found",
      errors: [
        "Expected dist/sitemap-index.xml (Astro 6 default) or dist/sitemap.xml.",
        "Add @astrojs/sitemap integration to astro.config.mjs and set `site` URL.",
      ],
    };
  }

  // Count <loc> entries (works for both index and per-locale sitemaps)
  const locCount = (xml.match(/<loc>/g) || []).length;
  if (locCount === 0) {
    return {
      id: "sitemap",
      label: "Sitemap generated",
      tier: 1,
      status: "fail",
      detail: `${location} present but contains 0 URLs`,
      errors: ["Sitemap exists but is empty — check Astro page collection."],
    };
  }

  return {
    id: "sitemap",
    label: "Sitemap generated",
    tier: 1,
    status: "pass",
    detail: `${locCount} URLs in ${location}`,
  };
}
