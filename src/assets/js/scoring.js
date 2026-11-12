// Pure data + scoring logic. No DOM, no Alpine — shared by the browser app,
// the 11ty data file (to build table columns) and the tests.

export const EPISODES = [1, 2];

export const BAKES = [
  { key: "sig", label: "Signature" },
  { key: "tech", label: "Technical" },
  { key: "show", label: "Showstopper" },
];

export const RATINGS = [
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "poor", label: "Poor" },
  { value: "dnf", label: "DNF" },
];

// Default points. The page lets you change them; the live values are saved
// in state.weights and fall back to these.
export const WEIGHTS = {
  good: 1,
  okay: 0,
  poor: -1,
  dnf: 0, // did not finish: not counted
  inLineStar: 0.25,
  inLineHome: -0.25,
  handshake: 1,
  starBaker: 0.25,
};

export const BAKER_COUNT = 12;
export const STATE_VERSION = 1;

// Rows of the editable points table, in display order.
export const WEIGHT_ITEMS = [
  { key: "good", label: "Good bake" },
  { key: "okay", label: "Okay bake" },
  { key: "poor", label: "Poor bake" },
  { key: "dnf", label: "DNF (did not finish)" },
  { key: "inLineStar", label: "In line for Star Baker (per episode)" },
  { key: "inLineHome", label: "In line to go home (per episode)" },
  { key: "handshake", label: "Handshake (per episode)" },
  { key: "starBaker", label: "Won Star Baker" },
];

const ratingKey = (ep, bake) => `${ep}-${bake}`;

// Saved weights, with any missing or non-numeric value replaced by the default.
export function cleanWeights(saved) {
  const w = { ...WEIGHTS };
  if (saved && typeof saved === "object") {
    for (const k of Object.keys(WEIGHTS)) {
      if (typeof saved[k] === "number" && Number.isFinite(saved[k])) w[k] = saved[k];
    }
  }
  return w;
}

const weightsOf = (state) => state.weights || WEIGHTS;

export function newBaker(i) {
  const ratings = {};
  const inLineHome = {};
  const inLineStar = {};
  const handshake = {};
  for (const ep of EPISODES) {
    for (const b of BAKES) ratings[ratingKey(ep, b.key)] = null;
    inLineHome[ep] = false;
    inLineStar[ep] = false;
    handshake[ep] = false;
  }
  return {
    id: `b${i + 1}`,
    name: "",
    description: "",
    ratings,
    inLineHome,
    inLineStar,
    handshake,
    wentHome: null, // episode number, or null if still in
  };
}

export function newState() {
  const starBaker = {};
  for (const ep of EPISODES) starBaker[ep] = null;
  return {
    version: STATE_VERSION,
    bakers: Array.from({ length: BAKER_COUNT }, (_, i) => newBaker(i)),
    starBaker,
    weights: { ...WEIGHTS },
  };
}

// Fill in any keys missing from saved data (e.g. after an app update).
export function normalize(saved) {
  const fresh = newState();
  if (!saved || saved.version !== STATE_VERSION || !Array.isArray(saved.bakers)) {
    return fresh;
  }
  const bakers = saved.bakers.map((b, i) => {
    const base = newBaker(i);
    return {
      ...base,
      ...b,
      id: b.id || base.id,
      ratings: { ...base.ratings, ...(b.ratings || {}) },
      inLineHome: { ...base.inLineHome, ...(b.inLineHome || {}) },
      inLineStar: { ...base.inLineStar, ...(b.inLineStar || {}) },
      handshake: { ...base.handshake, ...(b.handshake || {}) },
      wentHome: EPISODES.includes(b.wentHome) ? b.wentHome : null,
    };
  });
  const starBaker = { ...fresh.starBaker, ...(saved.starBaker || {}) };
  // Drop a Star Baker pick that breaks the rules (e.g. from older saved data).
  for (const ep of EPISODES) {
    const sb = bakers.find((b) => b.id === starBaker[ep]);
    if (sb && !canBeStarBaker(sb, ep)) starBaker[ep] = null;
  }
  return { ...fresh, bakers, starBaker, weights: cleanWeights(saved.weights) };
}

// A baker competes in every episode up to and including the one they went home in.
export function isActiveIn(baker, ep) {
  return baker.wentHome == null || ep <= baker.wentHome;
}

// Star Baker and going home are mutually exclusive within an episode.
export function canBeStarBaker(baker, ep) {
  return isActiveIn(baker, ep) && baker.wentHome !== ep;
}

export function canGoHome(state, baker, ep) {
  return isActiveIn(baker, ep) && state.starBaker[ep] !== baker.id;
}

export function getRating(baker, ep, bake) {
  return baker.ratings[ratingKey(ep, bake)] ?? null;
}

export function episodeScore(state, baker, ep) {
  if (!isActiveIn(baker, ep)) return 0;
  const w = weightsOf(state);
  let score = 0;
  for (const b of BAKES) {
    const r = getRating(baker, ep, b.key);
    if (r) score += w[r] ?? 0;
  }
  if (baker.inLineStar[ep]) score += w.inLineStar;
  if (baker.handshake[ep]) score += w.handshake;
  if (baker.inLineHome[ep]) score += w.inLineHome;
  if (state.starBaker[ep] === baker.id) score += w.starBaker;
  return score;
}

export function totalScore(state, baker) {
  return EPISODES.reduce((sum, ep) => sum + episodeScore(state, baker, ep), 0);
}

export function counts(state, baker) {
  const c = { good: 0, okay: 0, poor: 0, dnf: 0, unscored: 0, inLineStar: 0, inLineHome: 0, handshake: 0, starBaker: 0 };
  for (const ep of EPISODES) {
    if (!isActiveIn(baker, ep)) continue;
    for (const b of BAKES) {
      const r = getRating(baker, ep, b.key);
      if (r) c[r] += 1;
      else c.unscored += 1; // not rated yet (episodes they were in only)
    }
    if (baker.inLineStar[ep]) c.inLineStar += 1;
    if (baker.handshake[ep]) c.handshake += 1;
    if (baker.inLineHome[ep]) c.inLineHome += 1;
    if (state.starBaker[ep] === baker.id) c.starBaker += 1;
  }
  return c;
}

export function displayName(baker, index) {
  const name = (baker.name || "").trim();
  return name || `Baker ${index + 1}`;
}

// Natural order, so "Baker 2" sorts before "Baker 10" (used for the went-home list).
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

// Strongest first. Ties: fewer poor bakes ranks higher, then fewer okay bakes.
// Anything still level is a genuine tie (compare returns 0) and shares a place.
export function compare(a, b) {
  return b.total - a.total || a.counts.poor - b.counts.poor || a.counts.okay - b.counts.okay;
}

export function rank(state) {
  const rows = state.bakers.map((baker, i) => ({
    id: baker.id,
    name: displayName(baker, i),
    wentHome: baker.wentHome,
    total: totalScore(state, baker),
    counts: counts(state, baker),
  }));
  // Stable sort: tied bakers stay in table order.
  const ranked = rows.filter((r) => r.wentHome == null).sort(compare);
  // Standard competition places: 1, 2, 2, 4.
  ranked.forEach((r, i) => {
    r.place = i > 0 && compare(ranked[i - 1], r) === 0 ? ranked[i - 1].place : i + 1;
  });
  const eliminated = rows
    .filter((r) => r.wentHome != null)
    .sort((a, b) => a.wentHome - b.wentHome || byName(a, b));
  return { ranked, eliminated };
}

export function formatScore(n) {
  const rounded = Math.round(n * 100) / 100;
  if (rounded === 0) return "0";
  const abs = String(Math.abs(rounded));
  return rounded > 0 ? `+${abs}` : `−${abs}`;
}
