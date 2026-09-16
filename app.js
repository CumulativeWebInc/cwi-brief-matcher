/* Brief Matcher — UI wiring. Scoring lives in scoring.js (shared with tests). */
(function () {
  "use strict";

  var ARTIST = "That Boy Hi Hat";
  var SYNC_CONTACT = "hp@cumulativeweb.com";
  var VERIFY_URL = "https://cumulativewebinc.github.io/cwi-learn/teach/";

  var briefEl = document.getElementById("brief");
  var matchBtn = document.getElementById("match-btn");
  var resultsEl = document.getElementById("results");
  var resultsMeta = document.getElementById("results-meta");
  var shareLinkEl = document.getElementById("share-link");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // i18n: every literal CWI18n.t call with a quoted key below is extracted by
  // the cwi-i18n retrofit test (tests/check.py); keep each call a quoted literal.
  // The || English fallback keeps the page working when the loader (or a
  // language table) is unavailable. The loader also auto-translates any
  // data-i18n* attributes inside rendered templates.
  function fill(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m;
    });
  }

  function pitchText(brief, item) {
    var t = item.track;
    var lines = [
      fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.header")) ||  "CWI BRIEF MATCH — {artist} — {title}"), { artist: ARTIST, title: t.title }),
      "",
      fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.brief")) ||  "Brief: {brief}"), { brief: brief }),
      fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.why")) ||  "Why it matched: {reasons} ({score})"), {
        reasons: (item.reasons.length ? item.reasons.join(", ") : (((typeof CWI18n !== "undefined") && CWI18n.t("pitch.no_match")) ||  "no tag matches")),
        score: scoreLabelSafe(item.score)
      }),
      fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.spotify")) ||  "Spotify: {url}"), { url: "https://open.spotify.com/track/" + t.spotify_id }),
      // Clearance wording is a legal statement: kept in English in every
      // language per the cwi-i18n translation decisions (truth rules).
      fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.clearance")) ||  "Clearance: {line}"),
        { line: (((typeof CWI18n !== "undefined") && CWI18n.t("pitch.clearance_line")) ||  "NOT pre-cleared — contact hp@cumulativeweb.com") }),
      fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.explicit")) ||  "Explicit lyrics: {val}"), {
        val: t.explicit === true ? (((typeof CWI18n !== "undefined") && CWI18n.t("pitch.explicit_yes")) ||  "yes")
          : t.explicit === false ? (((typeof CWI18n !== "undefined") && CWI18n.t("pitch.explicit_no")) ||  "no")
          : (((typeof CWI18n !== "undefined") && CWI18n.t("pitch.explicit_unknown")) ||  "unknown")
      })
    ];
    if (t.placement && t.placement.status === "VERIFIED") {
      lines.push(fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.verified")) ||  'VERIFIED playlist placement: #{pos} on "{playlist}" (scan {date})'),
        { pos: t.placement.position, playlist: t.placement.playlist, date: t.placement.scan_date }));
      var proofUrl = (typeof placementProofUrl === "function") ? placementProofUrl(t.placement) : null;
      if (proofUrl) lines.push(fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.proof")) ||  "Trust log proof: {url}"), { url: proofUrl }));
    }
    lines.push("");
    lines.push(fill((((typeof CWI18n !== "undefined") && CWI18n.t("pitch.verify")) ||  "Scores are algorithmic estimates, not human curation. Verify all claims at {url}"),
      { url: VERIFY_URL }));
    return lines.join("\n");
  }

  function scoreLabelSafe(score) {
    var disclaimer = (((typeof CWI18n !== "undefined") && CWI18n.t("score.disclaimer")) ||  null) || SCORE_DISCLAIMER;
    return fill((((typeof CWI18n !== "undefined") && CWI18n.t("card.score_label")) ||  "Score {score} — {disclaimer}"),
      { score: score, disclaimer: disclaimer });
  }

  function renderBrief(brief) {
    var ranked = scoreCatalog(brief, CATALOG);
    resultsEl.innerHTML = "";
    if (ranked.length === 0) {
      resultsMeta.textContent = (((typeof CWI18n !== "undefined") && CWI18n.t("results.none")) ||  "No matches. Try scene words like: night, chase, love, fight, dream, city, luxury, horror.");
      shareLinkEl.style.display = "none";
      return;
    }
    var disclaimer = (((typeof CWI18n !== "undefined") && CWI18n.t("score.disclaimer")) ||  null) || SCORE_DISCLAIMER;
    resultsMeta.textContent = fill(
      ranked.length === 1
        ? (((typeof CWI18n !== "undefined") && CWI18n.t("results.ranked_one")) ||  "1 track matched — ranked by score ({disclaimer})")
        : (((typeof CWI18n !== "undefined") && CWI18n.t("results.ranked_many")) ||  "{n} tracks matched — ranked by score ({disclaimer})"),
      { n: ranked.length, disclaimer: disclaimer });
    var shareUrl = location.origin + location.pathname + "?brief=" + encodeURIComponent(brief);
    shareLinkEl.style.display = "";
    shareLinkEl.href = shareUrl;
    shareLinkEl.textContent = (((typeof CWI18n !== "undefined") && CWI18n.t("results.share")) ||  "Share these results");

    ranked.forEach(function (item, i) {
      var t = item.track;
      var card = document.createElement("article");
      card.className = "card";
      var placementHtml = "";
      if (t.placement && t.placement.status === "VERIFIED") {
        // VERIFIED badge links to the cryptographic proof in the CWI Trust Log.
        // Gated on placementProofUrl: no live proof URL, no link — never ship a dead proof link.
        var proofUrl = (typeof placementProofUrl === "function") ? placementProofUrl(t.placement) : null;
        var badge = proofUrl
          ? '<a class="verified-proof" href="' + esc(proofUrl) + '" target="_blank" rel="noopener" data-i18n-title="card.proof_title" title="View cryptographic proof in the CWI Trust Log" data-i18n="card.placement_badge">VERIFIED placement</a>'
          : '<span data-i18n="card.placement_badge">VERIFIED placement</span>';
        placementHtml = '<p class="placement">' + badge + ': ' +
          fill((((typeof CWI18n !== "undefined") && CWI18n.t("card.placement_line")) ||  "#{pos} on {playlist} (scan {date})"), {
            pos: "#" + t.placement.position,
            playlist: '<a href="' + esc(t.placement.playlist_url) + '" target="_blank" rel="noopener">' +
              esc(t.placement.playlist) + "</a>",
            date: esc(t.placement.scan_date)
          }) + "</p>";
      }
      var explicitBadge = t.explicit === true ? '<span class="badge badge-exp" data-i18n="card.explicit">explicit</span>' :
        t.explicit === false ? '<span class="badge badge-clean" data-i18n="card.clean">clean</span>' :
        '<span class="badge" data-i18n="card.explicit_unknown">explicit: unknown</span>';
      card.innerHTML =
        '<header class="card-head">' +
          '<div class="rank">#' + (i + 1) + '</div>' +
          '<div><h2>' + esc(t.title) + '</h2>' +
          '<p class="artist">' + esc(ARTIST) + ' ' + explicitBadge + '</p></div>' +
        '</header>' +
        '<p class="score">' + esc(scoreLabelSafe(item.score)) + '</p>' +
        '<p class="reasons">' + esc(fill((((typeof CWI18n !== "undefined") && CWI18n.t("card.reasons")) ||  "matched: {reasons}"),
          { reasons: item.reasons.join(", ") || "—" })) + '</p>' +
        '<p class="tags">' + esc(fill((((typeof CWI18n !== "undefined") && CWI18n.t("card.tags")) ||  "editorial tags: {tags}"),
          { tags: (t.mood_tags || []).join(", ") })) + '</p>' +
        placementHtml +
        '<p class="clearance">' + esc(fill((((typeof CWI18n !== "undefined") && CWI18n.t("card.clearance")) ||  "NOT pre-cleared — contact {email}"),
          { email: SYNC_CONTACT })) + '</p>' +
        '<iframe class="embed" src="https://open.spotify.com/embed/track/' + esc(t.spotify_id) +
        '" width="100%" height="152" frameborder="0" allowtransparency="true" ' +
        'allow="encrypted-media" loading="lazy" title="Spotify player: ' + esc(t.title) + '"></iframe>' +
        '<button class="copy-btn" type="button" data-i18n="card.copy">Copy pitch</button>';
      var btn = card.querySelector(".copy-btn");
      btn.addEventListener("click", function () {
        copyPitch(pitchText(brief, item), btn);
      });
      resultsEl.appendChild(card);
    });
  }

  function copyPitch(text, btn) {
    function done(ok) {
      btn.textContent = ok ? (((typeof CWI18n !== "undefined") && CWI18n.t("card.copied")) ||  "Copied ✓") : (((typeof CWI18n !== "undefined") && CWI18n.t("card.copy_fail")) ||  "Copy failed — select manually");
      setTimeout(function () { btn.textContent = (((typeof CWI18n !== "undefined") && CWI18n.t("card.copy")) ||  "Copy pitch"); }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { done(document.execCommand("copy")); } catch (e) { done(false); }
      document.body.removeChild(ta);
    }
  }

  function submit() {
    var brief = briefEl.value.trim();
    if (!brief) {
      resultsMeta.textContent = (((typeof CWI18n !== "undefined") && CWI18n.t("results.prompt")) ||  "Paste a scene brief first.");
      return;
    }
    var url = location.pathname + "?brief=" + encodeURIComponent(brief);
    history.replaceState(null, "", url);
    renderBrief(brief);
  }

  matchBtn.addEventListener("click", submit);
  briefEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  });

  /* Auto-run when loaded with ?brief= (shareable, POST-free URLs). */
  var initial = parseBriefParam(location.search);
  if (initial) {
    briefEl.value = initial;
    renderBrief(initial);
  }
})();
