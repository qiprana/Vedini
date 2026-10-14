# Vedini — Sacred Chants · Words · Meanings

An ink-and-paper sacred chanting library, part of Aatmik Joy. Static HTML/CSS/JS and JSON, deployable on GitHub Pages.

## Current review milestone
- Four Dhyāna verses (draft)
- Lalitā Sahasranāma main verses 1–10, with Devanagari and IAST based on Shlokam
- Names 1–12: earlier draft metadata and meanings; the remaining names in verses 4–10 are **meaning_pending**, not invented.
- English and Kannada verse sense summaries for verses 4–10 are preliminary editorial drafts.
- Audio references are null placeholders.

## Sources and editorial discipline
Text: https://shlokam.org/shloka/lalitha-sahasranamam.htm
Cross-check: https://sanskritdocuments.org/doc_devii/lalita1000.html
Deeper interpretation reference: https://manblunder.com/articlesview/lalitha-sahasranamam-1-2
Traditional interpretations and exact namāvali numbering must be independently verified before approval. The Kannada script is mechanically transliterated from Devanagari and needs proof-reading.

## Preview locally
`python3 -m http.server 8000` in this folder, then open http://localhost:8000. Python is only a preview server; GitHub Pages runs the static files without Python.

## GitHub Pages
Create a public repo called `Vedini` under `qiprana`; upload the directory *contents* to root. In Settings → Pages choose Deploy from branch, main, /(root). Site URL: https://qiprana.github.io/Vedini/

## Editing
Keep text under `data/lalita/verses/`, and update translations and name records after source review. Do not change current UI functionality to add new verses.

## Navigation
- `index.html` — Vedini homepage
- `lalita/index.html` — Lalitā Sahasranāma reader
- `data/lalita/verses` — first ten JSON verse drafts
