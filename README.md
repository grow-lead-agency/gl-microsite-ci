# gl-microsite-ci

Reusable CI quality gates for GrowLead microsite forks.

**14 checks** — technical SEO, a11y, ENV/i18n parity, link integrity, performance budgets.

Designed to be called via GitHub `workflow_call` from any microsite fork (no per-repo copy-paste). Fix once, propagate everywhere.

## What it checks

### Tier 1 — Required (build fails)

| # | Check | What it catches |
|---|---|---|
| 1 | **Sitemap generated** | `dist/sitemap-index.xml` exists, ≥1 URL |
| 2 | **Meta titles** | every page has `<title>`, unique, 30–60 chars |
| 3 | **Meta descriptions** | every page has `<meta description>`, unique, 120–160 chars |
| 4 | **ENV parity** | `process.env.X` / `import.meta.env.X` matches `.env.example` |
| 5 | **i18n parity** | all locale JSONs share key set |
| 6 | **robots.txt** | exists, syntax-valid, has Sitemap, isn't fully blocking |
| 7 | **hreflang** | multi-locale pages have consistent hreflang sets + x-default |

### Tier 2 — Quality (build fails)

| # | Check | What it catches |
|---|---|---|
| 8 | **Internal links** | all `href="/..."` resolve to a real file in `dist/` |
| 9 | **Image alt attributes** | every `<img>` has `alt` (or `aria-hidden="true"`) |
| 10 | **JSON-LD valid** | structured data parses + has `@context` + `@type` |
| 11 | **Canonical URLs** | every page has self-referencing absolute canonical |
| 12 | **OG images** | every declared `og:image` resolves in `dist/` |
| 13 | **HTML size budget** | no page > 100 KB raw HTML |
| 14 | **Bundle budget** | total CSS < 50 KB, total JS < 30 KB |

## Usage

### From a fork's GitHub Actions

`.github/workflows/ci.yml` (5 lines):

```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    uses: grow-lead-agency/gl-microsite-ci/.github/workflows/quality.yml@v1
```

That's it. Override defaults if needed:

```yaml
jobs:
  quality:
    uses: grow-lead-agency/gl-microsite-ci/.github/workflows/quality.yml@v1
    with:
      dist: out                 # default: dist
      build: 'bun run build'    # default
      bun-version: '1.3.0'      # default
```

### Locally

```bash
bun run build
bunx --bun github:grow-lead-agency/gl-microsite-ci scripts/quality.ts
```

Or vendor it as a dev-dependency:

```bash
bun add -D grow-lead-agency/gl-microsite-ci
```

Then add to `package.json`:

```json
{
  "scripts": {
    "quality": "bun node_modules/@grow-lead-agency/gl-microsite-ci/scripts/quality.ts"
  }
}
```

## Output

### Terminal

```
🔍 GL Microsite Quality Check

Tier 1 — Required
  ✅ Sitemap generated           12 URLs in sitemap-index.xml
  ✅ Meta titles                 12/12 unique, all 30–60 chars
  ❌ Meta descriptions           2 missing
  ✅ ENV parity                  .env.example matches code (8 vars)
  ✅ i18n parity                 2 locales × 47 keys (in sync)
  ✅ robots.txt                  1 UA block(s), Sitemap present
  ✅ hreflang                    no hreflang declared (single-locale, skipped)

Tier 2 — Quality
  ✅ Internal links              47/47 valid
  ✅ Image alt attributes        14/14 have alt
  ✅ JSON-LD valid               4 block(s), types: Organization, ContactPage
  ✅ Canonical URLs              12/12 self-referencing
  ✅ OG images                   12 declared (12 local + 0 external/CDN)
  ✅ HTML size budget            max 47.2 KB / 100 KB (sluzby/index.html)
  ✅ Bundle budget               CSS 31.4 KB, JS 17.8 KB

────────────────────────────────────────
Score: 13/14 passed, 1 failed
Build: ❌ BLOCKED

Fix these to unblock:
  • src/pages/sluzby.astro: missing <meta name="description">
```

### JSON (for tooling)

`.quality-report.json` — strojově čitelný report.

### PR comment

Markdown table updated on each push to a PR (single comment, edited in place).

## CLI flags

```
bun scripts/quality.ts [options]

  --dist=<path>      dist directory (default: dist)
  --project=<path>   project root for env/i18n parity (default: .)
  --json=<file>      write JSON report
  --md=<file>        write markdown report (for PR comment)
  --quiet            suppress terminal output
```

Exit code: 0 = all pass, 1 = at least one Tier 1 or 2 fail.

## License

MIT
