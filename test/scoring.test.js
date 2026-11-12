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

test("5 poor + 1 okay ranks below 4 poor + 2 okay", () => {
  const s = S.newState();
  const a = baker(s, 0, "Ann");
  const b = baker(s, 1, "Bob");
  rate(a, [[1, "sig", "poor"], [1, "tech", "poor"], [1, "show", "poor"], [2, "sig", "poor"], [2, "tech", "poor"], [2, "show", "okay"]]);
  rate(b, [[1, "sig", "poor"], [1, "tech", "poor"], [1, "show", "poor"], [2, "sig", "poor"], [2, "tech", "okay"], [2, "show", "okay"]]);
  assert.equal(S.totalScore(s, a), -5);
  assert.equal(S.totalScore(s, b), -4);
  const order = S.rank(s).ranked.map((r) => r.name);
  assert.ok(order.indexOf("Ann") < order.indexOf("Bob"));
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

test("tie-break: in line to go home ranks below an equal score without it", () => {
  const s = S.newState();
  const cat = baker(s, 0, "Cat");
  const dan = baker(s, 1, "Dan");
  // Cat: good + home flag + star flag = 1 (1 home, 1 star). Dan: good = 1 (no flags).
  rate(cat, [[1, "sig", "good"]]);
  cat.inLineHome[1] = true;
  cat.inLineStar[2] = true;
  rate(dan, [[1, "sig", "good"]]);
  assert.equal(S.totalScore(s, cat), S.totalScore(s, dan));
  const order = S.rank(s).ranked.map((r) => r.name);
  assert.ok(order.indexOf("Cat") < order.indexOf("Dan"));
});

test("tie-break: in line for star baker ranks above an equal score without it", () => {
  const s = S.newState();
  const ann = baker(s, 0, "Ann");
  const bob = baker(s, 1, "Bob");
  // Same total (0), same home flags (1). Ann won Star Baker; Bob was in line for it.
  ann.inLineHome[1] = true;
  s.starBaker[2] = ann.id;
  bob.inLineHome[1] = true;
  bob.inLineStar[2] = true;
  assert.equal(S.totalScore(s, ann), S.totalScore(s, bob));
  const order = S.rank(s).ranked.map((r) => r.name);
  assert.ok(order.indexOf("Ann") < order.indexOf("Bob"));
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

test("tie-break by name uses natural order (Baker 2 before Baker 10)", () => {
  const s = S.newState();
  const order = S.rank(s).ranked.map((r) => r.name);
  assert.deepEqual(order.slice(0, 3), ["Baker 1", "Baker 2", "Baker 3"]);
  assert.equal(order.at(-1), "Baker 12");
});
