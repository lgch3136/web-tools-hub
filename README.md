# Practical Tools

Practical Tools is a browser-first utility site focused on completing real tasks without requiring an account. Its flagship product is a Markdown publishing studio for writing, previewing, formatting, copying to publishing platforms, and exporting reusable documents. The site also includes 19 focused developer, office, image, and text utilities.

**Website:** https://practicaltools.xyz/

## Product focus

### Markdown publishing studio

`/md-html` treats Markdown as the canonical document and derives every preview, copy action, and export from that source. The studio includes:

- named local drafts and autosave in the current browser;
- live preview, outline, document statistics, and editor/split/preview modes;
- formatting and insertion controls for common Markdown structures;
- Clean, WeChat, Toutiao, Developer, and Notebook publishing themes;
- Markdown, HTML, text, DOCX, and print/PDF workflows;
- rich-text copy for publishing editors;
- GFM, code highlighting, Mermaid diagrams, and KaTeX math;
- HTML sanitization before preview and copy.

### Focused browser tools

The remaining tools cover JSON, regular expressions, hashes, encodings, timestamps, UUIDs, QR codes, image compression and metadata cleaning, text comparison, colors, passwords, word counts, number bases, exchange rates, and developer references.

## Data boundaries

Most transformations happen in the browser. This does **not** mean the whole website is offline or makes no network requests:

- Markdown drafts and settings use browser storage and are not cloud backups.
- Imported files are parsed in the browser by the relevant page.
- Exchange rates are requested from a public exchange-rate service.
- External image URLs are requested by the browser.
- Some content pages can load Google advertising services; focused tool pages do not load advertising code.
- A small number of legacy tools load public JavaScript libraries from CDNs.

See the live [privacy policy](https://practicaltools.xyz/privacy) for the current disclosure.

## Development

Requirements:

- Node.js 22
- npm

```bash
npm install
npm start
```

`npm start` builds the complete multi-page site and serves the production output at `http://127.0.0.1:3000`. The build script clears `HERMES_WEB_DIST` before invoking Parcel so local output always stays in `./dist`.

Production build:

```bash
npm run build
```

Unit tests run with:

```bash
npm test
```

The browser smoke test uses the installed Google Chrome application and covers desktop/mobile layout, safe rendering, autosave, view modes, and DOCX import/export:

```bash
npm run test:browser
```

A full crawl checks every sitemap route at desktop and 390px mobile widths for runtime errors, missing metadata, multiple/missing H1 headings, horizontal overflow, and advertising loaded before opt-in:

```bash
npm run test:site
```

## Project structure

```text
src/
├── index.html                 # Product homepage
├── md-html.html               # Markdown studio entry
├── markdown-studio.css        # Markdown studio UI
├── tools/                     # Tool implementations
├── guides/                    # Crawlable, task-oriented guides
├── style.css                  # Shared site and article styles
├── privacy.html               # Data and network boundaries
└── sitemap.xml                # Public URL inventory
```

`vercel.json` maps clean public routes to Parcel's generated HTML files.

## Feedback

Use the website's [contact page](https://practicaltools.xyz/contact) or open a GitHub issue with:

1. the page and action;
2. browser and operating system;
3. minimal reproducible input;
4. expected and actual result;
5. a screenshot without private data, when useful.

## License

No repository-wide license has been declared. Public source visibility does not by itself grant reuse rights.
