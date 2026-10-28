# Vedini regression prevention

Before merging any change to the Lalitā reader:

1. **Do not remove or silently rename features.** Preserve individual Divine Name MSS playback, Nāmāvalī, Devanagari/IAST/Kannada, word-by-word content, search highlighting, meaning and significance, and the desktop chanting sidebar.
2. **Test a real click, not just the presence of a button.** The individual name-audio test must verify the assigned MSS clip starts without opening the guided practice controls; rerender after changing language and test again.
3. **Test viewport differences.** Run Playwright for desktop (1280+ px) and phone (390 px), checking sticky reading tabs, mobile transport visibility, expanded settings, no page overflow, and no verse text hidden by player or navigation.
4. **Keep source-specific content distinct.** A traditional benefit should remain in its sourced-benefit field; short significance, full meaning, and human interpretation may coexist without overwriting it.
5. **Run all checks before merging.** Use `npm test` and `npm run test:browser` (GitHub Actions: Vedini checks). A known failure is not permission to merge; resolve or explicitly isolate it and get a green run.
6. **Verify deployment after merge.** Confirm the GitHub Pages deployment for the intended commit succeeded. The production URL should be checked once after deployment, including a refresh with cached assets.

For repository settings, require the `Vedini checks / test` status check before merging pull requests into `main`. GitHub branch-protection/ruleset configuration must be enabled by the repository owner; the workflow alone does not prevent a manual merge.
