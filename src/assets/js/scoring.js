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

// Tune the scoring here.
export const WEIGHTS = {
  good: 1,
  okay: 0,
  poor: -1,
  dnf: 0, // did not finish: not counted
  inLineStar: 0.25,
  inLineHome: -0.25,
  starBaker: 0.25,
};

export const BAKER_COUNT = 12;
export const STATE_VERSION = 1;

const ratingKey = (ep, bake) => `${ep}-${bake}`;

export function newBaker(i) {
  const ratings = {};
  const inLineHome = {};
  const inLineStar = {};
  for (const ep of EPISODES) {
    for (const b of BAKES) ratings[ratingKey(ep, b.key)] = null;
    inLineHome[ep] = false;
    inLineStar[ep] = false;
  }
  return {
    id: `b${i + 1}`,
    name: "",
    description: "",
    ratings,
    inLineHome,
    inLineStar,
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
      wentHome: EPISODES.includes(b.wentHome) ? b.wentHome : null,
    };
  });
  return { ...fresh, bakers, starBaker: { ...fresh.starBaker, ...(saved.starBaker || {}) } };
}

// A baker competes in every episode up to and including the one they went home in.
export function isActiveIn(baker, ep) {
  return baker.wentHome == null || ep <= baker.wentHome;
}

export function getRating(baker, ep, bake) {
  return baker.ratings[ratingKey(ep, bake)] ?? null;
}

export function episodeScore(state, baker, ep) {
  if (!isActiveIn(baker, ep)) return 0;
  let score = 0;
  for (const b of BAKES) {
    const r = getRating(baker, ep, b.key);
    if (r) score += WEIGHTS[r] ?? 0;
  }
  if (baker.inLineStar[ep]) score += WEIGHTS.inLineStar;
  if (baker.inLineHome[ep]) score += WEIGHTS.inLineHome;
  if (state.starBaker[ep] === baker.id) score += WEIGHTS.starBaker;
  return score;
}

export function totalScore(state, baker) {
  return EPISODES.reduce((sum, ep) => sum + episodeScore(state, baker, ep), 0);
}

export function counts(state, baker) {
  const c = { good: 0, okay: 0, poor: 0, dnf: 0, inLineStar: 0, inLineHome: 0, starBaker: 0 };
  for (const ep of EPISODES) {
    if (!isActiveIn(baker, ep)) continue;
    for (const b of BAKES) {
      const r = getRating(baker, ep, b.key);
      if (r) c[r] += 1;
    }
    if (baker.inLineStar[ep]) c.inLineStar += 1;
    if (baker.inLineHome[ep]) c.inLineHome += 1;
    if (state.starBaker[ep] === baker.id) c.starBaker += 1;
  }
  return c;
}

export function displayName(baker, index) {
  const name = (baker.name || "").trim();
  return name || `Baker ${index + 1}`;
}

// Weakest first. Ties: more "in line to go home" ranks lower, then fewer
// "in line for star baker" ranks lower, then more poor bakes, then by name.
// Natural order, so "Baker 2" sorts before "Baker 10".
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

export function compare(a, b) {
  return (
    a.total - b.total ||
    b.counts.inLineHome - a.counts.inLineHome ||
    a.counts.inLineStar - b.counts.inLineStar ||
    b.counts.poor - a.counts.poor ||
    byName(a, b)
  );
}

export function rank(state) {
  const rows = state.bakers.map((baker, i) => ({
    id: baker.id,
    name: displayName(baker, i),
    wentHome: baker.wentHome,
    total: totalScore(state, baker),
    counts: counts(state, baker),
  }));
  const ranked = rows.filter((r) => r.wentHome == null).sort(compare);
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
