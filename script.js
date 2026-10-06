/* ============================================================================
   WHAT WAS THERE BEFORE  ·  script.js
   ----------------------------------------------------------------------------
   Ein webbasiertes Kunstprojekt über den Entstehungsprozess von Schreiben.
   Idee, Konzept und Umsetzung: Adrian Regez · Code: MIT-Lizenz
   https://whatwastherebefore.com
   Version: siehe SITE.version in site.js

   Leitidee:
     "Der fertige Text ist die Oberfläche.
      Die verworfenen Fassungen bilden seine zeitliche Tiefe."

   Aufbau dieser Datei:
     1.  CONFIG          – alle künstlerischen Stellschrauben an einem Ort
     2.  Zustand         – das Modell des Schreibverlaufs
     3.  Hilfsfunktionen – Messen, Farben, Zahlen, XML
     4.  Aufzeichnung    – robuste Erfassung von Tippen/Löschen/Ersetzen …
     5.  Layout (X/Y)    – echte typografische Positionen inkl. Pausen/Tempo
     6.  Tiefe (Z)       – Löschschichten aus Reihenfolge UND Zeitabstand
     7.  Komposition     – finale Ebene + historische Ebenen
     8.  SVG-Rendering   – dieselbe Geometrie für Bildschirm und Export
     9.  Export          – SVG / PNG / JPG, ohne Abschneiden
    10.  Ablauf & UI     – Intro → Schreiben → Ergebnis
   ============================================================================ */

(function () {
  "use strict";

  // Übersetzung (site.js). Fällt auf Deutsch zurück, falls site.js fehlt.
  const tr = (key, fallback) =>
    (window.WWTB && typeof window.WWTB.t === "function") ? window.WWTB.t(key) : fallback;

  /* ==========================================================================
     1 · CONFIG
     Alle Werte sind bewusst subtil gehalten. Die Vergangenheit soll wie ein
     Abdruck wirken, nicht wie Glitch-Art.
     ======================================================================== */
  const CONFIG = {
    font: "Georgia, 'Times New Roman', serif",
    baseSize: 26,        // px – Grundschriftgröße (identisch zum Editor)
    lineHeight: 46,      // px – Zeilenabstand im Textraum
    wrapWidth: 700,      // px – Umbruchbreite (identisch zur CSS-Textbreite)
    padding: 110,        // px – Rand um das gesamte Werk beim Export
    exportScale: 2,      // Auflösungsfaktor für PNG/JPG

    paper: "#f4f1eb",    // Werkfläche
    ink:   "#1b1a17",    // Tinte
    sepia: "#7c6a4f",    // Alterung historischer Schichten
    faint: "#b3ab9c",    // Legende
    revisionInk: "#8f4a33", // Rubrik-Rost: nachträglich an ein Wort ergänzte Buchstaben

    /* Pausen → Raum (Angaben in Millisekunden) */
    pauseStartMs:      350,   // darunter: normaler Fluss
    pauseHorizMaxMs:   3500,  // bei dieser Pause: maximale horizontale Lücke
    pauseHorizMaxPx:   100,   // px – größte horizontale Lücke
    pauseLineBreakMs:  5000,  // darüber: Zeilenumbruch
    pauseBlankLineMs:  14000, // darüber: zusätzliche Leerzeile

    /* Tempo → Bewegung */
    fastMs:       100,   // Abstand darunter gilt als "schnell" → kursiv
    slowMs:       600,   // Abstand darüber gilt als "langsam"
    trackFastPx:  -0.7,  // px – engere Laufweite bei schnellem Schreiben
    trackSlowPx:   1.3,  // px – offenere Laufweite bei langsamem Schreiben

    /* Tastendauer (dwell) → Mikrovariation (deutlich sichtbarer: Größe & Gewicht) */
    dwellRefMs:        110,   // Referenz "normaler" Anschlag
    dwellForWeightMs:  340,   // ab hier volle Wirkung (etwas früher)
    weightStrokeMax:   1.6,   // px – simuliertes Schriftgewicht (Kontur), kräftiger
    dwellSizeMaxDelta: 5.5,   // px – zusätzliche Größe bei langem Anschlag, größer
    dwellDarkenMax:    0.28,  // Anteil Verdunkelung bei langem Anschlag

    /* Zeitliche Tiefe (Z) – schräge 2.5D-Staffelung, asymptotisch begrenzt */
    depthBaseStep:   1.0,   // Grundtiefe pro Löschung
    depthGapScale:   0.5,   // Zusatz aus zeitlichem Abstand (logarithmisch)
    depthPauseScale: 0.30,  // Zusatztiefe aus sehr langen Pausen im Verworfenen (leicht)
    pauseForDepthMs: 2500,  // ab dieser Pausenlänge wirkt eine Pause auf die Tiefe
    depthTau:        6.5,   // Sättigung der Tiefenkurve
    obliqueMaxX:     130,   // px – maximale Verschiebung nach rechts (2.5D-Ansicht)
    obliqueMaxY:     96,    // px – maximale Verschiebung nach oben (2.5D-Ansicht)
    minScaleDepth:   0.9,   // kleinste Skalierung sehr alter Schichten
    maxBlur:         1.2,   // px – stärkste Unschärfe
    defaultMinOpacity: 0.16,
    sepiaMaxMix:     0.55,  // wie stark alte Schichten ins Sepia altern
    flatOblique:     0.35,  // Anteil des "nach oben-hinten"-Versatzes in der FLACHEN
                            // Ansicht. Die Tiefe wird jetzt im 3D-Raum erkundet, daher
                            // stark reduziert. 0 = ganz an Ort und Stelle, 1 = alte Treppe.
    revisitMs:       1800,  // ab dieser Ruhezeit gilt Weiterschreiben an einem Wort als
                            // nachträgliche Ergänzung (für die Rubrik-Hervorhebung)

    /* Interaktiver 3D-Raum (Explorer)
       Die Gesamttiefe des Raums ist bewusst GEDECKELT: unabhängig davon, wie
       viele Löschungen ein Text ansammelt, bleibt der Raum gut erkundbar.
       Nur die Länge des Endtexts (Zeilen) lässt ihn leicht wachsen. */
    zSpaceBase:    240,  // px – Tiefe des Raums bei kurzen/wenig überarbeiteten Texten
    zSpacePerLine: 5,    // px – Zuwachs je zusätzlicher Zeile des Endtexts
    zSpaceMax:     480,  // px – harte Obergrenze, unabhängig von Textlänge/Löschungen
    view3DW:    1000,   // logische Breite der 3D-Leinwand
    view3DH:    680,    // logische Höhe der 3D-Leinwand
    orbitSpeed: 0.45,   // Grad Drehung je gezogenem Pixel
    zoomMin:    0.25,
    zoomMax:    4.0,
    axis3DColor: "#b3ab9c",

    /* Mausspur – Bewegung, Ruhe und Klicks während des Schreibens.
       Die Positionen werden in ECHTE Textkoordinaten umgerechnet (siehe
       editorToLayout), damit sich der "Mausraum" exakt mit dem "Wortraum"
       deckt. In der flachen Komposition liegt die Spur IM SVG hinter dem
       gesamten Text (verdeckt ihn also nie); im 3D-Raum liegt sie auf der
       Schreibfläche (Z=0) und dreht sich mit. */
    mouseColor:        "#e8ce3f", // helles Kanariengelb – Bewegung & Ruhepunkte
    mouseClickColor:   "#3f6e74", // gedecktes Petrol – Klicks (andere Form, andere Farbe)
    mouseMoveOpacity:  0.62,
    mouseClickOpacity: 0.80,
    mouseLineMin:      0.4,   // px – dünnste Linie (schnelle Bewegung)
    mouseLineMax:      3.2,   // px – dickste Linie (sehr langsame Bewegung)
    mouseSpeedSlow:    0.02,  // px/ms – bei/unter dieser Geschwindigkeit: dickste Linie
    mouseSpeedFast:    0.9,   // px/ms – bei/über dieser Geschwindigkeit: dünnste Linie
    mouseIdleMs:       380,   // ms – Stillstand ab dieser Dauer gilt als "Maus ruht" → Punkt
    mouseDotBaseR:     2.6,   // px – Punktradius direkt an der Ruheschwelle
    mouseDotGrowth:    2.2,   // px – Wachstum je log1p(Ruhesekunden über der Schwelle)
    mouseDotMaxR:      20,    // px – Obergrenze für Ruhepunkte
    mouseSampleMs:     40,    // ms – Mindestabstand zwischen aufgezeichneten Punkten
    mouseMaxSamples:   6000,  // Obergrenze gespeicherter Punkte (Leistung/Dateigröße)
    mouseSurfaceBiasZ: 0.8,   // px – wie weit die Spur im 3D-Raum HINTER der Schreibfläche
                              // liegt, damit der Oberflächentext nie verdeckt wird
    clickClusterR:     16,    // px – Klicks in diesem Radius gelten als eine Stelle
    clickBaseR:        4,     // px – Klick-Markierung bei einem einzelnen Klick
    clickGrowth:       3.2,   // px – Wachstum je log1p(Klickanzahl an dieser Stelle)
    clickMaxR:         16,    // px – Obergrenze für Klick-Markierungen
  };

  const BLUR_LEVELS = [0.35, 0.6, 0.9, 1.2]; // diskrete Unschärfe-Filter


  /* ==========================================================================
     2 · ZUSTAND – das Modell des Schreibverlaufs
     ------------------------------------------------------------------------
     Ein Zeichen ist ein Objekt mit eigener Identität. Wird es gelöscht, ver-
     schwindet es NICHT aus dem Modell – es wandert vom aktuellen Text in das
     "graveyard" und behält dort seine damalige Position.

       {
         id, char,
         createdAt,   ms seit Beginn
         gapBefore,   ms Pause vor diesem Zeichen (Rhythmus)
         iat,         ms Abstand zum vorherigen Zeichen (Tempo)
         dwell,       ms Tastendauer
         deletedAt,   ms der Löschung        (nur historisch)
         layer,       Index der Lösch-Schicht (nur historisch)
         fx, fy       eingefrorene Position   (nur historisch)
       }
     ======================================================================== */
  let liveChars = [];        // aktueller Text (parallel zum Editor-Wert)
  let graveyard = [];        // alle jemals gelöschten Zeichen
  let deletionEvents = [];   // { index, time } je Löschvorgang
  let idCounter = 0;

  let startTime = 0;
  let lastInputTime = 0;
  let finishRel = 0;
  let prevValue = "";
  let firstInput = true;

  let keyDownAt = {};        // e.code -> Zeitpunkt keydown
  let dwellQueue = [];       // frisch erzeugte Einzelzeichen, warten auf dwell

  let lastBuilt = null;      // zwischengespeicherte Komposition für Export

  // Mausspur: mehrere "Striche" (Arrays von Punkten), unterbrochen sobald die
  // Maus das Schreibfeld verlässt; Klicks separat, für die Häufigkeits-
  // Clusterung. Alle Koordinaten stehen in TEXTKOORDINATEN (px, gleicher
  // Ursprung/Maßstab wie das Layout), damit Maus- und Wortraum deckungsgleich sind.
  let mouseStrokes = [];
  let mouseCurrentStroke = null;
  let mouseClicks = [];
  let mouseLastSampleAt = 0;
  let editorMetrics = null;  // gemessene Editor-Metrik (Padding/Rand/Zeilenhöhe/Textbreite)


  /* ==========================================================================
     3 · HILFSFUNKTIONEN
     ======================================================================== */
  const now = () => performance.now();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round  = (n) => Math.round(n);
  const round2 = (n) => Math.round(n * 100) / 100;
  const round3 = (n) => Math.round(n * 1000) / 1000;

  function escapeXML(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Wortzeichen (Buchstaben inkl. Umlaute/Akzente und Ziffern), kein Leerraum/Satzzeichen
  function isWordChar(c) { return !!c && /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/.test(c); }

  // Farben ------------------------------------------------------------------
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    const t = (v) => ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2);
    return "#" + t(r) + t(g) + t(b);
  }
  function mix(a, b, f) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A.r + (B.r - A.r) * f, A.g + (B.g - A.g) * f, A.b + (B.b - A.b) * f);
  }

  // Glyphenbreiten (echte Typografie) ---------------------------------------
  const _measureCtx = document.createElement("canvas").getContext("2d");
  const _advCache = new Map();
  function measureAdvance(chr, size, italic) {
    if (chr === "\n") return 0;
    const key = chr + "|" + size + "|" + (italic ? "i" : "n");
    let v = _advCache.get(key);
    if (v != null) return v;
    _measureCtx.font = (italic ? "italic " : "") + size + "px " + CONFIG.font;
    v = _measureCtx.measureText(chr).width;
    _advCache.set(key, v);
    return v;
  }


  /* ==========================================================================
     4 · AUFZEICHNUNG
     ------------------------------------------------------------------------
     Kern ist ein Präfix/Suffix-Diff zwischen altem und neuem Editor-Wert.
     Er bestimmt exakt, welche Zeichen entfernt und welche eingefügt wurden –
     und funktioniert dadurch gleichermaßen für:
       Tippen · Backspace · Delete · Löschen/Einfügen in der Mitte ·
       Ersetzen markierten Textes · Zeilenumbrüche · Einfügen · Rückgängig.
     ======================================================================== */
  function reconcile(oldVal, newVal, t) {
    // gemeinsamer Präfix
    let p = 0;
    const minLen = Math.min(oldVal.length, newVal.length);
    while (p < minLen && oldVal.charCodeAt(p) === newVal.charCodeAt(p)) p++;
    // gemeinsamer Suffix (ohne Präfix zu überlappen)
    let s = 0;
    while (
      s < minLen - p &&
      oldVal.charCodeAt(oldVal.length - 1 - s) === newVal.charCodeAt(newVal.length - 1 - s)
    ) s++;

    const removedCount = oldVal.length - p - s;
    const insertedText = newVal.slice(p, newVal.length - s);

    // (a) LÖSCHUNG: Positionen im DAMALIGEN Layout einfrieren, dann bestatten
    if (removedCount > 0) {
      const positions = layout(liveChars); // Layout des Textes vor der Löschung
      const refs = liveChars.slice(p, p + removedCount);
      buryEvent(refs, positions, p, t);
      liveChars.splice(p, removedCount);
    }

    // (b) EINFÜGUNG: neue Zeichenobjekte mit Rhythmus/Tempo anlegen
    if (insertedText.length > 0) {
      const gap = firstInput ? null : t - lastInputTime;

      // (3) Erweitert diese Einfügung ein BESTEHENDES Wort? – also nachträgliches
      // Voran-/Zwischen-/Anfügen an schon vorhandene Buchstaben, statt neu zu tippen.
      const beforeCh = liveChars[p - 1];
      const afterCh  = liveChars[p];
      let extendsWord = false;
      if (afterCh && isWordChar(afterCh.char)) {
        extendsWord = true;                                   // vor/zwischen bestehende Buchstaben
      } else if (beforeCh && isWordChar(beforeCh.char)) {
        const age = (t - startTime) - (beforeCh.createdAt || 0);
        if (age > CONFIG.revisitMs) extendsWord = true;       // an ein älteres Wort angehängt
      }

      const objs = [];
      for (let i = 0; i < insertedText.length; i++) {
        objs.push({
          id: idCounter++,
          char: insertedText[i],
          createdAt: t - startTime,
          gapBefore: i === 0 ? gap : null, // Pause nur vor dem ersten Zeichen
          iat: i === 0 ? gap : null,       // eingefügte Blöcke: Tempo unbekannt
          dwell: null,
          revised: extendsWord,            // (3) nachträgliche Ergänzung eines Wortes
        });
      }
      liveChars.splice(p, 0, ...objs);

      // Einzelanschlag für die Tastendauer vormerken
      if (insertedText.length === 1) {
        dwellQueue.push(objs[0]);
        if (dwellQueue.length > 8) dwellQueue.shift();
      }
      firstInput = false;
    }
  }

  function buryEvent(refs, positions, startIdx, t) {
    const layerIndex = deletionEvents.length;
    let maxPause = 0;
    for (const c of refs) if ((c.gapBefore || 0) > maxPause) maxPause = c.gapBefore || 0;
    deletionEvents.push({ index: layerIndex, time: t - startTime, maxPause: maxPause });
    for (let k = 0; k < refs.length; k++) {
      const ch = refs[k];
      const pos = positions[startIdx + k];
      ch.deletedAt = t - startTime;
      ch.layer = layerIndex;
      ch.fx = pos ? pos.gx : 0;
      ch.fy = pos ? pos.gy : 0;
      graveyard.push(ch);
    }
  }

  // Editor-Ereignisse -------------------------------------------------------
  function onKeyDown(e) {
    if (keyDownAt[e.code] == null) keyDownAt[e.code] = now();
  }
  function onKeyUp(e) {
    const down = keyDownAt[e.code];
    if (down == null) return;
    delete keyDownAt[e.code];
    const dwell = now() - down;
    // dem zugehörigen frisch getippten Zeichen zuordnen
    while (dwellQueue.length) {
      const ch = dwellQueue.shift();
      if (ch && ch.dwell == null) { ch.dwell = dwell; break; }
    }
  }
  function onInput(e) {
    const t = now();
    const newVal = e.target.value;
    reconcile(prevValue, newVal, t);
    prevValue = newVal;
    lastInputTime = t;
  }

  // Maus-Erfassung -----------------------------------------------------------
  // Ziel: der "Mausraum" deckt sich exakt mit dem "Wortraum". Dazu wird die
  // Zeigerposition NICHT auf die Außenmaße des Feldes bezogen, sondern in die
  // Textkoordinaten des Layouts umgerechnet: (0,0) = Beginn der ersten Zeile,
  // gleiche Umbruchbreite und gleiche Zeilenhöhe wie der fertige Satz. So landet
  // ein Klick auf ein Wort in der Darstellung auch auf diesem Wort.
  //
  // readEditorMetrics() wird beim Start der Schreibphase einmal aufgerufen und
  // koppelt die Umbruchbreite des Layouts an die tatsächliche Textbreite des
  // Editors – dann brechen Editor und Satz an denselben Stellen um.
  function readEditorMetrics() {
    if (!el.editor || typeof getComputedStyle !== "function") return;
    const cs = getComputedStyle(el.editor);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const bL = parseFloat(cs.borderLeftWidth) || 0;
    const bT = parseFloat(cs.borderTopWidth) || 0;
    const bR = parseFloat(cs.borderRightWidth) || 0;
    const bB = parseFloat(cs.borderBottomWidth) || 0;
    const fs = parseFloat(cs.fontSize) || CONFIG.baseSize;
    let lineH = parseFloat(cs.lineHeight);
    if (!isFinite(lineH) || lineH < 4) lineH = fs * 1.62; // "normal"/einheitenlos abfangen
    const rect = el.editor.getBoundingClientRect();
    const contentW = rect.width - padL - padR - bL - bR;
    const contentH = rect.height - padT - padB - bT - bB;
    editorMetrics = { padL, padT, bL, bT, lineH, contentW, contentH };
    // Wortraum an Mausraum koppeln: Layout bricht dort um, wo auch der Editor umbricht.
    if (contentW > 60) CONFIG.wrapWidth = Math.round(contentW);
  }

  // clientX/Y -> Textkoordinaten (px), oder null außerhalb des Textbereichs.
  function editorToLayout(e) {
    const m = editorMetrics;
    const rect = el.editor.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const padL = m ? m.padL : 42, padT = m ? m.padT : 40;
    const bL = m ? m.bL : 1, bT = m ? m.bT : 1;
    const cW = m ? m.contentW : (rect.width - 84);
    const cH = m ? m.contentH : (rect.height - 82);
    const lineH = m ? m.lineH : CONFIG.baseSize * 1.62;
    const vx = e.clientX - (rect.left + bL + padL);   // sichtbare Position im Textbereich
    const vy = e.clientY - (rect.top + bT + padT);
    // nur INNERHALB des sichtbaren Textbereichs (Content-Box) aufzeichnen
    if (vx < 0 || vy < 0 || vx > cW || vy > cH) return null;
    const scaleX = cW > 0 ? CONFIG.wrapWidth / cW : 1;
    const scaleY = lineH > 0 ? CONFIG.lineHeight / lineH : 1;
    // Scroll-Offset addieren: bei langem Text zeigt das Feld nur einen Ausschnitt
    const sx = el.editor.scrollLeft || 0, sy = el.editor.scrollTop || 0;
    return { x: (vx + sx) * scaleX, y: (vy + sy) * scaleY };
  }

  function mouseSampleCount() {
    let n = mouseClicks.length;
    for (const s of mouseStrokes) n += s.length;
    return n;
  }
  function onEditorPointerMove(e) {
    const p = editorToLayout(e);
    if (!p) { mouseCurrentStroke = null; return; } // außerhalb: Strich unterbrechen
    const t = now();
    if (!mouseCurrentStroke) {
      mouseCurrentStroke = [];
      mouseStrokes.push(mouseCurrentStroke);
    } else if (t - mouseLastSampleAt < CONFIG.mouseSampleMs) {
      return; // Abtastrate begrenzen (Leistung/Dateigröße)
    }
    if (mouseSampleCount() >= CONFIG.mouseMaxSamples) return;
    mouseCurrentStroke.push({ x: p.x, y: p.y, t });
    mouseLastSampleAt = t;
  }
  function onEditorPointerLeave() { mouseCurrentStroke = null; }
  function onEditorPointerDown(e) {
    const p = editorToLayout(e);
    if (!p || mouseClicks.length >= CONFIG.mouseMaxSamples) return;
    mouseClicks.push({ x: p.x, y: p.y, t: now() });
  }


  /* ==========================================================================
     5 · LAYOUT (X / Y)
     ------------------------------------------------------------------------
     Ein linksläufiger Durchlauf mit echten Glyphenbreiten. Erzeugt für jedes
     Zeichen eine Position im Textraum (Ursprung oben links, y wächst nach
     unten). Integriert:
        · Pausen  → horizontale Lücke, sehr lange Pause → Zeilenumbruch
        · Tempo   → Laufweite (Tracking) und Kursiv
        · dwell   → subtile Größe/Gewicht
        · Umbruch → am letzten Leerzeichen (echter Wortumbruch)
     ======================================================================== */
  function styleForChar(ch) {
    let sizeDelta = 0, strokeW = 0, darken = 0;
    if (ch.dwell != null) {
      const over = Math.max(0, ch.dwell - CONFIG.dwellRefMs);
      const f = clamp(over / (CONFIG.dwellForWeightMs - CONFIG.dwellRefMs), 0, 1);
      strokeW = CONFIG.weightStrokeMax * f;
      sizeDelta = CONFIG.dwellSizeMaxDelta * f;
      darken = CONFIG.dwellDarkenMax * f;
    }
    const italic = ch.iat != null && ch.iat < CONFIG.fastMs;
    return { size: CONFIG.baseSize + sizeDelta, strokeW, italic, darken, revised: !!ch.revised };
  }

  function trackingFor(ch) {
    if (ch.iat == null) return 0;
    if (ch.iat <= CONFIG.fastMs) return CONFIG.trackFastPx;
    if (ch.iat >= CONFIG.slowMs) return CONFIG.trackSlowPx;
    const f = (ch.iat - CONFIG.fastMs) / (CONFIG.slowMs - CONFIG.fastMs);
    return CONFIG.trackFastPx + f * (CONFIG.trackSlowPx - CONFIG.trackFastPx);
  }

  function pauseOffset(gap) {
    if (gap == null) return { h: 0, br: 0 };
    if (gap >= CONFIG.pauseBlankLineMs) return { h: 0, br: 2 };
    if (gap >= CONFIG.pauseLineBreakMs) return { h: 0, br: 1 };
    if (gap <= CONFIG.pauseStartMs) return { h: 0, br: 0 };
    const f = clamp(
      (gap - CONFIG.pauseStartMs) / (CONFIG.pauseHorizMaxMs - CONFIG.pauseStartMs), 0, 1
    );
    return { h: CONFIG.pauseHorizMaxPx * f, br: 0 };
  }

  function layout(chars) {
    const items = new Array(chars.length);
    const W = CONFIG.wrapWidth;
    let line = 0;
    let penX = 0;
    let lineStart = 0;      // Index des ersten Zeichens der aktuellen Zeile
    let lastSpace = -1;     // Index des letzten Leerzeichens dieser Zeile

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];

      // harter Zeilenumbruch
      if (ch.char === "\n") {
        items[i] = { i, char: "\n", newline: true, gx: penX, gy: line * CONFIG.lineHeight,
                     adv: 0, size: CONFIG.baseSize, italic: false, strokeW: 0, darken: 0 };
        line++; penX = 0; lineStart = i + 1; lastSpace = -1;
        continue;
      }

      // Pause vor diesem Zeichen
      const pause = pauseOffset(ch.gapBefore);
      let br = pause.br;
      if (br > 0) {
        // Umbruch aus Pause nur an Wortgrenzen zulassen
        const prev = i > 0 ? chars[i - 1].char : "\n";
        const atBoundary = prev === " " || prev === "\n" || i === lineStart;
        if (!atBoundary) br = 0;
      }
      if (br > 0) { line += br; penX = 0; lineStart = i; lastSpace = -1; }
      else        { penX += pause.h; }

      const st = styleForChar(ch);
      const adv = Math.max(0, measureAdvance(ch.char, st.size, st.italic) + trackingFor(ch));

      // Wortumbruch bei Überlauf
      if (penX + adv > W && penX > 0) {
        if (lastSpace >= lineStart) {
          // Zeichen nach dem letzten Leerzeichen in die neue Zeile umbrechen
          line++;
          let nx = 0;
          for (let j = lastSpace + 1; j < i; j++) {
            if (!items[j] || items[j].newline) continue;
            items[j].gx = nx;
            items[j].gy = line * CONFIG.lineHeight;
            nx += items[j].adv;
          }
          penX = nx;
          lineStart = lastSpace + 1;
          lastSpace = -1;
        } else {
          // kein Trennpunkt: hart vor diesem Zeichen umbrechen
          line++; penX = 0; lineStart = i; lastSpace = -1;
        }
      }

      items[i] = { i, char: ch.char, gx: penX, gy: line * CONFIG.lineHeight, adv,
                   size: st.size, italic: st.italic, strokeW: st.strokeW, darken: st.darken, revised: st.revised };
      penX += adv;
      if (ch.char === " ") lastSpace = i;
    }
    return items;
  }


  /* ==========================================================================
     6 · TIEFE (Z)
     ------------------------------------------------------------------------
     Jede Löschung ist eine Schicht. Die Tiefe wächst mit dem ALTER und mit
     dem ZEITLICHEN ABSTAND zwischen den Löschungen: 300 ms erzeugen eine
     kleine, 30 s eine große Distanz (logarithmisch gedämpft).
     ======================================================================== */
  function computeLayerDepths() {
    const evs = deletionEvents.slice().sort((a, b) => a.time - b.time);
    const byIndex = {};
    if (evs.length === 0) return byIndex;

    const surface = Math.max(finishRel, evs[evs.length - 1].time);
    let d = 0;
    for (let i = evs.length - 1; i >= 0; i--) {
      const gap = (i === evs.length - 1)
        ? surface - evs[i].time
        : evs[i + 1].time - evs[i].time;
      const step = CONFIG.depthBaseStep +
                   CONFIG.depthGapScale * Math.log1p(Math.max(0, gap) / 300);
      d += step;
      // sehr lange Pausen im verworfenen Text vertiefen genau diese Schicht (leicht)
      const pauseOver = Math.max(0, (evs[i].maxPause || 0) - CONFIG.pauseForDepthMs);
      const pauseBonus = CONFIG.depthPauseScale * Math.log1p(pauseOver / 1000);
      byIndex[evs[i].index] = d + pauseBonus;
    }
    return byIndex; // Schicht-Index -> Tiefe (älter = größer)
  }

  // Tiefe -> schräge Projektion (asymptotisch begrenzt, damit nie unbrauchbar)
  function projDepth(d) {
    const t = 1 - Math.exp(-Math.max(0, d) / CONFIG.depthTau);
    return {
      t,
      offX: CONFIG.obliqueMaxX * t,
      offY: CONFIG.obliqueMaxY * t,
      scale: 1 - (1 - CONFIG.minScaleDepth) * t,
      blur: CONFIG.maxBlur * t,
    };
  }

  // deterministische Mikro-Verschiebung je Schicht ("Erinnerung ist nie exakt")
  function layerJitter(layer) {
    const a = Math.sin(layer * 127.1) * 43758.5453; const fa = a - Math.floor(a);
    const b = Math.sin(layer * 311.7) * 51234.987;  const fb = b - Math.floor(b);
    return { x: (fa - 0.5) * 4, y: (fb - 0.5) * 3 };
  }

  function blurBucket(b) {
    if (b < 0.2) return 0;
    let idx = 1;
    for (let i = 0; i < BLUR_LEVELS.length; i++) if (b >= BLUR_LEVELS[i]) idx = i + 1;
    return Math.min(idx, BLUR_LEVELS.length);
  }

  // Farben je Ebene (Basisfarbe wählbar: Tinte oder Rubrik-Rost für Ergänzungen)
  function fillSurfaceBase(base, darken) { return mix(base, "#000000", darken); }
  function fillForDepthBase(base, t)     { return mix(base, CONFIG.sepia, CONFIG.sepiaMaxMix * t); }
  function fillSurface(darken) { return fillSurfaceBase(CONFIG.ink, darken); }
  function fillForDepth(t)     { return fillForDepthBase(CONFIG.ink, t); }


  /* ==========================================================================
     7 · KOMPOSITION – finale Ebene + historische Ebenen
     ======================================================================== */
  function buildComposition(opts) {
    const finalItems = layout(liveChars); // Oberfläche (Z = 0)

    const depths = computeLayerDepths();
    const histItems = [];
    for (const ch of graveyard) {
      if (ch.char === "\n" || ch.char === " ") continue; // Unsichtbares nicht zeichnen
      const st = styleForChar(ch);
      const dRaw = (depths[ch.layer] || 0) * opts.depthIntensity;
      const proj = projDepth(dRaw);
      const jit = layerJitter(ch.layer);
      histItems.push({
        char: ch.char,
        x: ch.fx + proj.offX * CONFIG.flatOblique + jit.x,
        top: ch.fy - proj.offY * CONFIG.flatOblique + jit.y,
        size: st.size,
        italic: st.italic,
        strokeW: st.strokeW,
        scale: proj.scale,
        blur: proj.blur,
        depthT: proj.t,
        opacity: 1 - (1 - opts.minOpacity) * proj.t,
        layer: ch.layer,
        revised: st.revised,
      });
    }
    return { finalItems, histItems };
  }

  // tatsächliche Grenzen ALLER Elemente (inkl. Unschärfe-Rand)
  function computeBounds(finalItems, histItems, includeHist) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const consider = (l, tp, r, b) => {
      if (l < minX) minX = l; if (tp < minY) minY = tp;
      if (r > maxX) maxX = r; if (b > maxY) maxY = b;
    };
    for (const it of finalItems) {
      if (it.char === " " || it.char === "\n") continue;
      const adv = measureAdvance(it.char, it.size, it.italic);
      const e = it.strokeW || 0;
      consider(it.gx - e, it.gy - e, it.gx + adv + e, it.gy + it.size * 1.05 + e);
    }
    if (includeHist) {
      for (const it of histItems) {
        const adv = measureAdvance(it.char, it.size, it.italic) * it.scale;
        const bleed = it.blur * 3 + (it.strokeW || 0);
        consider(it.x - bleed, it.top - bleed,
                 it.x + adv + bleed, it.top + it.size * 1.05 * it.scale + bleed);
      }
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = CONFIG.wrapWidth; maxY = CONFIG.lineHeight; }
    return { minX, minY, maxX, maxY };
  }


  /* ==========================================================================
     7b · MAUSSPUR → SVG
     ------------------------------------------------------------------------
     Bewegung/Ruhe (gelb) und Klicks (petrol, geclustert nach Häufigkeit).
     Alle Koordinaten liegen bereits in Textkoordinaten (Mausraum = Wortraum).
     In der flachen Komposition wird die Spur als eigene Ebene VOR dem Text
     gezeichnet (verdeckt ihn also nie). Im 3D-Raum wird dieselbe Spur auf die
     Schreibfläche (Z=0) projiziert und dreht sich mit – siehe mouse3DItems().
     ======================================================================== */
  // Geschwindigkeit (px/ms) -> Linienstärke, logarithmisch interpoliert
  // zwischen "langsam" (dick) und "schnell" (dünn).
  function speedToWidth(speed) {
    const lo = CONFIG.mouseSpeedSlow, hi = CONFIG.mouseSpeedFast;
    const s = clamp(speed, lo, hi);
    const f = (Math.log(s) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
    return CONFIG.mouseLineMax - f * (CONFIG.mouseLineMax - CONFIG.mouseLineMin);
  }

  // Einfache Clusterung nahe beieinanderliegender Punkte (für Klick-Häufigkeit)
  function clusterPoints(points, radius) {
    const clusters = [];
    for (const p of points) {
      let hit = null;
      for (const c of clusters) {
        if (Math.hypot(c.x - p.x, c.y - p.y) <= radius) { hit = c; break; }
      }
      if (hit) {
        hit.x = (hit.x * hit.n + p.x) / (hit.n + 1);
        hit.y = (hit.y * hit.n + p.y) / (hit.n + 1);
        hit.n += 1;
      } else {
        clusters.push({ x: p.x, y: p.y, n: 1 });
      }
    }
    return clusters;
  }

  // Flache Komposition: Koordinaten sind bereits Textkoordinaten (= Layout),
  // also identisch zum Koordinatensystem der Glyphen – kein Umrechnen nötig.
  function buildMouseLayer() {
    if (!mouseStrokes.length && !mouseClicks.length) return "";
    const out = [];

    // Bewegung (Linien, Stärke nach Tempo) & Ruhe (wachsende Punkte)
    out.push(
      '<g fill="' + CONFIG.mouseColor + '" stroke="' + CONFIG.mouseColor +
      '" opacity="' + CONFIG.mouseMoveOpacity + '" stroke-linecap="round">'
    );
    for (const stroke of mouseStrokes) {
      for (let i = 1; i < stroke.length; i++) {
        const a = stroke[i - 1], b = stroke[i];
        const dt = Math.max(1, b.t - a.t);
        if (dt >= CONFIG.mouseIdleMs) {
          const r = clamp(
            CONFIG.mouseDotBaseR + CONFIG.mouseDotGrowth * Math.log1p((dt - CONFIG.mouseIdleMs) / 1000),
            CONFIG.mouseDotBaseR, CONFIG.mouseDotMaxR
          );
          out.push('<circle cx="' + round2(a.x) + '" cy="' + round2(a.y) + '" r="' + round2(r) + '" stroke="none"/>');
        } else {
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          const sw = speedToWidth(dist / dt);
          out.push(
            '<line x1="' + round2(a.x) + '" y1="' + round2(a.y) + '" x2="' + round2(b.x) + '" y2="' + round2(b.y) +
            '" stroke-width="' + round2(sw) + '"/>'
          );
        }
      }
    }
    out.push("</g>");

    // Klicks: nach Häufigkeit geclustert, als Raute (andere Form, andere Farbe)
    if (mouseClicks.length) {
      const clusters = clusterPoints(mouseClicks.map((c) => ({ x: c.x, y: c.y })), CONFIG.clickClusterR);
      out.push(
        '<g fill="none" stroke="' + CONFIG.mouseClickColor + '" stroke-width="1.4" opacity="' +
        CONFIG.mouseClickOpacity + '">'
      );
      for (const c of clusters) {
        const r = clamp(
          CONFIG.clickBaseR + CONFIG.clickGrowth * Math.log1p(c.n - 1),
          CONFIG.clickBaseR, CONFIG.clickMaxR
        );
        out.push(
          '<rect x="' + round2(-r) + '" y="' + round2(-r) + '" width="' + round2(r * 2) +
          '" height="' + round2(r * 2) + '" transform="translate(' + round2(c.x) + ',' + round2(c.y) +
          ') rotate(45)"/>'
        );
      }
      out.push("</g>");
    }
    return out.join("");
  }


  /* ==========================================================================
     8 · SVG-RENDERING
     ------------------------------------------------------------------------
     Dieselbe Geometrie erzeugt Bildschirmbild UND Exportdatei. Die viewBox
     folgt exakt den gemessenen Grenzen plus Rand – nichts wird abgeschnitten.
     ======================================================================== */
  function buildSVG(comp, bounds, opts, forFile) {
    const pad = CONFIG.padding;
    const x0 = bounds.minX - pad;
    const y0 = bounds.minY - pad;
    const w = (bounds.maxX - bounds.minX) + pad * 2;
    const h = (bounds.maxY - bounds.minY) + pad * 2;
    const fam = CONFIG.font;
    const out = [];

    // Die XML-Deklaration MUSS das allererste Zeichen der Datei sein.
    if (forFile) out.push('<?xml version="1.0" encoding="UTF-8"?>');

    out.push(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + round(w) + '" height="' + round(h) +
      '" viewBox="' + round(x0) + " " + round(y0) + " " + round(w) + " " + round(h) + '">'
    );

    // Unschärfe-Filter
    out.push("<defs>");
    for (let i = 1; i <= BLUR_LEVELS.length; i++) {
      out.push(
        '<filter id="b' + i + '" x="-50%" y="-50%" width="200%" height="200%">' +
        '<feGaussianBlur stdDeviation="' + BLUR_LEVELS[i - 1] + '"/></filter>'
      );
    }
    out.push("</defs>");

    // Papier (deckend – wichtig auch für JPG)
    out.push('<rect x="' + round(x0) + '" y="' + round(y0) + '" width="' + round(w) +
             '" height="' + round(h) + '" fill="' + CONFIG.paper + '"/>');

    // ---- Mausspur (ganz hinten: unter jedem Text, auch den historischen Ebenen) ----
    if (opts.showMouse) out.push(buildMouseLayer());

    // ---- Historische Ebenen (hinten): tiefste zuerst ----
    if (opts.showDeleted) {
      const byLayer = new Map();
      for (const it of comp.histItems) {
        if (!byLayer.has(it.layer)) byLayer.set(it.layer, []);
        byLayer.get(it.layer).push(it);
      }
      const layers = [...byLayer.entries()].sort((a, b) => b[1][0].depthT - a[1][0].depthT);
      for (const [, its] of layers) {
        const op = its[0].opacity;
        const level = blurBucket(its[0].blur);
        const filt = level > 0 ? ' filter="url(#b' + level + ')"' : "";
        out.push('<g opacity="' + op.toFixed(3) + '"' + filt + ">");
        for (const it of its) {
          const asc = it.size * 0.8;
          const base = it.revised ? CONFIG.revisionInk : CONFIG.ink;
          const fill = fillForDepthBase(base, it.depthT);
          const stroke = it.strokeW > 0
            ? ' stroke="' + fill + '" stroke-width="' + round2(it.strokeW) + '"' : "";
          out.push(
            '<g transform="translate(' + round2(it.x) + "," + round2(it.top) +
            ") scale(" + round3(it.scale) + ')">' +
            '<text x="0" y="' + round2(asc) + '" font-family="' + fam +
            '" font-size="' + round2(it.size) + '"' +
            (it.italic ? ' font-style="italic"' : "") +
            ' fill="' + fill + '"' + stroke + ">" + escapeXML(it.char) + "</text></g>"
          );
        }
        out.push("</g>");
      }
    }

    // ---- Oberfläche (finaler Text, vorne, am schärfsten/dunkelsten) ----
    out.push("<g>");
    for (const it of comp.finalItems) {
      if (it.char === " " || it.char === "\n") continue;
      const asc = it.size * 0.8;
      const base = it.revised ? CONFIG.revisionInk : CONFIG.ink;
      const fill = fillSurfaceBase(base, it.darken);
      const stroke = it.strokeW > 0
        ? ' stroke="' + fill + '" stroke-width="' + round2(it.strokeW) + '"' : "";
      out.push(
        '<text x="' + round2(it.gx) + '" y="' + round2(it.gy + asc) +
        '" font-family="' + fam + '" font-size="' + round2(it.size) + '"' +
        (it.italic ? ' font-style="italic"' : "") +
        ' fill="' + fill + '"' + stroke + ">" + escapeXML(it.char) + "</text>"
      );
    }
    out.push("</g>");

    // ---- Optionale, dezente Legende ----
    if (opts.showLegend) out.push(buildLegend(x0, y0, w, h));

    out.push("</svg>");
    return { svg: out.join(""), w, h };
  }

  function buildLegend(x0, y0, w, h) {
    const lx = x0 + 30;
    const ly = y0 + h - 34;
    const col = CONFIG.faint;
    const fam = CONFIG.font;
    const L = 52;
    let p = '<g font-family="' + fam + '" font-size="12" fill="' + col + '">';
    // X → rechts
    p += '<line x1="' + lx + '" y1="' + ly + '" x2="' + (lx + L) + '" y2="' + ly +
         '" stroke="' + col + '" stroke-width="1"/>';
    p += '<text x="' + (lx + L + 6) + '" y="' + (ly + 4) + '">' + tr("axisX", "X · Textposition") + '</text>';
    // Y ↓ unten
    p += '<line x1="' + lx + '" y1="' + ly + '" x2="' + lx + '" y2="' + (ly + L * 0.7) +
         '" stroke="' + col + '" stroke-width="1"/>';
    p += '<text x="' + (lx + 5) + '" y="' + (ly + L * 0.7 + 14) + '">' + tr("axisY", "Y · Zeile") + '</text>';
    // Z ↗ nach hinten
    p += '<line x1="' + lx + '" y1="' + ly + '" x2="' + (lx + L * 0.72) + '" y2="' +
         (ly - L * 0.6) + '" stroke="' + col + '" stroke-width="1"/>';
    p += '<text x="' + (lx + L * 0.72 + 6) + '" y="' + (ly - L * 0.6 - 2) +
         '">' + tr("axisZ", "Z · zeitliche Tiefe") + '</text>';
    p += "</g>";
    return p;
  }


  /* ==========================================================================
     9 · EXPORT  (SVG / PNG / JPG – ohne Abschneiden)
     ======================================================================== */
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 120);
  }

  function exportSVG() {
    if (!lastBuilt) return;
    const built = buildSVG(lastBuilt.comp, lastBuilt.bounds, lastBuilt.opts, true);
    downloadBlob(new Blob([built.svg], { type: "image/svg+xml;charset=utf-8" }),
                 "what-was-there-before.svg");
  }

  function exportRaster(type) {
    if (!lastBuilt) return;
    const built = buildSVG(lastBuilt.comp, lastBuilt.bounds, lastBuilt.opts, false);
    const url = URL.createObjectURL(new Blob([built.svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const scale = CONFIG.exportScale;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(built.w * scale);
      canvas.height = Math.round(built.h * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = CONFIG.paper;                    // deckender Grund für JPG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(img, 0, 0, built.w, built.h);
      URL.revokeObjectURL(url);
      const mime = type === "jpg" ? "image/jpeg" : "image/png";
      const name = type === "jpg" ? "what-was-there-before.jpg" : "what-was-there-before.png";
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, name);
      }, mime, type === "jpg" ? 0.95 : undefined);
    };
    img.onerror = () => { URL.revokeObjectURL(url); };
    img.src = url;
  }


  /* ==========================================================================
     9b · INTERAKTIVER 3D-RAUM  (Explorer + Snapshot)
     ------------------------------------------------------------------------
     Dieselben Daten, aber die Tiefe (Z) wird zur echten dritten Achse.
     Gelöschter Text bleibt an seiner ursprünglichen X/Y-Position und tritt nur
     in Z nach hinten. Der Raum lässt sich frei drehen, zoomen, verschieben;
     die Glyphen bleiben zur Kamera gewandt (aus jedem Winkel lesbar). Die
     Zeichenreihenfolge folgt der Kameratiefe (korrekte Verdeckung). Ein
     Snapshot sichert genau die aktuelle Ansicht als SVG, PNG oder JPG.
     ======================================================================== */
  const DEG = Math.PI / 180;
  let scene3D = null;          // gecachte 3D-Punkte (nur bei Opts-Änderung neu)
  let render3DAxes = true;
  let render3DMouse = true;
  const cam = { yaw: -30, pitch: 16, zoom: 1, panX: 0, panY: 0 };

  function build3DScene(opts) {
    const finalItems = layout(liveChars);
    const depths = computeLayerDepths();
    const pts = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxZ = 0;
    let maxLineIdx = 0;

    // Oberfläche (Z = 0)
    for (const it of finalItems) {
      const li = Math.round(it.gy / CONFIG.lineHeight);
      if (li > maxLineIdx) maxLineIdx = li;
      if (it.char === " " || it.char === "\n") continue;
      const adv = measureAdvance(it.char, it.size, it.italic);
      pts.push({ char: it.char, x3: it.gx + adv / 2, y3: it.gy + it.size * 0.4, z3: 0,
                 size: it.size, italic: it.italic, strokeW: it.strokeW, darken: it.darken,
                 kind: "s", depthT: 0, blur: 0, opacity: 1, revised: it.revised });
      if (it.gx < minX) minX = it.gx; if (it.gx + adv > maxX) maxX = it.gx + adv;
      if (it.gy < minY) minY = it.gy; if (it.gy + it.size > maxY) maxY = it.gy + it.size;
    }
    // Zielgröße des Raums: an die Länge des Endtexts gekoppelt (ein kurzer Text
    // bekommt einen kompakten Raum), aber immer gedeckelt bei zSpaceMax – so
    // bleibt der Raum unabhängig von der Anzahl der Löschungen gut erkundbar.
    const targetZSpan = clamp(
      CONFIG.zSpaceBase + (maxLineIdx + 1) * CONFIG.zSpacePerLine,
      CONFIG.zSpaceBase, CONFIG.zSpaceMax
    );
    // Historische Schichten – nur in Z nach hinten, X/Y bleiben original
    if (opts.showDeleted) {
      for (const ch of graveyard) {
        if (ch.char === "\n" || ch.char === " ") continue;
        const st = styleForChar(ch);
        const dRaw = (depths[ch.layer] || 0) * opts.depthIntensity;
        const proj = projDepth(dRaw);
        const jit = layerJitter(ch.layer);
        const adv = measureAdvance(ch.char, st.size, st.italic);
        const z = -targetZSpan * proj.t; // gesättigt (proj.t < 1): nie über die Zielgröße hinaus
        pts.push({ char: ch.char, x3: ch.fx + adv / 2 + jit.x, y3: ch.fy + st.size * 0.4 + jit.y, z3: z,
                   size: st.size, italic: st.italic, strokeW: st.strokeW, darken: 0,
                   kind: "h", depthT: proj.t, blur: proj.blur,
                   opacity: 1 - (1 - opts.minOpacity) * proj.t, revised: st.revised });
        if (ch.fx < minX) minX = ch.fx; if (ch.fx + adv > maxX) maxX = ch.fx + adv;
        if (ch.fy < minY) minY = ch.fy; if (ch.fy + st.size > maxY) maxY = ch.fy + st.size;
        if (-z > maxZ) maxZ = -z;
      }
    }
    if (!isFinite(minX)) { minX = 0; maxX = CONFIG.wrapWidth; minY = 0; maxY = CONFIG.lineHeight; }

    // Rotationspivot: Mitte in X/Y, Z-Mitte zwischen Oberfläche und tiefster Schicht.
    // y wird invertiert (im Textraum wächst y nach unten, im 3D-Raum soll oben = +y sein).
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = -maxZ / 2;
    for (const p of pts) { p.x3 -= cx; p.y3 = -(p.y3 - cy); p.z3 -= cz; }

    const spanX = maxX - minX, spanY = maxY - minY;
    const span = Math.max(spanX, spanY + maxZ * 0.6, 220);
    const fitZoom = (Math.min(CONFIG.view3DW, CONFIG.view3DH) * 0.82) / span;
    return { pts: pts, maxZ: maxZ, extW: spanX, extH: spanY, fitZoom: fitZoom, center: { cx: cx, cy: cy, cz: cz } };
  }

  // 3D → 2D: Rotation um Y (yaw) und X (pitch), orthografisch, mit Zoom.
  function projectPoint(p) {
    const cyw = Math.cos(cam.yaw * DEG), syw = Math.sin(cam.yaw * DEG);
    const cpt = Math.cos(cam.pitch * DEG), spt = Math.sin(cam.pitch * DEG);
    const x1 =  p.x3 * cyw + p.z3 * syw;
    const z1 = -p.x3 * syw + p.z3 * cyw;
    const y1 =  p.y3;
    const y2 = y1 * cpt - z1 * spt;
    const z2 = y1 * spt + z1 * cpt;
    const s = cam.zoom;
    return { X: x1 * s, Y: -y2 * s, depth: z2 };
  }

  // Achsentriade + Bodenfläche zur Orientierung im Raum
  function axis3DItems(cxp, cyp) {
    const s = scene3D;
    const Wx = Math.max(s.extW / 2, 40), Hy = Math.max(s.extH / 2, 40), Zc = Math.max(s.maxZ / 2, 40);
    const col = CONFIG.axis3DColor;
    const P = (x, y, z) => { const pr = projectPoint({ x3: x, y3: y, z3: z }); return { X: cxp + pr.X, Y: cyp + pr.Y, d: pr.depth }; };
    const line = (a, b, dash, op) => ({ kind: "line", x1: a.X, y1: a.Y, x2: b.X, y2: b.Y, z: (a.d + b.d) / 2, stroke: col, sw: 1, dash: dash || "", op: op == null ? 0.85 : op });
    const label = (a, text) => ({ kind: "label", x: a.X + 5, y: a.Y - 4, z: a.d + 1e6, text: text, size: 12, fill: col, op: 0.95 });
    const O = P(-Wx, -Hy, Zc), Xe = P(Wx, -Hy, Zc), Ye = P(-Wx, Hy, Zc), Ze = P(-Wx, -Hy, -Zc);
    const f1 = P(-Wx, -Hy, Zc), f2 = P(Wx, -Hy, Zc), f3 = P(Wx, -Hy, -Zc), f4 = P(-Wx, -Hy, -Zc);
    return [
      line(f1, f2, "2 5", 0.4), line(f2, f3, "2 5", 0.4), line(f3, f4, "2 5", 0.4), line(f4, f1, "2 5", 0.4),
      line(O, Xe), line(O, Ye), line(O, Ze),
      label(Xe, tr("axisX", "X · Textposition")), label(Ye, tr("axisY", "Y · Zeile")), label(Ze, tr("axisZ", "Z · zeitliche Tiefe")),
    ];
  }

  // Mausspur im 3D-Raum: auf die Schreibfläche (Z=0) gelegt, minimal dahinter,
  // damit der Oberflächentext nie verdeckt wird. Dreht/zoomt mit der Kamera.
  function mouse3DItems(cxp, cyp) {
    const s = scene3D;
    if (!s || !s.center) return [];
    const cx = s.center.cx, cy = s.center.cy, cz = s.center.cz;
    const surfZ = -cz - CONFIG.mouseSurfaceBiasZ;
    const z = cam.zoom;
    const toScreen = (lx, ly) => {
      const pr = projectPoint({ x3: lx - cx, y3: -(ly - cy), z3: surfZ });
      return { X: cxp + pr.X, Y: cyp + pr.Y, d: pr.depth };
    };
    const items = [];
    for (const stroke of mouseStrokes) {
      for (let i = 1; i < stroke.length; i++) {
        const a = stroke[i - 1], b = stroke[i];
        const dt = Math.max(1, b.t - a.t);
        const A = toScreen(a.x, a.y);
        if (dt >= CONFIG.mouseIdleMs) {
          const r = clamp(
            CONFIG.mouseDotBaseR + CONFIG.mouseDotGrowth * Math.log1p((dt - CONFIG.mouseIdleMs) / 1000),
            CONFIG.mouseDotBaseR, CONFIG.mouseDotMaxR
          );
          items.push({ kind: "mdot", x: A.X, y: A.Y, r: r * z, z: A.d });
        } else {
          const B = toScreen(b.x, b.y);
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          const sw = speedToWidth(dist / dt);
          items.push({ kind: "mline", x1: A.X, y1: A.Y, x2: B.X, y2: B.Y, sw: sw * z, z: (A.d + B.d) / 2 });
        }
      }
    }
    if (mouseClicks.length) {
      const clusters = clusterPoints(mouseClicks.map((c) => ({ x: c.x, y: c.y })), CONFIG.clickClusterR);
      for (const c of clusters) {
        const P = toScreen(c.x, c.y);
        const r = clamp(CONFIG.clickBaseR + CONFIG.clickGrowth * Math.log1p(c.n - 1), CONFIG.clickBaseR, CONFIG.clickMaxR);
        items.push({ kind: "mdiamond", x: P.X, y: P.Y, r: r * z, z: P.d });
      }
    }
    return items;
  }

  function buildSVG3D(forFile) {
    const W = CONFIG.view3DW, H = CONFIG.view3DH;
    const cxp = W / 2 + cam.panX, cyp = H / 2 + cam.panY;
    const fam = CONFIG.font;
    const out = [];
    if (forFile) out.push('<?xml version="1.0" encoding="UTF-8"?>');
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">');
    out.push("<defs>");
    for (let i = 1; i <= BLUR_LEVELS.length; i++)
      out.push('<filter id="c' + i + '" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="' + BLUR_LEVELS[i - 1] + '"/></filter>');
    out.push("</defs>");
    out.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + CONFIG.paper + '"/>');

    const items = [];
    if (scene3D) {
      for (const p of scene3D.pts) {
        const pr = projectPoint(p);
        items.push({ kind: "glyph", z: pr.depth, p: p, X: cxp + pr.X, Y: cyp + pr.Y });
      }
      if (render3DAxes) for (const a of axis3DItems(cxp, cyp)) items.push(a);
      if (render3DMouse) for (const a of mouse3DItems(cxp, cyp)) items.push(a);
    }
    items.sort((a, b) => a.z - b.z); // fern → nah (Maler-Algorithmus)

    for (const it of items) {
      if (it.kind === "line") {
        out.push('<line x1="' + round2(it.x1) + '" y1="' + round2(it.y1) + '" x2="' + round2(it.x2) + '" y2="' + round2(it.y2) +
                 '" stroke="' + it.stroke + '" stroke-width="' + (it.sw || 1) + '"' + (it.dash ? ' stroke-dasharray="' + it.dash + '"' : "") +
                 ' opacity="' + (it.op == null ? 1 : it.op) + '"/>');
      } else if (it.kind === "label") {
        out.push('<text x="' + round2(it.x) + '" y="' + round2(it.y) + '" font-family="' + fam + '" font-size="' + it.size +
                 '" fill="' + it.fill + '" opacity="' + (it.op == null ? 1 : it.op) + '">' + escapeXML(it.text) + "</text>");
      } else if (it.kind === "mline") {
        out.push('<line x1="' + round2(it.x1) + '" y1="' + round2(it.y1) + '" x2="' + round2(it.x2) + '" y2="' + round2(it.y2) +
                 '" stroke="' + CONFIG.mouseColor + '" stroke-width="' + round2(it.sw) +
                 '" stroke-linecap="round" opacity="' + CONFIG.mouseMoveOpacity + '"/>');
      } else if (it.kind === "mdot") {
        out.push('<circle cx="' + round2(it.x) + '" cy="' + round2(it.y) + '" r="' + round2(it.r) +
                 '" fill="' + CONFIG.mouseColor + '" opacity="' + CONFIG.mouseMoveOpacity + '"/>');
      } else if (it.kind === "mdiamond") {
        out.push('<rect x="' + round2(-it.r) + '" y="' + round2(-it.r) + '" width="' + round2(it.r * 2) +
                 '" height="' + round2(it.r * 2) + '" transform="translate(' + round2(it.x) + ',' + round2(it.y) +
                 ') rotate(45)" fill="none" stroke="' + CONFIG.mouseClickColor + '" stroke-width="' + round2(1.4 * cam.zoom) +
                 '" opacity="' + CONFIG.mouseClickOpacity + '"/>');
      } else {
        const p = it.p;
        const fs = p.size * cam.zoom;
        const asc = fs * 0.35;
        const base = p.revised ? CONFIG.revisionInk : CONFIG.ink;
        const fill = p.kind === "s" ? fillSurfaceBase(base, p.darken) : fillForDepthBase(base, p.depthT);
        const stroke = p.strokeW > 0 ? ' stroke="' + fill + '" stroke-width="' + round2(p.strokeW * cam.zoom) + '"' : "";
        const lvl = p.kind === "h" ? blurBucket(p.blur) : 0;
        const filt = lvl > 0 ? ' filter="url(#c' + lvl + ')"' : "";
        const op = p.opacity < 1 ? ' opacity="' + p.opacity.toFixed(3) + '"' : "";
        out.push('<g' + filt + op + '><text x="' + round2(it.X) + '" y="' + round2(it.Y + asc) +
                 '" text-anchor="middle" font-family="' + fam + '" font-size="' + round2(fs) + '"' +
                 (p.italic ? ' font-style="italic"' : "") + ' fill="' + fill + '"' + stroke + '>' + escapeXML(p.char) + "</text></g>");
      }
    }
    out.push("</svg>");
    return { svg: out.join(""), w: W, h: H };
  }

  let raf3d = 0;
  function scheduleRender3D() { if (raf3d) return; raf3d = requestAnimationFrame(function () { raf3d = 0; render3D(false); }); }
  function render3D(rebuild) {
    const opts = currentOpts();
    if (rebuild || !scene3D) scene3D = build3DScene(opts);
    render3DAxes = opts.showLegend;
    render3DMouse = opts.showMouse;
    el.viz.innerHTML = buildSVG3D(false).svg;
  }

  // Ansichtsmodus (flach / Raum) ------------------------------------------
  let viewMode = "flat";
  function applyModeUI(m) {
    viewMode = m;
    if (el.modeFlat)   el.modeFlat.classList.toggle("is-active", m === "flat");
    if (el.modeSpace)  el.modeSpace.classList.toggle("is-active", m === "space");
    if (el.exportRow)  el.exportRow.classList.toggle("hidden", m === "space");
    if (el.controls3d) el.controls3d.classList.toggle("hidden", m !== "space");
    if (el.viz)        el.viz.classList.toggle("viz--space", m === "space");
  }
  function resetCamera() {
    scene3D = build3DScene(currentOpts());
    cam.yaw = -30; cam.pitch = 16; cam.panX = 0; cam.panY = 0; cam.zoom = scene3D.fitZoom;
  }
  function setViewMode(m) {
    applyModeUI(m);
    if (m === "space") { resetCamera(); render3D(true); }
    else renderStatic();
  }
  function setView(name) {
    if (!scene3D) scene3D = build3DScene(currentOpts());
    cam.panX = 0; cam.panY = 0;
    if (name === "front")      { cam.yaw = 0;   cam.pitch = 0; }
    else if (name === "iso")   { cam.yaw = -30; cam.pitch = 16; }
    else if (name === "side")  { cam.yaw = -88; cam.pitch = 6; }
    else if (name === "top")   { cam.yaw = -24; cam.pitch = 58; }
    cam.zoom = scene3D.fitZoom;
    render3D(false);
  }

  // Zeiger-/Rad-Interaktion (Maus & Touch vereinheitlicht) ----------------
  const ptrs = new Map();
  const g3 = { mode: null, x0: 0, y0: 0, yaw0: 0, pitch0: 0, panX0: 0, panY0: 0, zoom0: 1, dist0: 1, mx0: 0, my0: 0 };
  function pxToLogical() { const r = el.viz.getBoundingClientRect(); return CONFIG.view3DW / Math.max(1, r.width); }
  function twoPtr() { const a = [...ptrs.values()]; const dx = a[0].x - a[1].x, dy = a[0].y - a[1].y; return { dist: Math.hypot(dx, dy) || 1, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2 }; }
  function beginGesture(shift) {
    if (ptrs.size === 1) {
      const p = [...ptrs.values()][0];
      g3.mode = shift ? "pan" : "orbit"; g3.x0 = p.x; g3.y0 = p.y;
      g3.yaw0 = cam.yaw; g3.pitch0 = cam.pitch; g3.panX0 = cam.panX; g3.panY0 = cam.panY;
    } else if (ptrs.size === 2) {
      const m = twoPtr(); g3.mode = "pinch"; g3.dist0 = m.dist; g3.mx0 = m.mx; g3.my0 = m.my;
      g3.zoom0 = cam.zoom; g3.panX0 = cam.panX; g3.panY0 = cam.panY;
    }
  }
  function onVizDown(e) {
    if (viewMode !== "space") return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { el.viz.setPointerCapture(e.pointerId); } catch (_) {}
    beginGesture(e.shiftKey);
  }
  function onVizMove(e) {
    if (viewMode !== "space" || !ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g3.mode === "orbit" && ptrs.size === 1) {
      const p = [...ptrs.values()][0];
      cam.yaw = g3.yaw0 + (p.x - g3.x0) * CONFIG.orbitSpeed;
      cam.pitch = clamp(g3.pitch0 + (p.y - g3.y0) * CONFIG.orbitSpeed, -88, 88);
      scheduleRender3D();
    } else if (g3.mode === "pan" && ptrs.size === 1) {
      const p = [...ptrs.values()][0], k = pxToLogical();
      cam.panX = g3.panX0 + (p.x - g3.x0) * k; cam.panY = g3.panY0 + (p.y - g3.y0) * k;
      scheduleRender3D();
    } else if (g3.mode === "pinch" && ptrs.size >= 2) {
      const m = twoPtr(), k = pxToLogical();
      cam.zoom = clamp(g3.zoom0 * (m.dist / g3.dist0), CONFIG.zoomMin, CONFIG.zoomMax);
      cam.panX = g3.panX0 + (m.mx - g3.mx0) * k; cam.panY = g3.panY0 + (m.my - g3.my0) * k;
      scheduleRender3D();
    }
  }
  function onVizUp(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    try { el.viz.releasePointerCapture(e.pointerId); } catch (_) {}
    if (ptrs.size === 1) { const p = [...ptrs.values()][0]; g3.mode = "orbit"; g3.x0 = p.x; g3.y0 = p.y; g3.yaw0 = cam.yaw; g3.pitch0 = cam.pitch; }
    else if (ptrs.size === 0) g3.mode = null;
  }
  function onVizWheel(e) {
    if (viewMode !== "space") return;
    e.preventDefault();
    cam.zoom = clamp(cam.zoom * Math.exp(-e.deltaY * 0.0015), CONFIG.zoomMin, CONFIG.zoomMax);
    scheduleRender3D();
  }
  function onVizDbl() { if (viewMode === "space") setView("iso"); }

  // Snapshot der aktuellen Ansicht (SVG / PNG / JPG) ----------------------
  function snapshot3D(type) {
    const built = buildSVG3D(type === "svg");
    if (type === "svg") {
      downloadBlob(new Blob([built.svg], { type: "image/svg+xml;charset=utf-8" }), "what-was-there-before-" + tr("fileView", "ansicht") + ".svg");
      return;
    }
    const url = URL.createObjectURL(new Blob([built.svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = function () {
      const scale = CONFIG.exportScale;
      const c = document.createElement("canvas");
      c.width = Math.round(built.w * scale); c.height = Math.round(built.h * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = CONFIG.paper; ctx.fillRect(0, 0, c.width, c.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(img, 0, 0, built.w, built.h);
      URL.revokeObjectURL(url);
      const mime = type === "jpg" ? "image/jpeg" : "image/png";
      const name = "what-was-there-before-" + tr("fileView", "ansicht") + (type === "jpg" ? ".jpg" : ".png");
      c.toBlob(function (b) { if (b) downloadBlob(b, name); }, mime, type === "jpg" ? 0.95 : undefined);
    };
    img.onerror = function () { URL.revokeObjectURL(url); };
    img.src = url;
  }


  /* ==========================================================================
     10 · ABLAUF & UI
     ======================================================================== */
  let el = {};

  function currentOpts() {
    const fade = parseFloat(el.fadeRange.value) / 100;           // 0..1
    const minOpacity = 0.30 + (0.06 - 0.30) * fade;              // mehr Verblassen -> weniger deckend
    return {
      depthIntensity: parseFloat(el.depthRange.value),
      minOpacity,
      showDeleted: el.showDeleted.checked,
      showLegend: el.showLegend.checked,
      showMouse: el.showMouse ? el.showMouse.checked : true,
    };
  }

  function renderStatic() {
    const opts = currentOpts();
    const comp = buildComposition(opts);
    const bounds = computeBounds(comp.finalItems, comp.histItems, opts.showDeleted);
    const built = buildSVG(comp, bounds, opts, false);
    el.viz.innerHTML = built.svg;
    lastBuilt = { comp, bounds, opts };
  }

  // Verteiler: je nach Ansichtsmodus flache Komposition oder 3D-Raum
  function renderVisualization() {
    if (viewMode === "space") render3D(true);
    else renderStatic();
  }

  function resetState() {
    liveChars = [];
    graveyard = [];
    deletionEvents = [];
    idCounter = 0;
    startTime = now();
    lastInputTime = startTime;
    finishRel = 0;
    prevValue = "";
    firstInput = true;
    keyDownAt = {};
    dwellQueue = [];
    lastBuilt = null;
    mouseStrokes = [];
    mouseCurrentStroke = null;
    mouseClicks = [];
    mouseLastSampleAt = 0;
    editorMetrics = null;
    el.editor.value = "";
  }

  function show(section) {
    el.intro.classList.toggle("hidden", section !== "intro");
    el.writing.classList.toggle("hidden", section !== "writing");
    el.result.classList.toggle("hidden", section !== "result");
    document.body.setAttribute("data-stage", section);   // Fusszeile beim Schreiben ausblenden
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function begin() {
    resetState();
    show("writing");
    readEditorMetrics();   // Mausraum an Wortraum koppeln (Umbruchbreite/Zeilenhöhe messen)
    setTimeout(() => el.editor.focus(), 30);
  }

  function finish() {
    finishRel = now() - startTime;
    el.finalText.textContent = el.editor.value;
    show("result");
    applyModeUI("flat");     // jedes Ergebnis beginnt mit der Komposition
    renderVisualization();
  }

  function restart() {
    resetState();
    show("intro");
  }

  function init() {
    el = {
      intro:      document.getElementById("intro"),
      writing:    document.getElementById("writingSection"),
      result:     document.getElementById("resultSection"),
      editor:     document.getElementById("editor"),
      finalText:  document.getElementById("finalText"),
      viz:        document.getElementById("visualization"),
      depthRange: document.getElementById("depthRange"),
      fadeRange:  document.getElementById("fadeRange"),
      showDeleted:document.getElementById("showDeleted"),
      showLegend: document.getElementById("showLegend"),
      showMouse:  document.getElementById("showMouse"),
      modeFlat:   document.getElementById("modeFlat"),
      modeSpace:  document.getElementById("modeSpace"),
      exportRow:  document.getElementById("exportRow"),
      controls3d: document.getElementById("controls3d"),
    };

    document.getElementById("startButton").addEventListener("click", begin);
    document.getElementById("finishButton").addEventListener("click", finish);
    document.getElementById("restartButton").addEventListener("click", restart);

    document.getElementById("exportPng").addEventListener("click", () => exportRaster("png"));
    document.getElementById("exportJpg").addEventListener("click", () => exportRaster("jpg"));
    document.getElementById("exportSvg").addEventListener("click", exportSVG);

    // Ansichtsmodus: Komposition (flach) ⇄ Raum erkunden (3D)
    if (el.modeFlat)  el.modeFlat.addEventListener("click", () => setViewMode("flat"));
    if (el.modeSpace) el.modeSpace.addEventListener("click", () => setViewMode("space"));

    // Blickwinkel-Voreinstellungen und Zurücksetzen
    document.querySelectorAll(".view-btn").forEach((b) =>
      b.addEventListener("click", () => {
        const v = b.getAttribute("data-view");
        if (v === "reset") { resetCamera(); render3D(false); } else setView(v);
      })
    );

    // Snapshot der aktuellen 3D-Ansicht
    const snapSvg = document.getElementById("snapSvg");
    const snapPng = document.getElementById("snapPng");
    const snapJpg = document.getElementById("snapJpg");
    if (snapSvg) snapSvg.addEventListener("click", () => snapshot3D("svg"));
    if (snapPng) snapPng.addEventListener("click", () => snapshot3D("png"));
    if (snapJpg) snapJpg.addEventListener("click", () => snapshot3D("jpg"));

    // Maus & Touch: drehen / zoomen / verschieben im Raum
    el.viz.addEventListener("pointerdown", onVizDown);
    el.viz.addEventListener("pointermove", onVizMove);
    el.viz.addEventListener("pointerup", onVizUp);
    el.viz.addEventListener("pointercancel", onVizUp);
    el.viz.addEventListener("wheel", onVizWheel, { passive: false });
    el.viz.addEventListener("dblclick", onVizDbl);

    ["input", "change"].forEach((ev) => {
      el.depthRange.addEventListener(ev, renderVisualization);
      el.fadeRange.addEventListener(ev, renderVisualization);
    });
    el.showDeleted.addEventListener("change", renderVisualization);
    el.showLegend.addEventListener("change", renderVisualization);
    if (el.showMouse) el.showMouse.addEventListener("change", renderVisualization);

    // Aufzeichnung
    el.editor.addEventListener("keydown", onKeyDown);
    el.editor.addEventListener("keyup", onKeyUp);
    el.editor.addEventListener("input", onInput);

    // Mausspur: Bewegung/Ruhe/Klicks, nur solange der Zeiger über dem Schreibfeld ist
    el.editor.addEventListener("pointermove", onEditorPointerMove);
    el.editor.addEventListener("pointerdown", onEditorPointerDown);
    el.editor.addEventListener("pointerleave", onEditorPointerLeave);

    // Komfort: Strg/Cmd + Enter beendet die Schreibphase
    el.editor.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); finish(); }
    });
  }

  // Sprachwechsel: Achsenbeschriftungen im Bild neu setzen, ohne den Text zu verlieren
  document.addEventListener("wwtb:langchange", () => {
    if (el.result && !el.result.classList.contains("hidden")) renderVisualization();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
