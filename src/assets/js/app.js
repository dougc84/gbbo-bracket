import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/module.esm.js";
import * as S from "./scoring.js";

const STORAGE_KEY = "bake-off-tracker";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return S.normalize(JSON.parse(raw));
  } catch (e) {
    // Unreadable or blocked storage: start fresh.
  }
  return S.newState();
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage full or blocked (e.g. some private modes): keep working in memory.
  }
}

Alpine.data("tracker", () => ({
  state: load(),
  // Which went-home rows are expanded to show their ratings. Not saved:
  // went-home rows start collapsed after a reload.
  expanded: {},

  init() {
    // Re-runs whenever anything in state changes, so every edit auto-saves.
    Alpine.effect(() => save(this.state));
  },

  active(b, ep) {
    return S.isActiveIn(b, ep);
  },

  rating(b, ep, bake) {
    return S.getRating(b, ep, bake);
  },

  setRating(b, ep, bake, value) {
    if (!this.active(b, ep)) return;
    const key = `${ep}-${bake}`;
    // Clicking the selected option again clears it.
    b.ratings[key] = b.ratings[key] === value ? null : value;
  },

  // Only one "went home" per baker: ticking another episode moves it.
  toggleWentHome(b, ep) {
    if (b.wentHome !== ep && !S.canGoHome(this.state, b, ep)) return; // Star Baker can't go home
    const wasIn = b.wentHome === null;
    b.wentHome = b.wentHome === ep ? null : ep;
    // Newly sent home: collapse the row. Moving it between episodes keeps it open.
    if (wasIn) this.expanded[b.id] = false;
    if (b.wentHome !== null) {
      for (const e of S.EPISODES) {
        if (e > b.wentHome && this.state.starBaker[e] === b.id) this.state.starBaker[e] = null;
      }
    }
  },

  // A went-home row hides its rating cells unless it's been expanded.
  collapsed(b) {
    return b.wentHome !== null && !this.expanded[b.id];
  },

  isStarBaker(b, ep) {
    return this.state.starBaker[ep] === b.id;
  },

  // Only one Star Baker per episode: ticking a baker replaces the previous one.
  toggleStarBaker(b, ep) {
    if (!this.isStarBaker(b, ep) && !S.canBeStarBaker(b, ep)) return; // went home that episode
    this.state.starBaker[ep] = this.isStarBaker(b, ep) ? null : b.id;
  },

  episodeScore(b, ep) {
    return S.episodeScore(this.state, b, ep);
  },

  total(b) {
    return S.totalScore(this.state, b);
  },

  // Points table: typing a number re-scores everything immediately.
  weightItems: S.WEIGHT_ITEMS,

  setWeight(key, raw) {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) this.state.weights[key] = n;
  },

  weightsAreDefault() {
    return Object.keys(S.WEIGHTS).every((k) => this.state.weights[k] === S.WEIGHTS[k]);
  },

  resetWeights() {
    this.state.weights = { ...S.WEIGHTS };
  },

  get results() {
    return S.rank(this.state);
  },

  fmt(n) {
    return S.formatScore(n);
  },

  // Ranking detail as parts, so some can be styled (unscored, the ✗ flag).
  summaryParts(r) {
    const c = r.counts;
    const parts = [
      { text: `${c.good} good` },
      { text: `${c.okay} okay` },
      { text: `${c.poor} poor` },
    ];
    if (c.unscored) parts.push({ text: `${c.unscored} unscored`, cls: "unscored" });
    if (c.dnf) parts.push({ text: `${c.dnf} DNF` });
    if (c.inLineStar) parts.push({ text: `★ ${c.inLineStar}`, title: "In line for Star Baker" });
    if (c.inLineHome) parts.push({ text: `${c.inLineHome}`, cls: "flag-x", title: "In line to go home" });
    if (c.handshake) parts.push({ text: `Handshake ×${c.handshake}` });
    if (c.starBaker) parts.push({ text: `Star Baker ×${c.starBaker}` });
    return parts;
  },

  reset() {
    if (window.confirm("Clear all bakers, ratings and picks? This can't be undone.")) {
      this.state = S.newState();
      this.expanded = {};
    }
  },
}));

Alpine.start();
