# Vedini — Sacred Chants · Words · Meanings

Vedini is a static study and chanting library for Lalitā Sahasranāma, designed for GitHub Pages.

## Lalitā Sahasranāma content milestone

The main reader now contains the full **183 ślokas** and **1,000 divine names** with:

- Devanagari and IAST reading text
- preserved chanting-style hyphenation
- word-by-word component meanings
- individual deeper meaning for every divine name
- overall śloka meaning
- contextual deeper meaning for every śloka
- English and Kannada reading modes
- search, navigation, range practice and existing audio playback

The source-review layer preserves individually source-checked explanations where available and supplies original editorial synthesis for the remaining coverage. Editorial synthesis is informed by the repository's literal-name mapping and traditional Śrīvidyā themes; it is not presented as verbatim commentary or independent scholarly certification.

## Remaining project task

Audio generation/review/upload for ślokas **41–183**.

Use:

```bash
conda activate vagdhenu
bash scripts/generate_lalita_41_183.sh
```

Generated files belong in:

```text
audio/lalita/verses/sloka-041.mp3
...
audio/lalita/verses/sloka-183.mp3
```

## Preview locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/lalita/`.

## Deployment

GitHub Pages publishes from `main` at:

`https://qiprana.github.io/Vedini/lalita/`
