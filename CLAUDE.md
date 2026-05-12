# CLAUDE.md

## Project Overview

GitHub Pages site publishing technical articles about AI/ML infrastructure (GPU architecture, parallelism, inference performance, profiling, etc.). Each article is a self-contained static HTML + vanilla JS page in its own directory.

## Directory Structure

- `index.md` — Landing page listing all articles (rendered by GitHub Pages)
- `<article-slug>/` — One top-level directory per article (kebab-case)
  - `index.html` — Article entry point
  - `style.css` / `script.js` — Article-specific assets
- `_scratch/` — Scratch/draft work (not published)

## Key Conventions

- **No build step**: Static HTML + vanilla JS only. Load libraries from CDNs via `<script>` tags.
- **Self-contained articles**: All assets (images, data, scripts) live within the article's own directory. No shared asset folders.
- **Naming**: Directory names and filenames use kebab-case, lowercase.
- **New articles**: Must be added to `index.md` as a link in the format:
  ```
  - [Article Title](article-slug/)
  ```
- **Content focus**: Technical articles with diagrams, interactive visualizations, and code snippets. Must render correctly on GitHub Pages (no server-side processing).

## Useful Commands

```bash
# Preview locally (if Python available)
python3 -m http.server 8000

# Deploy — just push to main; GitHub Pages auto-publishes
git push origin main
```
