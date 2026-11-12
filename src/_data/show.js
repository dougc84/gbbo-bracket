// Feeds the table columns at build time, from the same constants the app uses.
import { EPISODES, BAKES, RATINGS, WEIGHTS } from "../assets/js/scoring.js";

export default {
  title: "Bake-Off Bracket Helper",
  episodes: EPISODES,
  bakes: BAKES,
  ratings: RATINGS,
  weights: WEIGHTS,
  // 3 bakes + in line for star baker + in line to go home + handshake + star baker + went home + score
  columnsPerEpisode: BAKES.length + 6,
};
