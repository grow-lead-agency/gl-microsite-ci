import type { CheckResult } from "../scripts/report.ts";
import { loadPages } from "./_shared.ts";

export async function checkImageAlts(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  const errors: string[] = [];
  let total = 0;

  for (const page of pages) {
    const imgs = page.doc.querySelectorAll("img");
    for (const img of imgs) {
      total++;
      const alt = img.getAttribute("alt");
      const role = img.getAttribute("role");
      const ariaHidden = img.getAttribute("aria-hidden");

      // alt="" is OK if image is decorative AND marked aria-hidden / role=presentation
      if (alt === null || alt === undefined) {
        const src = img.getAttribute("src") ?? "(no src)";
        errors.push(`${page.filePath}: <img src="${src}"> missing alt attribute`);
      } else if (alt.trim() === "" && role !== "presentation" && ariaHidden !== "true") {
        const src = img.getAttribute("src") ?? "(no src)";
        errors.push(
          `${page.filePath}: <img src="${src}"> empty alt without role="presentation" or aria-hidden="true"`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return {
      id: "image-alts",
      label: "Image alt attributes",
      tier: 2,
      status: "fail",
      detail: `${errors.length} missing / ${total} images`,
      errors,
    };
  }

  return {
    id: "image-alts",
    label: "Image alt attributes",
    tier: 2,
    status: "pass",
    detail: `${total}/${total} have alt`,
  };
}
