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
    b.wentHome = b.wentHome === ep ? null : ep;
    if (b.wentHome !== null) {
      for (const e of S.EPISODES) {
        if (e > b.wentHome && this.state.starBaker[e] === b.id) this.state.starBaker[e] = null;
      }
    }
  },

  isStarBaker(b, ep) {
    return this.state.starBaker[ep] === b.id;
  },

  // Only one Star Baker per episode: ticking a baker replaces the previous one.
  toggleStarBaker(b, ep) {
    this.state.starBaker[ep] = this.isStarBaker(b, ep) ? null : b.id;
  },

  episodeScore(b, ep) {
    return S.episodeScore(this.state, b, ep);
  },

  total(b) {
    return S.totalScore(this.state, b);
  },

  get results() {
    return S.rank(this.state);
  },

  fmt(n) {
    return S.formatScore(n);
  },

  summary(r) {
    const c = r.counts;
    const parts = [`${c.good} good`, `${c.okay} okay`, `${c.poor} poor`];
    if (c.dnf) parts.push(`${c.dnf} DNF`);
    if (c.inLineStar) parts.push(`★ ${c.inLineStar}`);
    if (c.inLineHome) parts.push(`✗ ${c.inLineHome}`);
    if (c.starBaker) parts.push(`Star Baker ×${c.starBaker}`);
    return parts.join(" · ");
  },

  reset() {
    if (window.confirm("Clear all bakers, ratings and picks? This can't be undone.")) {
      this.state = S.newState();
    }
  },
}));

Alpine.start();
