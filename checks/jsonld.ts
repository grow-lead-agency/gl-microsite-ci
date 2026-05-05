import type { CheckResult } from "../scripts/report.ts";
import { loadPages } from "./_shared.ts";

/**
 * JSON-LD validity: every <script type="application/ld+json"> must be valid JSON
 * and contain @context + @type (either at root or inside @graph nodes).
 */
export async function checkJsonLd(distDir: string): Promise<CheckResult> {
  const pages = await loadPages(distDir);
  const errors: string[] = [];
  const types = new Set<string>();
  let totalBlocks = 0;
  let pagesWithLd = 0;

  for (const page of pages) {
    const scripts = page.doc.querySelectorAll('script[type="application/ld+json"]');
    if (scripts.length > 0) pagesWithLd++;
    for (const s of scripts) {
      totalBlocks++;
      const raw = s.text || s.innerHTML || "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        errors.push(`${page.filePath}: invalid JSON-LD — ${(e as Error).message}`);
        continue;
      }
      const validateNode = (node: unknown, where: string): void => {
        if (node === null || typeof node !== "object") {
          errors.push(`${where}: JSON-LD node is not an object`);
          return;
        }
        const obj = node as Record<string, unknown>;
        if (Array.isArray(obj["@graph"])) {
          if (!obj["@context"]) {
            errors.push(`${where}: missing @context on root with @graph`);
          }
          for (const [i, sub] of (obj["@graph"] as unknown[]).entries()) {
            validateNode(sub, `${where}#@graph[${i}]`);
          }
          return;
        }
        if (!obj["@context"] && !obj["@type"]) {
          errors.push(`${where}: missing both @context and @type`);
          return;
        }
        if (!obj["@type"]) {
          errors.push(`${where}: missing @type`);
        } else {
          const t = obj["@type"];
          if (typeof t === "string") types.add(t);
          else if (Array.isArray(t)) for (const tt of t) if (typeof tt === "string") types.add(tt);
        }
      };
      if (Array.isArray(parsed)) {
        for (const [i, node] of parsed.entries()) {
          validateNode(node, `${page.filePath}[${i}]`);
        }
      } else {
        validateNode(parsed, page.filePath);
      }
    }
  }

  if (errors.length > 0) {
    return {
      id: "jsonld",
      label: "JSON-LD valid",
      tier: 2,
      status: "fail",
      detail: `${errors.length} issue(s) in ${totalBlocks} block(s)`,
      errors,
    };
  }

  if (totalBlocks === 0) {
    return {
      id: "jsonld",
      label: "JSON-LD valid",
      tier: 2,
      status: "warn",
      detail: "no JSON-LD found (recommended for SEO)",
    };
  }

  return {
    id: "jsonld",
    label: "JSON-LD valid",
    tier: 2,
    status: "pass",
    detail: `${totalBlocks} block(s), ${pagesWithLd} page(s), types: ${[...types].sort().join(", ") || "(none)"}`,
  };
}
