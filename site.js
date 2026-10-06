/* ============================================================================
   WHAT WAS THERE BEFORE  ·  site.js
   ----------------------------------------------------------------------------
   Werkangaben, Sprachumschaltung (Deutsch/Englisch), Zitiervorschlag und
   Metadaten. Wird auf allen Seiten geladen.

   Datenschutz: Diese Datei speichert nichts. Keine Cookies, kein localStorage,
   keine Netzwerkanfragen. Die Sprache steht nur in der Adresse (?lang=en).
   ============================================================================ */

(function () {
  "use strict";

  /* ==========================================================================
     WERKANGABEN – NUR HIER PFLEGEN
     Alle Stellen der Website (Kopf- und Fusszeile, Impressum, Datenschutz,
     Zitiervorschlag, Metadaten für Suchmaschinen) lesen diese Werte.
     ======================================================================== */
  const SITE = {
    givenName:  "Adrian",
    familyName: "Regez",
    location:   "Schweiz",                 // Ort/Land für das Impressum, z. B. "Bern, Schweiz"
    email:      "contact@whatwastherebefore.com",
    url:        "https://whatwastherebefore.com",
    host:       "Hostpoint AG, Rapperswil-Jona (CH)",
    year:       "2026",                    // Jahr der Erstveröffentlichung
    version:    "1.0.1",                   // muss zum Release-Tag auf GitHub passen (v1.0.1)
    versionDate:"2026-10-06",              // Datum dieser Version (JJJJ-MM-TT)

    // ← DOI eintragen, sobald vorhanden – nur die Nummer, ohne https://doi.org/
    //   Empfohlen: die «Concept DOI» von Zenodo (steht für alle Versionen),
    //   z. B. "10.5281/zenodo.1234567". Leer lassen = wird nirgends angezeigt.
    doi:  "10.5281/zenodo.23191901",

    // ← Adresse des Git-Repositoriums eintragen, sobald es öffentlich ist,
    //   z. B. "https://github.com/benutzername/what-was-there-before".
    //   Leer lassen = wird nirgends angezeigt.
    repo: "https://github.com/AdiRegez/whatwastherebefore",
  };
  SITE.author = SITE.givenName + " " + SITE.familyName;
  SITE.doiUrl = SITE.doi ? "https://doi.org/" + SITE.doi : "";


  /* ==========================================================================
     Kurze Texte, die nicht als HTML-Paar vorliegen (Titel, Attribute …)
     ======================================================================== */
  const DICT = {
    de: {
      title_home:     "What Was There Before – Was vorher da war",
      title_about:    "Über das Projekt – What Was There Before",
      title_research: "Forschung und Zitieren – What Was There Before",
      title_privacy:  "Datenschutz – What Was There Before",
      title_legal:    "Impressum und Kontakt – What Was There Before",
      desc_home:      "Ein interaktives Kunstwerk, das den Schreibprozess als Palimpsest sichtbar macht: Tempo, Pausen, Streichungen, Ergänzungen und die Spur der Maus.",
      desc_about:     "Idee und verwandte Arbeiten: wie What Was There Before Schreibforschung, Spur und Palimpsest zu einem navigierbaren Bild des Schreibens verbindet.",
      desc_research:  "What Was There Before in Forschung und Lehre: Zitiervorschlag, DOI, Quellcode, Lizenz und Versionen.",
      desc_privacy:   "Datenschutz bei What Was There Before: Was du schreibst, bleibt in deinem Browser. Keine Cookies, kein Tracking.",
      desc_legal:     "Impressum und Kontakt von What Was There Before.",
      placeholder:   "Beginne zu schreiben …",
      viewmodeLabel: "Ansicht",
      langLabel:     "Sprache",
      navLabel:      "Hauptnavigation",
      footNavLabel:  "Weitere Seiten",
      tocLabel:      "Inhalt dieser Seite",
      homeLabel:     "What Was There Before – zum Werk",
      axisX:         "X · Textposition",
      axisY:         "Y · Zeile",
      axisZ:         "Z · zeitliche Tiefe",
      fileView:      "ansicht",
      copy:          "Kopieren",
      copied:        "Kopiert",
      copyFailed:    "Bitte von Hand markieren und kopieren",
    },
    en: {
      title_home:     "What Was There Before",
      title_about:    "About the project – What Was There Before",
      title_research: "Research and citation – What Was There Before",
      title_privacy:  "Privacy – What Was There Before",
      title_legal:    "Legal notice and contact – What Was There Before",
      desc_home:      "An interactive artwork that makes the writing process visible as a palimpsest: tempo, pauses, deletions, additions and the trail of the mouse.",
      desc_about:     "Idea and related work: how What Was There Before combines writing research, trace and palimpsest into a navigable image of writing.",
      desc_research:  "What Was There Before in research and teaching: how to cite, DOI, source code, licence and versions.",
      desc_privacy:   "Privacy at What Was There Before: what you write stays in your browser. No cookies, no tracking.",
      desc_legal:     "Legal notice and contact for What Was There Before.",
      placeholder:   "Start writing …",
      viewmodeLabel: "View",
      langLabel:     "Language",
      navLabel:      "Main navigation",
      footNavLabel:  "More pages",
      tocLabel:      "On this page",
      homeLabel:     "What Was There Before – to the work",
      axisX:         "X · position in text",
      axisY:         "Y · line",
      axisZ:         "Z · temporal depth",
      fileView:      "view",
      copy:          "Copy",
      copied:        "Copied",
      copyFailed:    "Please select and copy by hand",
    },
  };

  const LANGS = ["de", "en"];
  let lang = (new URLSearchParams(location.search).get("lang") === "en") ? "en" : "de";

  function t(key) {
    const d = DICT[lang] || DICT.de;
    return (key in d) ? d[key] : (DICT.de[key] || key);
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }


  /* ==========================================================================
     Zitiervorschlag – APA 7, wie im Literaturverzeichnis der Website
     Mit DOI wird die DOI angegeben, sonst die Adresse der Website.
     ======================================================================== */
  function citationHTML() {
    const where = SITE.doiUrl || SITE.url;
    if (lang === "en") {
      return esc(SITE.familyName) + ", " + esc(SITE.givenName.charAt(0)) + ". (" + SITE.year + "). " +
        "<i>What Was There Before</i> (Version " + SITE.version + ") [Interactive web application]. " + esc(where);
    }
    return esc(SITE.familyName) + ", " + esc(SITE.givenName.charAt(0)) + ". (" + SITE.year + "). " +
      "<i>What Was There Before / Was vorher da war</i> (Version " + SITE.version + ") [Interaktive Webanwendung]. " + esc(where);
  }

  function bibtex() {
    const key = (SITE.familyName.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "") || "author") +
                SITE.year + "whatwastherebefore";
    const lines = [
      "  author  = {" + SITE.familyName + ", " + SITE.givenName + "}",
      "  title   = {What Was There Before / Was vorher da war}",
      "  year    = {" + SITE.year + "}",
      "  version = {" + SITE.version + "}",
    ];
    if (SITE.doi) lines.push("  doi     = {" + SITE.doi + "}");
    lines.push("  url     = {" + (SITE.doiUrl || SITE.url) + "}");
    if (SITE.repo) lines.push("  repository = {" + SITE.repo + "}");
    lines.push("  note    = {" + (lang === "en" ? "Interactive web application" : "Interaktive Webanwendung") + "}");
    return "@software{" + key + ",\n" + lines.join(",\n") + "\n}";
  }


  /* ==========================================================================
     Werte in die Seite schreiben
     ======================================================================== */
  function fillSite() {
    const map = {
      author: SITE.author,
      version: SITE.version,
      versionDate: SITE.versionDate,
      year: SITE.year,
      location: SITE.location,
      host: SITE.host,
      url: SITE.url.replace(/^https?:\/\//, ""),
      email: SITE.email,
      doi: SITE.doi,
      repo: SITE.repo.replace(/^https?:\/\//, ""),
    };
    document.querySelectorAll("[data-site]").forEach((n) => {
      const k = n.getAttribute("data-site");
      if (k in map) n.textContent = map[k];
    });

    // E-Mail-Links werden hier vervollständigt
    document.querySelectorAll("[data-mail]").forEach((a) => {
      a.setAttribute("href", "mailto:" + SITE.email);
      if (!a.textContent.trim()) a.textContent = SITE.email;
    });

    // Links auf Website, DOI und Repositorium
    const hrefs = { url: SITE.url, doi: SITE.doiUrl, repo: SITE.repo };
    document.querySelectorAll("[data-site-href]").forEach((a) => {
      const v = hrefs[a.getAttribute("data-site-href")];
      if (v) a.setAttribute("href", v);
    });

    // Elemente, die nur erscheinen, wenn DOI bzw. Repositorium eingetragen sind
    const has = { doi: !!SITE.doi, repo: !!SITE.repo };
    document.querySelectorAll("[data-when]").forEach((n) => {
      const k = n.getAttribute("data-when");
      const neg = k.charAt(0) === "!";
      const v = has[neg ? k.slice(1) : k];
      n.hidden = neg ? v : !v;
    });

    const cite = document.getElementById("citeText");
    if (cite) cite.innerHTML = citationHTML();
    const bib = document.getElementById("citeBib");
    if (bib) bib.textContent = bibtex();
  }

  function applyLang() {
    const html = document.documentElement;
    html.setAttribute("lang", lang);

    const page = (document.body && document.body.getAttribute("data-page")) || "home";
    document.title = t("title_" + page);
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", t("desc_" + page));

    // Kanonische Adresse je Sprache (wird im <head> schon früh gesetzt)
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", canon.getAttribute("href").split("?")[0] + (lang === "en" ? "?lang=en" : ""));

    document.querySelectorAll("[data-i18n-placeholder]").forEach((n) =>
      n.setAttribute("placeholder", t(n.getAttribute("data-i18n-placeholder"))));
    document.querySelectorAll("[data-i18n-aria]").forEach((n) =>
      n.setAttribute("aria-label", t(n.getAttribute("data-i18n-aria"))));
    document.querySelectorAll("[data-i18n]").forEach((n) =>
      n.textContent = t(n.getAttribute("data-i18n")));

    document.querySelectorAll("[data-set-lang]").forEach((b) => {
      const on = b.getAttribute("data-set-lang") === lang;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("is-active", on);
    });

    // Interne Links tragen die Sprache weiter
    document.querySelectorAll("a[data-internal]").forEach((a) => {
      const raw = a.getAttribute("data-internal");       // z. B. "privacy.html#kurz"
      const [path, hash] = raw.split("#");
      a.setAttribute("href", (path || "./") + (lang === "en" ? "?lang=en" : "") + (hash ? "#" + hash : ""));
    });

    fillSite();
  }

  function setLang(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next;
    const u = new URL(location.href);
    if (lang === "en") u.searchParams.set("lang", "en"); else u.searchParams.delete("lang");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
    applyLang();
    document.dispatchEvent(new CustomEvent("wwtb:langchange", { detail: { lang } }));
  }


  /* ==========================================================================
     Kopieren (Zitiervorschlag)
     ======================================================================== */
  function copyFrom(btn) {
    const target = document.getElementById(btn.getAttribute("data-copy"));
    if (!target) return;
    const text = target.textContent;
    const label = btn.querySelector(".copy-label") || btn;
    const done = (msg) => {
      label.textContent = msg;
      setTimeout(() => { label.textContent = t("copy"); }, 1800);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => done(t("copied")), () => done(t("copyFailed")));
    } else {
      const r = document.createRange(); r.selectNodeContents(target);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      try { document.execCommand("copy"); done(t("copied")); } catch (e) { done(t("copyFailed")); }
    }
  }


  /* ==========================================================================
     Strukturierte Metadaten (Urheberschaft für Suchmaschinen und Kataloge)
     ======================================================================== */
  function addJsonLd() {
    const person = { "@type": "Person", "name": SITE.author, "givenName": SITE.givenName,
                     "familyName": SITE.familyName, "email": "mailto:" + SITE.email };
    const data = {
      "@context": "https://schema.org",
      "@type": ["WebApplication", "CreativeWork"],
      "name": "What Was There Before",
      "alternateName": "Was vorher da war",
      "url": SITE.url + "/",
      "image": SITE.url + "/og-image.png",
      "applicationCategory": "Art",
      "operatingSystem": "Web browser",
      "inLanguage": ["de", "en"],
      "softwareVersion": SITE.version,
      "dateModified": SITE.versionDate,
      "copyrightYear": SITE.year,
      "author":   person,
      "creator":  person,
      "license":  ["https://opensource.org/licenses/MIT", "https://creativecommons.org/licenses/by/4.0/"],
      "isAccessibleForFree": true,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CHF" },
      "description": DICT.de.desc_home,
    };
    const same = [];
    if (SITE.doi) {
      data.identifier = { "@type": "PropertyValue", "propertyID": "DOI", "value": SITE.doi, "url": SITE.doiUrl };
      same.push(SITE.doiUrl);
    }
    if (SITE.repo) { data.codeRepository = SITE.repo; same.push(SITE.repo); }
    if (same.length) data.sameAs = same;

    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }


  /* ==========================================================================
     Öffentliche Schnittstelle für script.js
     ======================================================================== */
  window.WWTB = { t, SITE, get lang() { return lang; } };

  function init() {
    document.querySelectorAll("[data-set-lang]").forEach((b) =>
      b.addEventListener("click", () => setLang(b.getAttribute("data-set-lang"))));
    document.querySelectorAll("[data-copy]").forEach((b) =>
      b.addEventListener("click", () => copyFrom(b)));
    addJsonLd();
    applyLang();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
