# Bake-Off Bracket Helper — Spec

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

1. **Header:** the title "Bake-Off Bracket Helper" as a large H1 on the normal page background. No bar, no subtext.
2. **Table:** one wide table that scrolls horizontally, with the Contestant column pinned on the left. The five checkbox columns are all the same width.
3. **Ranking:** directly below the table.
4. **Footer:** a dark red "Clear everything" text link (brighter red on hover, not a button), set well apart from everything above it. It asks for confirmation.

### Visual style

- White or off-white background (currently `#fbfaf7`), clean and minimal.
- The table has **inner lines only**, with no outer border. A slightly stronger line separates the episode groups.
- The Contestant column is **sticky** on the left while the table scrolls sideways, and has a **fixed width** (12rem, 9rem on phones). Long descriptions wrap inside it.
- Rating states are colour-coded: Good green, Okay neutral grey, Poor red, DNF muted purple. The selected option changes colour only, not font weight, so the control never shifts width.
- High-contrast text and lines, and tight spacing throughout.
- Must be usable on a laptop and on a tablet or phone.

### Table columns

| Column | Input | Behaviour |
| --- | --- | --- |
| Contestant | Name + description | Name is plain text you edit directly (no visible input box until hover or focus), with the baker's total score in a badge beside it (green if positive, red if negative). Long names wrap onto the next line; Enter doesn't add a line break. The description underneath is a `contenteditable` field that wraps within the column and grows taller as needed, with no resize handle. Both auto-save. Empty names show the placeholder "Baker N" in the same colour as a real name, and an empty description shows "Add a description...". If the baker went home, the cell is greyed out a little. There's no tag. |

These columns repeat for each episode, under an "Episode N" group header:

| Column | Input | Behaviour |
| --- | --- | --- |
| Signature | Rating | Segmented control: Good / Okay / Poor / DNF. **No selection by default.** Clicking the selected option again clears it. |
| Technical | Rating | Same as Signature |
| Showstopper | Rating | Same as Signature |
| In line for Star Baker | Checkbox | The baker is already looking strong this episode (the ★ flag) |
| In line to go home | Checkbox | The baker is already struggling this episode (the ✗ flag) |
| Handshake? | Checkbox | Paul gave the baker a handshake this episode. Worth +1 by default. |
| Star Baker | Checkbox | **Only one per episode** (per column). Ticking a baker replaces the previous one. Hidden for the episode the baker went home in. |
| Went home | Checkbox | **Only one per row** across both episodes. Ticking another episode moves it. Hidden for an episode the baker won Star Baker. |
| Week Score | Calculated | That episode's points, read-only |

There's no separate Total column. The total (the sum of the episode scores) is the badge next to the baker's name.

### Elimination behaviour

- A baker who went home in episode N stays active for episodes 1 to N (they baked that episode).
- Their columns for later episodes are **disabled and dimmed**, and are left out of all calculations.
- If they held Star Baker in a later episode, it's cleared when they're marked as gone.
- Star Baker and Went home are mutually exclusive in the same episode. Choosing one hides the other's checkbox for that baker and episode, and `normalize()` drops a saved Star Baker pick that breaks this.
- Once a baker goes home, their row **collapses**: all the episode cells are replaced by one cell reading "Went home in Episode N. Ratings hidden." with two links, **Show ratings** (expands the row; a **Hide ratings** link then appears under the name) and **Undo went home**. Rows start collapsed after a reload (the expanded state isn't saved).
- Unticking Went home restores the row. Any ratings entered before are kept and count again.
- Bakers who went home are **left out of the main ranking** and listed separately underneath, in the order they left.

## Scoring

Default weights live in one place: `WEIGHTS` in `src/assets/js/scoring.js`. Every weight can be changed on the page (see Ranking display), and the live values are saved in `state.weights`.

| Item | Points |
| --- | --- |
| Good bake | +1 |
| Okay bake | 0 |
| Poor bake | −1 |
| DNF / not rated | not counted (0) |
| In line for Star Baker (per episode) | +0.25 |
| In line to go home (per episode) | −0.25 |
| Handshake (per episode) | +1 |
| Won Star Baker (per episode) | +0.25 |

Required property: 5 Poor + 1 Okay (−5) ranks below 4 Poor + 2 Okay (−4).

### Ranking order

Active bakers are sorted strongest first, by:

1. Total score, descending.
2. Tie-break: fewer Poor bakes ranks higher.
3. Tie-break: fewer Okay bakes ranks higher.

Anything still level is a tie, and that's fine. Tied bakers share a place number (competition style: 1, 2, 2, 4) and keep their table order. Nothing else (flags, names) breaks a tie.

### Ranking display

- The heading reads "Ranking", with the hint "Strongest at the top, weakest at the bottom."
- Each row shows position, name, a summary (`2 good · 3 okay · 1 poor`, then `N unscored` highlighted in orange when any bakes in the baker's episodes aren't rated yet, then `N DNF`, `★ N`, a bold red ✗ icon with `N`, and `Star Baker ×N` when they're above zero) and the total score.
- Scores are formatted `+1.25`, `0` or `−0.5` (true minus sign). Negative totals are red and positive totals green.
- A "Went home" sub-list shows eliminated bakers as just their name and `Went home in Episode N` (no full stop), with no summary or score.
- "Ranking", "Went home" and "How scores work" use the same heading size, with the same gap above each section as between the table and "Ranking".
- A "How scores work" section has a points table, styled like the ranking rows, with one row per weight (Good, Okay, Poor, DNF, In line for Star Baker, In line to go home, Handshake, Won Star Baker) and a number input for each. Editing a value re-scores the table, badges and ranking immediately and is saved. A "Reset to defaults" link appears when any value differs from `WEIGHTS`. A line of plain text below restates the tie-breaks. Nothing is collapsible.
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
      "handshake": { "1": false, "2": false },
      "wentHome": null
    }
  ],
  "starBaker": { "1": "b1", "2": null },
  "weights": { "good": 1, "okay": 0, "poor": -1, "dnf": 0, "inLineStar": 0.25, "inLineHome": -0.25, "handshake": 1, "starBaker": 0.25 }
}
```

- Rating values are `"good" | "okay" | "poor" | "dnf" | null`.
- `wentHome` is an episode number or `null`.
- `weights` holds the current points. Missing or non-numeric values fall back to `WEIGHTS`. "Clear everything" resets them too.
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
.github/workflows/deploy.yml  Node 26 LTS: npm install → test → build → upload-pages-artifact@v5 → deploy-pages@v5
netlify.toml             fallback deploy config
```

Scripts: `npm start` (dev server, port 8080), `npm run build`, `npm test`.

## Out of scope for now (open questions)

- Should DNF count as a negative? (You can now set this yourself in the points table.)
- Rank by total or by average per rated bake?
- Can ★ and ✗ both apply to one baker in the same episode? (Currently allowed.)
- JSON export and import for backup or moving between devices.
- Several trackers per device, one per friend.
