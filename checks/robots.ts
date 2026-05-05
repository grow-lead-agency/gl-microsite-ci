import { join } from "node:path";
import type { CheckResult } from "../scripts/report.ts";
import { readFileSafe } from "./_shared.ts";

/**
 * robots.txt syntax check:
 *  - file exists
 *  - has at least one User-agent directive
 *  - Sitemap line declares an absolute URL
 *  - no syntax errors (unrecognized directives warn-only)
 */
export async function checkRobots(distDir: string): Promise<CheckResult> {
  const path = join(distDir, "robots.txt");
  const raw = await readFileSafe(path);

  if (raw === null) {
    return {
      id: "robots",
      label: "robots.txt",
      tier: 1,
      status: "fail",
      detail: "robots.txt missing",
      errors: [`Expected ${path}. Add public/robots.txt or generate via Astro integration.`],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = raw.split("\n").map((l) => l.trim());

  let hasUserAgent = false;
  let hasSitemap = false;
  const knownDirectives = new Set([
    "user-agent",
    "allow",
    "disallow",
    "sitemap",
    "crawl-delay",
    "host",
  ]);

  let userAgentBlocksDisallowingAll = 0;
  let userAgentBlocks = 0;
  let currentBlockBlocksAll = false;
  let inBlock = false;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      errors.push(`malformed line (no colon): "${line}"`);
      continue;
    }
    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (!knownDirectives.has(directive)) {
      warnings.push(`unknown directive "${directive}"`);
    }

    if (directive === "user-agent") {
      if (inBlock && currentBlockBlocksAll) userAgentBlocksDisallowingAll++;
      userAgentBlocks++;
      inBlock = true;
      currentBlockBlocksAll = false;
      hasUserAgent = true;
    }

    if (directive === "disallow" && value === "/") {
      currentBlockBlocksAll = true;
    }

    if (directive === "sitemap") {
      hasSitemap = true;
      if (!/^https?:\/\//i.test(value)) {
        errors.push(`Sitemap URL must be absolute: "${value}"`);
      }
    }
  }
  if (inBlock && currentBlockBlocksAll) userAgentBlocksDisallowingAll++;

  if (!hasUserAgent) {
    errors.push("no User-agent directive found");
  }
  if (!hasSitemap) {
    warnings.push("no Sitemap directive (recommended for crawlers)");
  }
  if (userAgentBlocks > 0 && userAgentBlocksDisallowingAll === userAgentBlocks) {
    errors.push("ALL user-agent blocks disallow / — site is fully blocked from crawling");
  }

  if (errors.length > 0) {
    return {
      id: "robots",
      label: "robots.txt",
      tier: 1,
      status: "fail",
      detail: `${errors.length} error(s)`,
      errors,
      warnings,
    };
  }
  if (warnings.length > 0) {
    return {
      id: "robots",
      label: "robots.txt",
      tier: 1,
      status: "warn",
      detail: `${userAgentBlocks} UA block(s), ${warnings.length} warning(s)`,
      warnings,
    };
  }
  return {
    id: "robots",
    label: "robots.txt",
    tier: 1,
    status: "pass",
    detail: `${userAgentBlocks} UA block(s), Sitemap present`,
  };
}
