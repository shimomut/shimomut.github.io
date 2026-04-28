---
inclusion: auto
---

# GitHub Pages Technical Articles — Project Conventions

## Project Overview

This is a GitHub Pages repository for publishing technical articles written in HTML and JavaScript. Each article lives in its own sub-directory under the repo root.

## Directory Structure

```
/
├── index.md                  # Main landing page listing all articles
├── <article-slug>/           # One directory per article
│   ├── index.html            # Article entry point
│   ├── style.css             # Article-specific styles (if needed)
│   ├── script.js             # Article-specific JavaScript (if needed)
│   └── assets/               # Images, data files, etc.
└── .kiro/
    └── steering/
        └── project-conventions.md
```

## Conventions

### Article Directories
- Each article gets its own top-level directory with a kebab-case slug (e.g., `genai-tech-stack/`).
- The entry point for each article is `index.html` inside that directory.
- Keep all article assets (images, data, scripts) within the article's directory — no shared asset folders.

### Landing Page (`index.md`)
- `index.md` is the repo's main page rendered by GitHub Pages.
- Every new article must be added as a link in `index.md` using the format:
  ```
  - [Article Title](https://shimomut.github.io/<article-slug>/)
  ```

### HTML & JavaScript
- Articles are static HTML + vanilla JavaScript — no build step, no bundler.
- Keep dependencies minimal. Prefer loading libraries from CDNs (e.g., D3, Mermaid) via `<script>` tags over bundling.
- Each article should be self-contained and independently viewable.

### Naming
- Directory names: kebab-case (e.g., `genai-tech-stack`).
- File names: lowercase, kebab-case where multi-word.

### Content Guidelines
- Articles are technical in nature — diagrams, interactive visualizations, and code snippets are encouraged.
- Ensure articles render correctly on GitHub Pages (no server-side processing).
