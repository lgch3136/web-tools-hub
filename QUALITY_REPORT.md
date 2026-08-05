# Quality report

Local pre-deployment verification completed at **2026-08-05 08:40 CST** using the production Parcel build, Google Chrome, Playwright Core, and Lighthouse 13.4.1.

## Automated checks

| Check | Result |
|---|---|
| Core tests | 11 passed, 0 failed |
| Production build | Passed |
| Markdown Studio browser smoke | Passed on desktop and 390px mobile |
| Full-site browser crawl | 39 sitemap routes passed on desktop and 390px mobile |
| Dependency audit | 0 vulnerabilities |
| Static SEO/link audit | 39 pages, 39 sitemap URLs, 0 errors, 0 warnings |
| Advertising gate audit | 13 opt-in content pages; 0 pages loaded AdSense before consent |
| Crawler UA checks | Browser, Googlebot, and Mediapartners-Google returned 200 for all sampled pages/resources |

The browser smoke covers safe HTML rendering, XSS rejection, Mermaid, KaTeX, autosave and restore, view modes, HTML/DOCX import, DOCX export, mobile tabs, and overflow. The site crawl checks page metadata, canonical URLs, H1 structure, horizontal overflow, runtime errors, and advertising loaded before opt-in.

## Lighthouse

Scores are ordered as **Performance / Accessibility / Best Practices / SEO**.

| Page and profile | Scores | FCP | LCP | Speed Index | TBT | CLS | TTI |
|---|---:|---:|---:|---:|---:|---:|---:|
| Home, desktop | 100 / 100 / 100 / 100 | 0.3 s | 0.3 s | 0.3 s | 0 ms | 0 | 0.3 s |
| Home, mobile | 100 / 100 / 100 / 100 | 1.1 s | 1.4 s | 2.2 s | 0 ms | 0 | 1.4 s |
| Markdown Studio, desktop | 100 / 100 / 100 / 100 | 0.5 s | 0.5 s | 0.5 s | 0 ms | 0.005 | 0.5 s |
| Markdown Studio, mobile | 93 / 100 / 100 / 100 | 2.4 s | 2.6 s | 2.4 s | 110 ms | 0 | 2.7 s |

### Remaining non-blocking opportunities

- Markdown Studio mobile: reduce render-blocking work (estimated 600 ms), unused CSS (about 42 KiB), and unused JavaScript (about 53 KiB).
- Home: reduce unused shared CSS (about 15 KiB mobile / 17 KiB desktop).
- Local-server cache lifetime and document-latency diagnostics are not representative of Vercel production headers and must be rechecked after deployment.
- All accessibility, best-practice, and SEO audits passed at 100 for the tested pages and profiles.

## Commands

```bash
npm test
npm run build
npm run test:browser
npm run test:site
npm audit --audit-level=moderate
```
