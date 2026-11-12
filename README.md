# Bake-Off Bracket Helper

A single-page tracker for the first two episodes of The Great British Baking Show. Rate each baker's three bakes per episode, flag who's in line for Star Baker or to go home, mark who went home and who won Star Baker, and scroll down to see everyone ranked from strongest to weakest.

Built with [11ty](https://www.11ty.dev/) and [Alpine.js](https://alpinejs.dev/). There's no backend: everything saves to the browser's `localStorage` on the device you're using.

## Run locally

```sh
npm install
npm start        # dev server with live reload at http://localhost:8080
npm test         # scoring tests
npm run build    # outputs the static site to _site/
```

Needs Node 18 or newer (the deploy uses Node 26, the current LTS).

## Deploy to GitHub Pages

1. Push this folder to a new GitHub repository on the `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) tests, builds and publishes on every push to `main`. You can also run it by hand from the **Actions** tab.

The site will be at `https://<your-username>.github.io/<repo-name>/`. All asset paths are relative, so it works under that sub-path with no extra config.

GitHub Pages is free for public repositories. Publishing from a private repository needs a paid GitHub plan, and the published site is public either way.

## Deploy to Netlify (alternative)

Import the repo in Netlify. `netlify.toml` already sets the build command (`npm run build`) and publish folder (`_site`).

## Changing the scoring

You can change any of the points on the page itself: the "How scores work" table at the bottom re-scores everything as you type, and your values are saved in the browser. The defaults live in `WEIGHTS` in `src/assets/js/scoring.js`:

| Item | Points |
| --- | --- |
| Good bake | +1 |
| Okay bake | 0 |
| Poor bake | −1 |
| DNF / not rated | not counted |
| In line for Star Baker (per episode) | +0.25 |
| In line to go home (per episode) | −0.25 |
| Handshake (per episode) | +1 |
| Won Star Baker | +0.25 |

The ranking is strongest first. Ties are broken by fewer poor bakes, then fewer okay bakes. Anything still level is a tie, and tied bakers share a place. Bakers marked as gone are listed separately under the ranking.

The episodes, bakes and rating options are defined in the same file and feed the table columns at build time through `src/_data/show.js`.

## Project layout

```
src/
  index.njk              page template (table + ranking)
  _data/show.js          build-time data for the columns
  assets/js/scoring.js   scoring and ranking logic (no DOM)
  assets/js/app.js       Alpine component, localStorage save/load
  assets/css/styles.css  styles
test/scoring.test.js     node:test tests for the scoring
```

Alpine.js loads from the jsDelivr CDN (pinned to 3.14.9).
