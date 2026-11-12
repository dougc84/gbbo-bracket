import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../src/assets/js/scoring.js";

function baker(state, i, name) {
  const b = state.bakers[i];
  b.name = name;
  return b;
}
function rate(b, list) {
  // list: [[ep, bakeKey, value], ...]
  for (const [ep, bake, v] of list) b.ratings[`${ep}-${bake}`] = v;
}

test("5 poor + 1 okay ranks below 4 poor + 2 okay (strongest first)", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  const b = baker(s, 1, "Bob");
  rate(a, [[1, "sig", "poor"], [1, "tech", "poor"], [1, "show", "poor"], [2, "sig", "poor"], [2, "tech", "poor"], [2, "show", "okay"]]);
  rate(b, [[1, "sig", "poor"], [1, "tech", "poor"], [1, "show", "poor"], [2, "sig", "poor"], [2, "tech", "okay"], [2, "show", "okay"]]);
  assert.equal(S.totalScore(s, a), -5);
  assert.equal(S.totalScore(s, b), -4);
  const order = S.rank(s).ranked.map((r) => r.name);
  assert.ok(order.indexOf("Bob") < order.indexOf("Ann"));
});

test("flags and star baker are worth 0.25 each", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  a.inLineStar[1] = true;
  s.starBaker[1] = a.id;
  a.inLineHome[2] = true;
  assert.equal(S.episodeScore(s, a, 1), 0.5);
  assert.equal(S.episodeScore(s, a, 2), -0.25);
  assert.equal(S.totalScore(s, a), 0.25);
});

test("tie-break: fewer poor bakes ranks higher, then fewer okay bakes", () => {
  const s = S.newState();
  const ann = baker(s, 0, "Ann");
  const bob = baker(s, 1, "Bob");
  const cat = baker(s, 2, "Cat");
  // All total 0. Ann: 1 good + 1 poor. Bob: 2 okay. Cat: 1 okay. Flags don't break ties.
  rate(ann, [[1, "sig", "good"], [1, "tech", "poor"]]);
  rate(bob, [[1, "sig", "okay"], [1, "tech", "okay"]]);
  rate(cat, [[1, "sig", "okay"]]);
  cat.inLineHome[1] = true;
  cat.inLineStar[1] = true;
  const order = S.rank(s).ranked.filter((r) => ["Ann", "Bob", "Cat"].includes(r.name)).map((r) => r.name);
  assert.deepEqual(order, ["Cat", "Bob", "Ann"]);
});

test("a full tie shares a place and keeps table order", () => {
  const s = S.newState();
  const { ranked } = S.rank(s);
  assert.deepEqual(ranked.map((r) => r.place), Array(12).fill(1));
  assert.deepEqual(ranked.slice(0, 3).map((r) => r.name), ["Baker 1", "Baker 2", "Baker 3"]);
  rate(s.bakers[5], [[1, "sig", "good"]]);
  rate(s.bakers[7], [[1, "sig", "poor"]]);
  const places = S.rank(s).ranked.map((r) => `${r.name}:${r.place}`);
  assert.equal(places[0], "Baker 6:1");
  assert.equal(places[1], "Baker 1:2");
  assert.equal(places[10], "Baker 12:2");
  assert.equal(places[11], "Baker 8:12");
});

test("handshake is worth +1 per episode by default", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  a.handshake[1] = true;
  assert.equal(S.totalScore(s, a), 1);
  a.handshake[2] = true;
  assert.equal(S.totalScore(s, a), 2);
  assert.equal(S.counts(s, a).handshake, 2);
  a.wentHome = 1;
  assert.equal(S.totalScore(s, a), 1); // Ep 2 handshake no longer counts
  s.weights.handshake = 3;
  assert.equal(S.totalScore(s, a), 3);
  assert.deepEqual(S.normalize({ version: 1, bakers: [{}] }).bakers[0].handshake, { 1: false, 2: false });
});

test("went home: later episodes ignored, baker moved out of ranking", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  rate(a, [[1, "sig", "poor"], [2, "sig", "good"]]);
  a.wentHome = 1;
  assert.equal(S.isActiveIn(a, 1), true);
  assert.equal(S.isActiveIn(a, 2), false);
  assert.equal(S.totalScore(s, a), -1);
  const { ranked, eliminated } = S.rank(s);
  assert.equal(ranked.length, 11);
  assert.deepEqual(eliminated.map((r) => r.name), ["Ann"]);
  a.wentHome = null; // correction restores
  assert.equal(S.totalScore(s, a), 0);
});

test("DNF and blank are not counted", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  rate(a, [[1, "sig", "dnf"]]);
  assert.equal(S.totalScore(s, a), 0);
  assert.equal(S.counts(s, a).dnf, 1);
});

test("normalize fills missing keys and rejects junk", () => {
  assert.equal(S.normalize(null).bakers.length, 12);
  assert.equal(S.normalize({ version: 99 }).bakers.length, 12);
  const n = S.normalize({ version: 1, bakers: [{ id: "x", name: "Zed" }], starBaker: { 1: "x" } });
  assert.equal(n.bakers[0].name, "Zed");
  assert.equal(n.bakers[0].ratings["2-show"], null);
  assert.equal(n.starBaker[1], "x");
  assert.equal(n.starBaker[2], null);
});

test("formatScore", () => {
  assert.equal(S.formatScore(0), "0");
  assert.equal(S.formatScore(1.25), "+1.25");
  assert.equal(S.formatScore(-0.5), "−0.5");
});

test("custom weights change scores and ranking; normalize cleans them", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  const b = baker(s, 1, "Bob");
  rate(a, [[1, "sig", "dnf"]]);
  rate(b, [[1, "sig", "okay"]]);
  assert.equal(S.totalScore(s, a), 0);
  s.weights.dnf = -2;
  s.weights.okay = 0.5;
  assert.equal(S.totalScore(s, a), -2);
  assert.equal(S.totalScore(s, b), 0.5);
  const order = S.rank(s).ranked.map((r) => r.name);
  assert.ok(order.indexOf("Bob") < order.indexOf("Ann"));

  const n = S.normalize({ version: 1, bakers: [], weights: { dnf: -1, good: "x", poor: NaN } });
  assert.equal(n.weights.dnf, -1);
  assert.equal(n.weights.good, S.WEIGHTS.good);
  assert.equal(n.weights.poor, S.WEIGHTS.poor);
  assert.deepEqual(S.normalize({ version: 1, bakers: [] }).weights, S.WEIGHTS);
});

test("counts unscored bakes only for episodes the baker was in", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  assert.equal(S.counts(s, a).unscored, 6);
  rate(a, [[1, "sig", "good"], [1, "tech", "dnf"]]);
  assert.equal(S.counts(s, a).unscored, 4); // DNF counts as rated
  a.wentHome = 1;
  assert.equal(S.counts(s, a).unscored, 1); // Ep 2 no longer counts
});

test("star baker and going home exclude each other in an episode", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  s.starBaker[1] = a.id;
  assert.equal(S.canGoHome(s, a, 1), false);
  assert.equal(S.canGoHome(s, a, 2), true);
  s.starBaker[1] = null;
  a.wentHome = 1;
  assert.equal(S.canBeStarBaker(a, 1), false);
  assert.equal(S.canBeStarBaker(a, 2), false); // gone by then
  // Saved data breaking the rule gets cleaned up.
  const n = S.normalize({ version: 1, bakers: [{ id: "b1", wentHome: 1 }], starBaker: { 1: "b1" } });
  assert.equal(n.starBaker[1], null);
});
