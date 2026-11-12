// Feeds the table columns at build time, from the same constants the app uses.
import { EPISODES, BAKES, RATINGS, WEIGHTS } from "../assets/js/scoring.js";

export default {
  title: "Bake-Off Tracker",
  episodes: EPISODES,
  bakes: BAKES,
  ratings: RATINGS,
  weights: WEIGHTS,
  // 3 bakes + in line to go home + in line for star baker + went home + star baker + score
  columnsPerEpisode: BAKES.length + 5,
};
