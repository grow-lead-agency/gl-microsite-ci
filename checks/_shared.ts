/**
 * Shared utilities for all checkers.
 * Loads dist/ HTML files once, parses them, and offers helpers.
 */

import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import fg from "fast-glob";
import { parse, type HTMLElement } from "node-html-parser";

export interface ParsedPage {
  /** filesystem path to the .html file, e.g. "dist/sluzby/index.html" */
  filePath: string;
  /** site path, e.g. "/sluzby/" */
  pathname: string;
  raw: string;
  doc: HTMLElement;
}

export async function loadPages(distDir: string): Promise<ParsedPage[]> {
  const files = await fg("**/*.html", { cwd: distDir, absolute: true });
  const pages: ParsedPage[] = [];
  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const rel = relative(distDir, file).replace(/\\/g, "/");
    const pathname = "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
    pages.push({
      filePath: rel,
      pathname,
      raw,
      doc: parse(raw, { blockTextElements: { script: true, style: true } }),
    });
  }
  return pages;
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

export async function readFileSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

export function getMeta(doc: HTMLElement, name: string): string | null {
  const el =
    doc.querySelector(`meta[name="${name}"]`) ||
    doc.querySelector(`meta[property="${name}"]`);
  return el?.getAttribute("content") ?? null;
}

export function resolveDistDir(input: string): string {
  return resolve(process.cwd(), input);
}
