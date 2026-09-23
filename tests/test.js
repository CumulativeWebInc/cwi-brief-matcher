/* Brief Matcher — scoring tests. node --test tests/test.js
 * Verifies the documented weight rules: tag x3 / title x2 / synonym x2,
 * the UNVERIFIED disclaimer, stable ties, and ?brief= parsing. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../scoring.js");

test("tokenize lowercases and splits on non-alphanumerics", () => {
  assert.deepEqual(S.tokenize("Dark TRAP, fight-scene!"), ["dark", "trap", "fight", "scene"]);
});

test("tokenize of empty input is empty", () => {
  assert.deepEqual(S.tokenize(""), []);
});

test("weights match the documented rules", () => {
  assert.equal(S.WEIGHT_TAG, 3);
  assert.equal(S.WEIGHT_TITLE, 2);
  assert.equal(S.WEIGHT_SYNONYM, 2);
});

test("exact tag match scores 3, plus synonym layer when the token is a synonym key", () => {
  // "dark" is both an exact tag (3) and a SYNONYMS key mapping to ["dark"] (2):
  // the layers stack — this is the shipped behavior.
  const track = { title: "X", mood_tags: ["dark"] };
  const r = S.scoreTrack(["dark"], track);
  assert.equal(r.score, 5);
});

test("title word match scores 2 per word (no tag/synonym overlap)", () => {
  const track = { title: "Midnight Run", mood_tags: [] };
  const r = S.scoreTrack(["midnight"], track);
  assert.equal(r.score, 2);
});

test("synonym-mapped tag match scores 2 per mapped tag", () => {
  const track = { title: "X", mood_tags: ["dark"] };
  const r = S.scoreTrack(["horror"], track); // horror -> dark, supernatural
  assert.equal(r.score, 2);
});

test("no matches scores zero with empty reasons", () => {
  const track = { title: "X", mood_tags: ["calm"] };
  const r = S.scoreTrack(["war"], track);
  assert.equal(r.score, 0);
  assert.deepEqual(r.reasons, []);
});

test("scores accumulate across tokens and layers", () => {
  const track = { title: "Neon Night", mood_tags: ["dark", "neon"] };
  // "dark": tag 3 + synonym 2 = 5; "neon": tag 3 + title 2 + synonym 2 = 7
  const r = S.scoreTrack(["dark", "neon"], track);
  assert.equal(r.score, 12);
});

test("scoreCatalog ranks highest score first", () => {
  const tracks = [
    { title: "Calm One", mood_tags: ["calm"] },
    { title: "Dark One", mood_tags: ["dark"] },
  ];
  const ranked = S.scoreCatalog("dark", tracks);
  assert.equal(ranked[0].track.title, "Dark One");
});

test("scoreCatalog ties break by catalog order (stable)", () => {
  const tracks = [
    { title: "First", mood_tags: ["dark"] },
    { title: "Second", mood_tags: ["dark"] },
  ];
  const ranked = S.scoreCatalog("dark", tracks);
  assert.equal(ranked[0].track.title, "First");
  assert.equal(ranked[1].track.title, "Second");
});

test("scoreLabel carries the UNVERIFIED disclaimer", () => {
  const label = S.scoreLabel(7);
  assert.match(label, /UNVERIFIED/);
  assert.match(label, /not human curation/);
});

test("SCORE_DISCLAIMER is exported and honest", () => {
  assert.match(S.SCORE_DISCLAIMER, /UNVERIFIED/);
});

test("parseBriefParam decodes ?brief=", () => {
  assert.equal(S.parseBriefParam("?brief=dark+trap"), "dark trap");
  assert.equal(S.parseBriefParam("?x=1&brief=night%20chase"), "night chase");
});

test("parseBriefParam returns null when absent or empty", () => {
  assert.equal(S.parseBriefParam("?q=nope"), null);
  assert.equal(S.parseBriefParam(""), null);
});

test("catalog is non-empty with mood tags on every track", () => {
  assert.ok(S.CATALOG.length > 0);
  for (const t of S.CATALOG) assert.ok(Array.isArray(t.mood_tags), t.title);
});
