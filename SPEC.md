# Bake-Off Tracker — Spec

A single-page web app for tracking bakers in the first two episodes of The Great British Baking Show while watching with friends. You make quick notes on each baker, rate each of their bakes, and the app ranks bakers from weakest to strongest. It ranks; it does not build a bracket or predict a winner.

## Scope

- **Episodes 1 and 2 only.** That's 6 bakes per baker. Nothing after episode 2 is tracked.
- **12 bakers.**
- **3 bakes per episode:** Signature, Technical, Showstopper.
- **Each episode** has one Star Baker and one baker sent home, so 2 bakers leave in total.
- A baker can leave mid-episode (emergency, illness) and miss bakes. A missed bake is marked DNF.

## Stack and hosting

- **11ty** (v3, ESM config) builds a static site. Source is in `src/`, output in `_site/`.
- **Alpine.js** handles interactivity. It's loaded from the jsDelivr CDN as an ES module, pinned to `3.14.9`. Don't use React, Vue or other heavyweight frameworks.
- **Plain CSS.** No Tailwind or other CSS framework.
- **No backend or database.** All state lives in the browser's `localStorage` under the key `bake-off-tracker`, so it stays on the user's device.
- **Deploy:** GitHub Pages is preferred, through the GitHub Actions workflow in `.github/workflows/deploy.yml`. Netlify is the fallback, via `netlify.toml`.
- **Relative asset paths,** so the site works under `https://<user>.github.io/<repo>/`.

## Page layout (single page, no navigation)

Everything is on one scrolling page, with no tabs, modals, popovers or extra pages. Results are always one scroll away.

1. **Header:** title "Bake-Off Tracker" and a one-line description.
2. **Table:** one wide table that scrolls horizontally.
3. **Ranking:** directly below the table.
4. **Footer:** a "Clear everything" button, which asks for confirmation.

### Visual style

- White or off-white background (currently `#fbfaf7`), clean and minimal.
- The table has **inner lines only**, with no outer border. A slightly stronger line separates the episode groups.
- The Contestant column is **sticky** on the left while the table scrolls sideways.
- Rating states are colour-coded: Good green, Okay neutral grey, Poor red, DNF muted purple.
- Must be usable on a laptop and on a tablet or phone.

### Table columns

| Column | Input | Behaviour |
| --- | --- | --- |
| Contestant | Name + description | Name is plain text you edit directly (no visible input box until hover or focus). A small textarea for the description sits underneath. Both auto-save. Empty names show the placeholder "Baker N". If the baker went home, a small "Went home in Ep N" tag appears. |

These columns repeat for each episode, under an "Episode N" group header:

| Column | Input | Behaviour |
| --- | --- | --- |
| Signature | Rating | Segmented control: Good / Okay / Poor / DNF. **No selection by default.** Clicking the selected option again clears it. |
| Technical | Rating | Same as Signature |
| Showstopper | Rating | Same as Signature |
| In line to go home | Checkbox | The baker is already struggling this episode (the ✗ flag) |
| In line for Star Baker | Checkbox | The baker is already looking strong this episode (the ★ flag) |
| Went home | Checkbox | **Only one per row** across both episodes. Ticking another episode moves it. |
| Star Baker | Checkbox | **Only one per episode** (per column). Ticking a baker replaces the previous one. |
| Score | Calculated | That episode's points, read-only |

After the last episode comes a **Total** column: the sum of the episode scores, read-only.

### Elimination behaviour

- A baker who went home in episode N stays active for episodes 1 to N (they baked that episode).
- Their columns for later episodes are **disabled and dimmed**, and are left out of all calculations.
- If they held Star Baker in a later episode, it's cleared when they're marked as gone.
- Unticking Went home restores the row. Any ratings entered before are kept and count again.
- Bakers who went home are **left out of the main ranking** and listed separately underneath, in the order they left.

## Scoring

Weights live in one place: `WEIGHTS` in `src/assets/js/scoring.js`.

| Item | Points |
| --- | --- |
| Good bake | +1 |
| Okay bake | 0 |
| Poor bake | −1 |
| DNF / not rated | not counted (0) |
| In line for Star Baker (per episode) | +0.25 |
| In line to go home (per episode) | −0.25 |
| Won Star Baker (per episode) | +0.25 |

Required property: 5 Poor + 1 Okay (−5) ranks below 4 Poor + 2 Okay (−4).

### Ranking order

Active bakers are sorted weakest first, by:

1. Total score, ascending.
2. Tie-break: more "in line to go home" flags ranks **lower**.
3. Tie-break: more "in line for Star Baker" flags ranks **higher**.
4. Tie-break: more Poor bakes ranks lower.
5. Tie-break: alphabetical by display name.

Ties that survive all of these can stand. Nothing forces two bakers apart.

### Ranking display

- The heading reads "Ranking", with the hint "Weakest at the top, strongest at the bottom."
- Each row shows position, name, a summary (`2 good · 3 okay · 1 poor`, plus `N DNF`, `★ N`, `✗ N` and `Star Baker ×N` when they're above zero) and the total score.
- Scores are formatted `+1.25`, `0` or `−0.5` (true minus sign). Negative totals are red and positive totals green.
- A "Went home" sub-list shows eliminated bakers as `Ep N · summary · score`.
- A short "How scores work" note restates the weights and tie-breaks. It's plain text, not collapsible.
- The ranking updates live as anything changes.

## Data model

There's one JSON object, saved to `localStorage` on every change:

```json
{
  "version": 1,
  "bakers": [
    {
      "id": "b1",
      "name": "",
      "description": "",
      "ratings": { "1-sig": null, "1-tech": "good", "1-show": "poor", "2-sig": "dnf", "2-tech": null, "2-show": null },
      "inLineHome": { "1": false, "2": true },
      "inLineStar": { "1": true, "2": false },
      "wentHome": null
    }
  ],
  "starBaker": { "1": "b1", "2": null }
}
```

- Rating values are `"good" | "okay" | "poor" | "dnf" | null`.
- `wentHome` is an episode number or `null`.
- `normalize()` merges saved data over a fresh state, so missing keys get filled after updates. If the version is wrong or the data is junk, the app resets to a fresh state.
- Storage errors (full, or blocked in private mode) are caught, and the app keeps working in memory.

## Files

```
src/
  index.njk              page template; columns generated at build time from show data
  _data/show.js          imports EPISODES, BAKES, RATINGS, WEIGHTS from scoring.js
  assets/js/scoring.js   pure logic: state, normalize, scores, counts, rank, formatScore (no DOM)
  assets/js/app.js       Alpine.data("tracker"): load/save, rating toggles, one-per rules, getters
  assets/css/styles.css  all styles
test/scoring.test.js     node:test tests for scoring.js
eleventy.config.js       passthrough src/assets, input src, output _site
.github/workflows/deploy.yml  npm install → test → build → upload-pages-artifact@v4 → deploy-pages@v4
netlify.toml             fallback deploy config
```

Scripts: `npm start` (dev server, port 8080), `npm run build`, `npm test`.

## Out of scope for now (open questions)

- Should DNF count as a negative?
- Rank by total or by average per rated bake?
- Can ★ and ✗ both apply to one baker in the same episode? (Currently allowed.)
- JSON export and import for backup or moving between devices.
- Several trackers per device, one per friend.
