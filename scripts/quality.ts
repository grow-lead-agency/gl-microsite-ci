#!/usr/bin/env bun
/**
 * gl-quality — entrypoint for all 14 microsite quality checks.
 *
 * Usage:
 *   bun run quality                    # default: dist/, project root
 *   bun run quality --dist=out         # custom dist
 *   bun run quality --project=.        # project root (for env/i18n parity)
 *   bun run quality --json=report.json # write JSON report
 *   bun run quality --md=comment.md    # write markdown report (for PR comment)
 *   bun run quality --quiet            # suppress terminal output
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  aggregate,
  renderTerminal,
  renderMarkdown,
  renderJson,
  type CheckResult,
} from "./report.ts";

import { checkSitemap } from "../checks/sitemap.ts";
import { checkMetaTitles } from "../checks/meta-titles.ts";
import { checkMetaDescriptions } from "../checks/meta-descriptions.ts";
import { checkEnvParity } from "../checks/env-parity.ts";
import { checkI18nParity } from "../checks/i18n-parity.ts";
import { checkInternalLinks } from "../checks/internal-links.ts";
import { checkImageAlts } from "../checks/image-alts.ts";
import { checkJsonLd } from "../checks/jsonld.ts";
import { checkCanonical } from "../checks/canonical.ts";
import { checkOgImages } from "../checks/og-images.ts";
import { checkHtmlBudget } from "../checks/html-budget.ts";
import { checkBundleBudget } from "../checks/bundle-budget.ts";
import { checkRobots } from "../checks/robots.ts";
import { checkHreflang } from "../checks/hreflang.ts";

interface Args {
  dist: string;
  project: string;
  json?: string;
  md?: string;
  quiet: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dist: "dist", project: ".", quiet: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--dist=")) args.dist = a.slice(7);
    else if (a.startsWith("--project=")) args.project = a.slice(10);
    else if (a.startsWith("--json=")) args.json = a.slice(7);
    else if (a.startsWith("--md=")) args.md = a.slice(5);
    else if (a === "--quiet") args.quiet = true;
  }
  return args;
}

async function safe<T extends CheckResult>(
  fn: () => Promise<T>,
  id: string,
  label: string,
  tier: 1 | 2,
): Promise<CheckResult> {
  try {
    return await fn();
  } catch (e) {
    return {
      id,
      label,
      tier,
      status: "fail",
      detail: "checker crashed",
      errors: [(e as Error).message ?? String(e)],
    };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const distDir = resolve(args.dist);
  const projectDir = resolve(args.project);

  const checks = await Promise.all([
    safe(() => checkSitemap(distDir), "sitemap", "Sitemap generated", 1),
    safe(() => checkMetaTitles(distDir), "meta-titles", "Meta titles", 1),
    safe(() => checkMetaDescriptions(distDir), "meta-descriptions", "Meta descriptions", 1),
    safe(() => checkEnvParity(projectDir), "env-parity", "ENV parity", 1),
    safe(() => checkI18nParity(projectDir), "i18n-parity", "i18n parity", 1),
    safe(() => checkRobots(distDir), "robots", "robots.txt", 1),
    safe(() => checkHreflang(distDir), "hreflang", "hreflang", 1),
    safe(() => checkInternalLinks(distDir), "internal-links", "Internal links", 2),
    safe(() => checkImageAlts(distDir), "image-alts", "Image alt attributes", 2),
    safe(() => checkJsonLd(distDir), "jsonld", "JSON-LD valid", 2),
    safe(() => checkCanonical(distDir), "canonical", "Canonical URLs", 2),
    safe(() => checkOgImages(distDir), "og-images", "OG images", 2),
    safe(() => checkHtmlBudget(distDir), "html-budget", "HTML size budget", 2),
    safe(() => checkBundleBudget(distDir), "bundle-budget", "Bundle budget", 2),
  ]);

  const report = aggregate(distDir, checks);

  if (!args.quiet) {
    console.log(renderTerminal(report));
  }
  if (args.json) {
    await writeFile(args.json, renderJson(report));
  }
  if (args.md) {
    await writeFile(args.md, renderMarkdown(report));
  }

  process.exit(report.blocked ? 1 : 0);
}

await main();
