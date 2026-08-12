# ARCHIVE_LOG.md

## 2026-08-12 — Netlify redirect-loop fix

- Action: replaced
- Original: `netlify.toml`
- Archived: `archive/2026-08-12/netlify.toml`
- Reason: forced trailing-slash redirects looped with the Next.js route handler and made four service pages unusable
- Replacement: `netlify.toml` without the conflicting `[[redirects]]` rules
- Restore steps:
  1. Copy the archived file back to `netlify.toml`
  2. Run `npm run build`
  3. Redeploy and verify every service route
- Risk: low
