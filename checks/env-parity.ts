import { join } from "node:path";
import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import type { CheckResult } from "../scripts/report.ts";
import { readFileSafe } from "./_shared.ts";

/**
 * Bidirectional parity check between .env.example and code usage.
 * Detects:
 *  - vars used in code but missing from .env.example (build-time risk)
 *  - vars in .env.example unused in code (drift / dead config)
 *
 * Scans src/**\/*.{ts,tsx,js,astro,mjs} for `process.env.X` and `import.meta.env.X`.
 */
export async function checkEnvParity(projectRoot: string): Promise<CheckResult> {
  const examplePath = join(projectRoot, ".env.example");
  const example = await readFileSafe(examplePath);

  if (example === null) {
    // No .env.example = no parity to check. Pass with note (some templates rely on wrangler.jsonc only).
    return {
      id: "env-parity",
      label: "ENV parity",
      tier: 1,
      status: "pass",
      detail: "no .env.example (skipped)",
    };
  }

  const declared = new Set<string>();
  for (const rawLine of example.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/i);
    if (m) declared.add(m[1]);
  }

  const files = await fg(["src/**/*.{ts,tsx,js,jsx,astro,mjs}", "scripts/**/*.{ts,js,mjs}"], {
    cwd: projectRoot,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.astro/**"],
  });

  const used = new Set<string>();
  const usagePattern =
    /(?:process\.env|import\.meta\.env)\.([A-Z_][A-Z0-9_]*)/g;
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const m of content.matchAll(usagePattern)) {
      used.add(m[1]);
    }
  }

  // Built-in/framework vars that don't need to be in .env.example
  const builtins = new Set([
    "NODE_ENV",
    "MODE",
    "DEV",
    "PROD",
    "SSR",
    "BASE_URL",
    "ASSETS_PREFIX",
    "PUBLIC_URL",
    "CI",
  ]);

  const missingFromExample = [...used].filter(
    (v) => !declared.has(v) && !builtins.has(v) && !v.startsWith("PUBLIC_"),
  );
  // PUBLIC_ prefix is Astro convention for client-exposed; still should be declared but warn-only
  const missingPublic = [...used].filter(
    (v) => v.startsWith("PUBLIC_") && !declared.has(v) && !builtins.has(v),
  );
  const unusedInCode = [...declared].filter((v) => !used.has(v));

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const v of missingFromExample) {
    errors.push(`${v} — used in code but missing from .env.example`);
  }
  for (const v of missingPublic) {
    warnings.push(`${v} — public env var used but not in .env.example`);
  }
  for (const v of unusedInCode) {
    warnings.push(`${v} — declared in .env.example but unused in code`);
  }

  if (errors.length > 0) {
    return {
      id: "env-parity",
      label: "ENV parity",
      tier: 1,
      status: "fail",
      detail: `${errors.length} missing from .env.example`,
      errors,
      warnings,
    };
  }
  if (warnings.length > 0) {
    return {
      id: "env-parity",
      label: "ENV parity",
      tier: 1,
      status: "warn",
      detail: `${warnings.length} drift warning(s)`,
      warnings,
    };
  }
  return {
    id: "env-parity",
    label: "ENV parity",
    tier: 1,
    status: "pass",
    detail: `.env.example matches code (${declared.size} vars)`,
  };
}
