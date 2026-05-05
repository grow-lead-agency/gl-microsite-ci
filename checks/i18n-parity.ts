import { join } from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import type { CheckResult } from "../scripts/report.ts";

/**
 * i18n parity: all locale JSON files must share the same key set.
 * Looks at src/locales/*.json (or src/i18n/*.json fallback).
 */
export async function checkI18nParity(projectRoot: string): Promise<CheckResult> {
  const candidates = [
    join(projectRoot, "src/locales"),
    join(projectRoot, "src/i18n"),
    join(projectRoot, "locales"),
  ];

  let dir: string | null = null;
  for (const c of candidates) {
    try {
      const s = await stat(c);
      if (s.isDirectory()) {
        dir = c;
        break;
      }
    } catch {
      /* not present */
    }
  }

  if (!dir) {
    return {
      id: "i18n-parity",
      label: "i18n parity",
      tier: 1,
      status: "pass",
      detail: "no locales directory (single-locale, skipped)",
    };
  }

  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  if (files.length < 2) {
    return {
      id: "i18n-parity",
      label: "i18n parity",
      tier: 1,
      status: "pass",
      detail: `${files.length} locale file (single-locale, skipped)`,
    };
  }

  const flatten = (obj: unknown, prefix = ""): string[] => {
    if (obj === null || typeof obj !== "object") return prefix ? [prefix] : [];
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        keys.push(...flatten(v, path));
      } else {
        keys.push(path);
      }
    }
    return keys;
  };

  const localeKeys = new Map<string, Set<string>>();
  for (const f of files) {
    const raw = await readFile(join(dir, f), "utf8");
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return {
        id: "i18n-parity",
        label: "i18n parity",
        tier: 1,
        status: "fail",
        detail: `invalid JSON in ${f}`,
        errors: [`${f}: ${(e as Error).message}`],
      };
    }
    localeKeys.set(f, new Set(flatten(data)));
  }

  // Use the union of all keys as the reference set
  const union = new Set<string>();
  for (const set of localeKeys.values()) for (const k of set) union.add(k);

  const errors: string[] = [];
  for (const [file, keys] of localeKeys) {
    const missing = [...union].filter((k) => !keys.has(k));
    if (missing.length > 0) {
      const sample = missing.slice(0, 5).join(", ");
      const more = missing.length > 5 ? ` (+${missing.length - 5} more)` : "";
      errors.push(`${file}: missing ${missing.length} key(s): ${sample}${more}`);
    }
  }

  if (errors.length > 0) {
    return {
      id: "i18n-parity",
      label: "i18n parity",
      tier: 1,
      status: "fail",
      detail: `${errors.length} locale(s) out of sync`,
      errors,
    };
  }

  return {
    id: "i18n-parity",
    label: "i18n parity",
    tier: 1,
    status: "pass",
    detail: `${files.length} locales × ${union.size} keys (in sync)`,
  };
}
