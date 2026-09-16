/* Brief Matcher — pure scoring logic (no DOM).
 * Shared between the browser app and the node test suite.
 * All matches are algorithmic estimates. NOT human curation. */

"use strict";

var SCORE_DISCLAIMER = "algorithmic estimate \u2014 UNVERIFIED, not human curation";

/* Weight rules — shown on the page under "How scoring works":
 *  - brief token exactly matches a track mood tag: 3 pts per tag
 *  - brief token exactly matches a word in the track title: 2 pts per word
 *  - brief token maps via the synonym table to one or more mood tags,
 *    and the track carries one of those tags: 2 pts per mapped tag
 * Ties break by catalog order (stable sort). */
var WEIGHT_TAG = 3;
var WEIGHT_TITLE = 2;
var WEIGHT_SYNONYM = 2;

/* keyword -> mood tags. Kept visible in code and on the page. */
var SYNONYMS = {
  "chase": ["tension", "high-energy"],
  "run": ["tension", "high-energy"],
  "escape": ["tension", "high-energy"],
  "love": ["seductive"],
  "romance": ["seductive", "noir"],
  "fight": ["danger", "rebellious"],
  "battle": ["warrior", "epic", "tension"],
  "war": ["warrior", "epic"],
  "dream": ["dreamy"],
  "sleep": ["dreamy", "calm"],
  "city": ["neon", "night"],
  "urban": ["street", "neon"],
  "car": ["street", "neon"],
  "drive": ["neon", "street"],
  "night": ["night", "neon", "noir"],
  "neon": ["neon"],
  "wedding": ["luxury"],
  "luxury": ["luxury"],
  "monaco": ["luxury", "cinematic"],
  "horror": ["dark", "supernatural"],
  "ghost": ["supernatural", "dark"],
  "party": ["party", "high-energy"],
  "celebrate": ["triumph", "party"],
  "win": ["triumph", "anthem"],
  "sad": ["melancholic", "emotional"],
  "cry": ["melancholic", "emotional"],
  "hope": ["hopeful"],
  "street": ["street", "gritty"],
  "grind": ["gritty", "street"],
  "calm": ["calm", "reflective"],
  "reflect": ["reflective"],
  "reflective": ["reflective"],
  "dark": ["dark"],
  "danger": ["danger", "dark"],
  "tension": ["tension"],
  "tense": ["tension"],
  "energy": ["high-energy"],
  "epic": ["epic"],
  "triumph": ["triumph"],
  "angel": ["supernatural", "epic"],
  "spirit": ["supernatural", "dark"],
  "psychedelic": ["psychedelic", "surreal"],
  "weird": ["surreal", "psychedelic"],
  "rebel": ["rebellious"],
  "misfit": ["rebellious", "street"],
  "flex": ["braggadocio"],
  "money": ["luxury", "braggadocio"],
  "diamond": ["luxury"],
  "gold": ["luxury", "triumph"],
  "cinematic": ["cinematic", "epic"],
  "film": ["cinematic", "noir"],
  "noir": ["noir"],
  "toxic": ["danger", "dark"]
};

/* Catalog: 24 tracks, from cwi-company/apps/app-factory/week1/catalog-data.json.
 * mood_tags are EDITORIAL, derived from track titles only (no audio analysis).
 * Only the 3 placements marked VERIFIED (scan 2026-09-15) are listed. */
var CATALOG = [
  { title: "Zooted Zone", spotify_id: "0emH8ktA8x4DkOFLsG5xkW",
    mood_tags: ["high-energy", "party", "neon", "triumph"], explicit: null,
    placement: { playlist: "New Rap Hits", position: 30, scan_date: "2026-09-15", status: "VERIFIED",
                 playlist_url: "https://open.spotify.com/playlist/5zhnSpZqKRRaOvRMWuT0bL" } },
  { title: "Shaka Zulu", spotify_id: "3pQEzg7xFqGIk0CK1Za1Kw",
    mood_tags: ["warrior", "triumph", "epic", "tension"], explicit: null,
    placement: { playlist: "New Rap Hits", position: 21, scan_date: "2026-09-15", status: "VERIFIED",
                 playlist_url: "https://open.spotify.com/playlist/5zhnSpZqKRRaOvRMWuT0bL" } },
  { title: "Doves & Diamonds", spotify_id: "4NAyd7rvnuG3DrPFqXo4eQ",
    mood_tags: ["luxury", "reflective", "contrast"], explicit: null,
    placement: { playlist: "New Rap Hits", position: 31, scan_date: "2026-09-15", status: "VERIFIED",
                 playlist_url: "https://open.spotify.com/playlist/5zhnSpZqKRRaOvRMWuT0bL" } },
  { title: "Diabolique", spotify_id: "2eSyWmIdPzEMyWejLb2LBj",
    mood_tags: ["dark", "tension", "seductive"], explicit: null,
    placement: null,
    platforms: { apple_music: "https://music.apple.com/us/album/diabolique/6785863611?i=6785863612",
                 deezer: "https://link.deezer.com/s/34pbBaMFiqpyjOAdZU13M",
                 pandora: "https://pandora.app.link/2qSIxv10r6b",
                 youtube: "https://youtu.be/9AMZIQd47-A" } },
  { title: "Flamerz", spotify_id: "2MDHAUo4zJTHGXGQHUhNw0",
    mood_tags: ["high-energy", "braggadocio"], explicit: true,
    notes: "Producer: Jeck Da General (owner-confirmed).", placement: null },
  { title: "Neon Nights Pt. 777", spotify_id: "4XP56LZjeS0TJUd30kpGSK",
    mood_tags: ["neon", "night", "city"], explicit: true, placement: null },
  { title: "Ultimate", spotify_id: "2daugr3ni3r6jHH6UI57EK",
    mood_tags: ["triumph", "anthem", "epic"], explicit: true, placement: null },
  { title: "Painted Lady", spotify_id: "6nhzq7P7x09aUbPts4ywFl",
    mood_tags: ["seductive", "noir", "neon"], explicit: true, placement: null },
  { title: "Warped and Wicked", spotify_id: "3w4RKguHAT2xd9K0w5CklC",
    mood_tags: ["dark", "psychedelic", "tension"], explicit: true, placement: null },
  { title: "Golden Diamond", spotify_id: "4RFWRhPn8NX0DTQPpl1swe",
    mood_tags: ["luxury", "triumph"], explicit: true, placement: null },
  { title: "Spirits n Shadows", spotify_id: "2tEdW6WKfcs2NGI6OIvAm6",
    mood_tags: ["dark", "supernatural", "tension"], explicit: true, placement: null },
  { title: "Flex My Flame", spotify_id: "7FQvcCS2CdTVsd6hb9jvHx",
    mood_tags: ["braggadocio", "high-energy"], explicit: true, placement: null },
  { title: "Rainbows And Roses", spotify_id: "2ZUYjQGsRLHRcsfgyeAWpo",
    mood_tags: ["contrast", "hopeful", "reflective"], explicit: true, placement: null },
  { title: "Tears and Scars", spotify_id: "6NfxhZ4NebIduGEKZeD2Lk",
    mood_tags: ["emotional", "reflective", "melancholic"], explicit: true, placement: null },
  { title: "Toxic Elements", spotify_id: "2aTbpxiF2jNiB3PGi81oqa",
    mood_tags: ["dark", "tension", "danger"], explicit: true, placement: null },
  { title: "7th Angel", spotify_id: "2dvfN5rFyQO69qmb5oYlRG",
    mood_tags: ["epic", "supernatural", "triumph"], explicit: true, placement: null },
  { title: "Scorpions & Sapphires", spotify_id: "6YQq5GsaUmanh0XyHQIGoR",
    mood_tags: ["danger", "luxury", "dark"], explicit: true, placement: null },
  { title: "Place I Go to Dream", spotify_id: "3KX10tZBft6gp2Nea9HZOB",
    mood_tags: ["dreamy", "reflective", "calm"], explicit: false, placement: null },
  { title: "Place I Go to Dream - Remastered", spotify_id: "31MTBSMfWy4jGEYAilkaH8",
    mood_tags: ["dreamy", "reflective", "calm"], explicit: false, placement: null },
  { title: "Place I Go to Dream - Instrumental", spotify_id: "3tKoMnnlkcRr7wE3PUQ9bp",
    mood_tags: ["dreamy", "calm", "instrumental"], explicit: false,
    notes: "Title is metadata only; not an asserted licensable instrumental.", placement: null },
  { title: "Smokin' Pain", spotify_id: "6jJpR9IhQ9PmRPJpxLlOmK",
    mood_tags: ["gritty", "melancholic", "street"], explicit: true, placement: null },
  { title: "Phantasm", spotify_id: "7xbS3rY8ZzCXNEPLPykf95",
    mood_tags: ["psychedelic", "dark", "surreal"], explicit: true, placement: null },
  { title: "Misfits and Hooligans", spotify_id: "4Z5UCQLqWzpPeihPTZ9Gqg",
    mood_tags: ["rebellious", "street", "high-energy"], explicit: true, placement: null },
  { title: "Roses over Monaco", spotify_id: "3r86CjoxCNvvCz98h2btm1",
    mood_tags: ["luxury", "cinematic", "noir"], explicit: true, placement: null }
];

function tokenize(text) {
  return (text || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 0; });
}

/* Score one track against a token list. Returns { score, reasons: [tag, ...] }.
 * reasons lists each matched mood tag once, in the order first matched. */
function scoreTrack(tokens, track) {
  var score = 0;
  var reasons = [];
  var titleWords = tokenize(track.title);
  var tags = track.mood_tags || [];

  function addReason(tag, pts) {
    if (reasons.indexOf(tag) === -1) reasons.push(tag);
    score += pts;
  }

  tokens.forEach(function (tok) {
    tags.forEach(function (tag) {
      if (tok === tag) addReason(tag, WEIGHT_TAG);
    });
    titleWords.forEach(function (w) {
      if (tok === w) addReason(w, WEIGHT_TITLE);
    });
    var mapped = SYNONYMS[tok];
    if (mapped) {
      mapped.forEach(function (tag) {
        if (tags.indexOf(tag) !== -1) addReason(tag, WEIGHT_SYNONYM);
      });
    }
  });

  return { score: score, reasons: reasons };
}

/* Rank the whole catalog for a brief. Returns array of
 * { track, score, reasons }, sorted by score desc, catalog order on ties.
 * Tracks scoring 0 are excluded. */
function scoreCatalog(brief, catalog) {
  var tracks = catalog || CATALOG;
  var tokens = tokenize(brief);
  if (tokens.length === 0) return [];
  var ranked = [];
  tracks.forEach(function (track) {
    var r = scoreTrack(tokens, track);
    if (r.score > 0) ranked.push({ track: track, score: r.score, reasons: r.reasons });
  });
  ranked.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return tracks.indexOf(a.track) - tracks.indexOf(b.track);
  });
  return ranked;
}

function scoreLabel(score) {
  return "Score " + score + " — " + SCORE_DISCLAIMER;
}

/* Parse ?brief= from a query string (e.g. location.search). Returns the
 * decoded brief or null. POST-free shareable URLs: ?brief=night+chase */
function parseBriefParam(search) {
  if (!search) return null;
  var m = search.match(/[?&]brief=([^&]*)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, " "));
  } catch (e) {
    return null;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SCORE_DISCLAIMER: SCORE_DISCLAIMER,
    WEIGHT_TAG: WEIGHT_TAG,
    WEIGHT_TITLE: WEIGHT_TITLE,
    WEIGHT_SYNONYM: WEIGHT_SYNONYM,
    SYNONYMS: SYNONYMS,
    CATALOG: CATALOG,
    tokenize: tokenize,
    scoreTrack: scoreTrack,
    scoreCatalog: scoreCatalog,
    scoreLabel: scoreLabel,
    parseBriefParam: parseBriefParam
  };
}
