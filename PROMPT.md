# Prompt: finish and verify the Bake-Off Tracker

You're working in an existing project folder for a small static web app. Read `SPEC.md` first. It's the source of truth for behaviour, layout and scoring. `README.md` covers running and deploying.

## Current state

The project is fully scaffolded: an 11ty v3 site, an Alpine.js component, plain CSS, scoring logic with tests, and deploy config for GitHub Pages and Netlify. The scoring tests pass (`npm test`). However, **the app has never been built with 11ty or run in a real browser with Alpine loaded**, so expect small integration bugs.

## Tasks, in order

1. **Install and build.** Run `npm install`, `npm test` and `npm run build`. Fix any build errors, for example Nunjucks syntax or the ESM import in `src/_data/show.js`.
2. **Run it.** Start `npm start` and open http://localhost:8080. Check the browser console for errors, such as the Alpine CDN module import or a bad `x-` expression, and fix them.
3. **Verify against SPEC.md.** Walk through each item below and fix anything that doesn't match:
   - The page loads with 12 empty baker rows and no rating selected anywhere.
   - Name and description edit in place, and survive a page reload.
   - Clicking Good / Okay / Poor / DNF selects that option, and clicking it again clears it.
   - The Ep 1 and Ep 2 Score columns and the Total update immediately.
   - Ticking Star Baker for one baker in an episode unticks any other baker in that episode.
   - Ticking Went home in Ep 2 and then Ep 1 for the same baker leaves only Ep 1 ticked.
   - A baker who went home in Ep 1 has their Ep 2 columns dimmed and disabled. They drop out of the ranking and appear under "Went home". Their Ep 2 ratings don't count.
   - Unticking Went home restores the row and its old ratings.
   - The ranking sits below the table, weakest first, and follows the tie-break order in SPEC.md.
   - The table scrolls horizontally with the Contestant column pinned, and has inner lines only.
   - It looks clean and is usable at phone width (about 390 px).
   - "Clear everything" asks for confirmation, then resets.
   - Reloading keeps every value.
4. **Keep the logic pure.** Scoring and ranking stay in `src/assets/js/scoring.js`, with no DOM access. If you change any rule there, add or update tests in `test/scoring.test.js`.
5. **Prepare to deploy.** Run `git init`, make an initial commit, and make sure `.gitignore` excludes `node_modules/` and `_site/`. Then tell me the exact steps to create the GitHub repo and turn on Pages using the "GitHub Actions" source. Don't push or create remote repos without asking.

## Constraints

- Keep Alpine.js; don't introduce React, Vue, a bundler or a CSS framework.
- Keep it to one page: no tabs, modals or extra routes.
- Keep asset paths relative so the site works under a GitHub Pages sub-path.
- Track only episodes 1 and 2. Don't add later episodes.
- Make small, focused changes. When done, summarize what you changed and anything still unverified.
