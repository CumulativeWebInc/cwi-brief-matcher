/* Brief Matcher — UI wiring. Scoring lives in scoring.js (shared with tests). */
(function () {
  "use strict";

  var ARTIST = "That Boy Hi Hat";
  var SYNC_CONTACT = "hp@cumulativeweb.com";
  var CLEARANCE_LINE = "NOT pre-cleared \u2014 contact " + SYNC_CONTACT;
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

  function pitchText(brief, item) {
    var t = item.track;
    var lines = [
      "CWI BRIEF MATCH — " + ARTIST + " — " + t.title,
      "",
      "Brief: " + brief,
      "Why it matched: " + (item.reasons.length ? item.reasons.join(", ") : "no tag matches") +
        " (" + scoreLabelSafe(item.score) + ")",
      "Spotify: https://open.spotify.com/track/" + t.spotify_id,
      "Clearance: " + CLEARANCE_LINE,
      "Explicit lyrics: " + (t.explicit === true ? "yes" : t.explicit === false ? "no" : "unknown")
    ];
    if (t.placement && t.placement.status === "VERIFIED") {
      lines.push("Verified playlist placement: #" + t.placement.position + " on \"" +
        t.placement.playlist + "\" (scan " + t.placement.scan_date + ")");
    }
    lines.push("");
    lines.push("Scores are algorithmic estimates, not human curation. Verify all claims at " + VERIFY_URL);
    return lines.join("\n");
  }

  function scoreLabelSafe(score) {
    return (typeof scoreLabel === "function") ? scoreLabel(score) : ("Score " + score);
  }

  function renderBrief(brief) {
    var ranked = scoreCatalog(brief, CATALOG);
    resultsEl.innerHTML = "";
    if (ranked.length === 0) {
      resultsMeta.textContent = "No matches. Try scene words like: night, chase, love, fight, dream, city, luxury, horror.";
      shareLinkEl.style.display = "none";
      return;
    }
    resultsMeta.innerHTML = ranked.length + " track" + (ranked.length === 1 ? "" : "s") +
      " matched &mdash; ranked by score (" + esc(SCORE_DISCLAIMER) + ")";
    var shareUrl = location.origin + location.pathname + "?brief=" + encodeURIComponent(brief);
    shareLinkEl.style.display = "";
    shareLinkEl.href = shareUrl;
    shareLinkEl.textContent = "Share these results";

    ranked.forEach(function (item, i) {
      var t = item.track;
      var card = document.createElement("article");
      card.className = "card";
      var placementHtml = "";
      if (t.placement && t.placement.status === "VERIFIED") {
        placementHtml = '<p class="placement">VERIFIED placement: #' + t.placement.position +
          ' on <a href="' + esc(t.placement.playlist_url) + '" target="_blank" rel="noopener">' +
          esc(t.placement.playlist) + '</a> (scan ' + esc(t.placement.scan_date) + ')</p>';
      }
      var explicitBadge = t.explicit === true ? '<span class="badge badge-exp">explicit</span>' :
        t.explicit === false ? '<span class="badge badge-clean">clean</span>' :
        '<span class="badge">explicit: unknown</span>';
      card.innerHTML =
        '<header class="card-head">' +
          '<div class="rank">#' + (i + 1) + '</div>' +
          '<div><h2>' + esc(t.title) + '</h2>' +
          '<p class="artist">' + esc(ARTIST) + ' ' + explicitBadge + '</p></div>' +
        '</header>' +
        '<p class="score">' + esc(scoreLabelSafe(item.score)) + '</p>' +
        '<p class="reasons">matched: ' + esc(item.reasons.join(", ") || "—") + '</p>' +
        '<p class="tags">editorial tags: ' + esc((t.mood_tags || []).join(", ")) + '</p>' +
        placementHtml +
        '<p class="clearance">' + esc(CLEARANCE_LINE) + '</p>' +
        '<iframe class="embed" src="https://open.spotify.com/embed/track/' + esc(t.spotify_id) +
        '" width="100%" height="152" frameborder="0" allowtransparency="true" ' +
        'allow="encrypted-media" loading="lazy" title="Spotify player: ' + esc(t.title) + '"></iframe>' +
        '<button class="copy-btn" type="button">Copy pitch</button>';
      var btn = card.querySelector(".copy-btn");
      btn.addEventListener("click", function () {
        copyPitch(pitchText(brief, item), btn);
      });
      resultsEl.appendChild(card);
    });
  }

  function copyPitch(text, btn) {
    function done(ok) {
      btn.textContent = ok ? "Copied ✓" : "Copy failed — select manually";
      setTimeout(function () { btn.textContent = "Copy pitch"; }, 2000);
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
      resultsMeta.textContent = "Paste a scene brief first.";
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
