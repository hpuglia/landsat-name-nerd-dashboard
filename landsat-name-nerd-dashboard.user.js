// ==UserScript==
// @name         Landsat Name - Modo Nerd Dashboard
// @namespace    puglia.tools.landsat
// @author       Puglia
// @version      1.0.2
// @description  Dashboard interno para a ferramenta Your Name in Landsat, com estatísticas, gráficos, detalhes por país e galeria.
// @match        https://science.nasa.gov/specials/your-name-in-landsat/*
// @grant        none
// @run-at       document-idle
// @homepageURL  https://github.com/hpuglia/landsat-name-nerd-dashboard
// @supportURL   https://github.com/hpuglia/landsat-name-nerd-dashboard/issues
// @downloadURL  https://raw.githubusercontent.com/hpuglia/landsat-name-nerd-dashboard/main/landsat-name-nerd-dashboard.user.js
// @updateURL    https://raw.githubusercontent.com/hpuglia/landsat-name-nerd-dashboard/main/landsat-name-nerd-dashboard.user.js
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const NS = "landsat-nerd";
  const ABS_IMAGE_BASE = "https://science.nasa.gov/specials/your-name-in-landsat/images/";
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const state = {
    metadata: [],
    byCountry: {},
    byLetter: {},
    stats: null,
    selectedCountry: "",
  };

  boot();

  async function boot() {
    try {
      await waitForReady();

      state.metadata = extractMetadata();
      enrichCountries();
      buildIndexes();
      state.stats = computeStats();

      injectStyles();
      createLauncher();
      createDashboardModal();
      createGalleryModal();
      createLightbox();
      bindEvents();

      console.log("[Modo Nerd Dashboard] pronto", {
        images: state.metadata.length,
        countries: Object.keys(state.byCountry).length,
        letters: Object.keys(state.byLetter).length,
      });
    } catch (err) {
      console.warn("[Modo Nerd Dashboard] erro ao iniciar:", err);
    }
  }

  function waitForReady() {
    return new Promise((resolve, reject) => {
      let tries = 0;

      const timer = setInterval(() => {
        tries++;

        const ok =
          typeof window.imageDescriptions === "function" &&
          document.getElementById("nameInput") &&
          document.getElementById("enterButton") &&
          document.getElementById("nameBoxes");

        if (ok) {
          clearInterval(timer);
          resolve();
        }

        if (tries >= 120) {
          clearInterval(timer);
          reject(new Error("A página original não carregou como esperado."));
        }
      }, 250);
    });
  }

  function $(id) {
    return document.getElementById(id);
  }

  function cleanText(value) {
    if (!value) return "";

    return value
      .replaceAll("Â°", "°")
      .replaceAll("Ã¡", "á")
      .replaceAll("Ã£", "ã")
      .replaceAll("Ã©", "é")
      .replaceAll("Ã­", "í")
      .replaceAll("Ã³", "ó")
      .replaceAll("Ãº", "ú")
      .replaceAll("Ã§", "ç")
      .replaceAll("Ã´", "ô")
      .replaceAll("Ã¸", "ø")
      .replaceAll("â€™", "’")
      .replaceAll("â€œ", "“")
      .replaceAll("â€", "”")
      .replaceAll("â€‹", "")
      .trim();
  }

  function titleCase(str) {
    return String(str || "")
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function extractMetadata() {
    const fn = window.imageDescriptions.toString();

    const regex =
      /"(?<code>[a-z]_\d+)"==x\.alt&&\(\s*locationTitle\.innerHTML="(?<title>.*?)",\s*locationTitle\.href="(?<source>.*?)",\s*locationCoordinates\.innerHTML="(?<coordinates>.*?)",\s*locationCoordinates\.href="(?<map>.*?)"\)/g;

    const items = [];
    let match;

    while ((match = regex.exec(fn)) !== null) {
      const code = cleanText(match.groups.code);
      const [letterRaw, variantRaw] = code.split("_");

      items.push({
        code,
        letter: letterRaw.toUpperCase(),
        variant: Number(variantRaw),
        title: cleanText(match.groups.title),
        sourceUrl: cleanText(match.groups.source),
        coordinates: cleanText(match.groups.coordinates),
        mapUrl: cleanText(match.groups.map),
        country: null,
        imageUrl: `${ABS_IMAGE_BASE}${code}.jpg`,
      });
    }

    return items.sort((a, b) => {
      if (a.letter !== b.letter) return a.letter.localeCompare(b.letter);
      return a.variant - b.variant;
    });
  }

  function enrichCountries() {
    state.metadata.forEach((item) => {
      item.country = inferCountry(item.title);
    });
  }

  function inferCountry(title) {
    const raw = String(title || "").trim();
    const t = raw.toLowerCase();

    const rules = [
      ["Brazil", ["brazil", "amazonas", "mato grosso", "são miguel do araguaia", "sao miguel do araguaia", "fonte boa", "humaitá", "humaita", "primavera do leste"]],
      ["United States", ["united states", "kentucky", "maine", "arkansas", "nevada", "louisiana", "new york", "oregon", "virginia", "utah", "wyoming", "alaska", "florida keys", "hickman"]],
      ["Canada", ["canada", "saskatchewan", "akimiski", "sirmilik", "mackenzie", "manicouagan"]],
      ["Australia", ["australia", "new south wales", "great barrier reef", "lake tandou"]],
      ["China", ["china", "tibet", "xinjiang", "golmud"]],
      ["Bolivia", ["bolivia", "yapacani", "riberalta", "chapare"]],
      ["Argentina", ["argentina", "lago menendez"]],
      ["Chile", ["chile", "biobio", "bíobío"]],
      ["Peru", ["peru", "virrila"]],
      ["Iceland", ["iceland", "borgarbygg", "holuhraun", "breiðamerkurjökull"]],
      ["Norway", ["norway", "mjosa", "mjøsa"]],
      ["Russia", ["russia", "sea of okhotsk", "lena river", "ponoy river", "khorinsky"]],
      ["Italy", ["italy", "sondrio", "cellina", "meduna"]],
      ["India", ["india", "lonar crater"]],
      ["Indonesia", ["indonesia", "tambora", "nusantara"]],
      ["Turkey", ["turkey", "karakaya"]],
      ["Morocco", ["morocco", "djebel"]],
      ["Namibia", ["namibia", "etosha"]],
      ["South Africa", ["south africa", "kruger"]],
      ["Bangladesh", ["bangladesh", "padma"]],
      ["New Zealand", ["new zealand", "ramsay"]],
      ["Azerbaijan", ["azerbaijan", "guakhmaz"]],
      ["Antarctica", ["antarctica", "deception island"]],
      ["Greenland", ["greenland", "wolstenholme", "davis strait", "sermersooq"]],
      ["United Arab Emirates", ["united arab emirates", "liwa"]],
      ["Chad", ["chad", "n’djamena", "n'djamena", "ndjamena"]],
      ["Kyrgyzstan", ["kyrgyzstan", "tian shan"]],
    ];

    for (const [country, terms] of rules) {
      if (terms.some((term) => t.includes(term))) return country;
    }

    const parts = raw.split(",").map((v) => v.trim()).filter(Boolean);
    const last = (parts[parts.length - 1] || "").toLowerCase();

    const direct = {
      brazil: "Brazil",
      canada: "Canada",
      australia: "Australia",
      china: "China",
      bolivia: "Bolivia",
      argentina: "Argentina",
      chile: "Chile",
      peru: "Peru",
      iceland: "Iceland",
      norway: "Norway",
      russia: "Russia",
      italy: "Italy",
      india: "India",
      indonesia: "Indonesia",
      turkey: "Turkey",
      morocco: "Morocco",
      namibia: "Namibia",
      bangladesh: "Bangladesh",
      "new zealand": "New Zealand",
      azerbaijan: "Azerbaijan",
      antarctica: "Antarctica",
      greenland: "Greenland",
      chad: "Chad",
      kyrgyzstan: "Kyrgyzstan",
      "united states": "United States",
      usa: "United States",
      "south africa": "South Africa",
      "united arab emirates": "United Arab Emirates",
    };

    if (direct[last]) return direct[last];

    return parts.length ? titleCase(parts[parts.length - 1]) : "Unknown";
  }

  function buildIndexes() {
    const byCountry = {};
    const byLetter = {};

    state.metadata.forEach((item) => {
      if (!byCountry[item.country]) byCountry[item.country] = [];
      byCountry[item.country].push(item);

      if (!byLetter[item.letter]) byLetter[item.letter] = [];
      byLetter[item.letter].push(item);
    });

    state.byCountry = byCountry;
    state.byLetter = byLetter;
  }

  function computeStats() {
    const countries = Object.keys(state.byCountry).sort((a, b) => a.localeCompare(b));

    const countryStats = countries.map((country) => {
      const items = state.byCountry[country] || [];
      const uniqueLetters = [...new Set(items.map((i) => i.letter))].sort();
      const missingLetters = ALPHABET.filter((l) => !uniqueLetters.includes(l));

      return {
        country,
        imageCount: items.length,
        letterCount: uniqueLetters.length,
        uniqueLetters,
        missingLetters,
        completeAlphabet: missingLetters.length === 0,
      };
    });

    const letterStats = ALPHABET.map((letter) => {
      const items = state.byLetter[letter] || [];
      const countriesForLetter = [...new Set(items.map((i) => i.country))].sort();

      return {
        letter,
        imageCount: items.length,
        countryCount: countriesForLetter.length,
        countries: countriesForLetter,
      };
    });

    const totalImages = state.metadata.length;
    const totalCountries = countryStats.length;
    const totalLetters = letterStats.filter((x) => x.imageCount > 0).length;
    const completeAlphabetCountries = countryStats.filter((x) => x.completeAlphabet).length;
    const globalMissingLetters = letterStats.filter((x) => x.imageCount === 0).map((x) => x.letter);

    const topCountriesByImages = [...countryStats]
      .sort((a, b) => b.imageCount - a.imageCount || a.country.localeCompare(b.country))
      .slice(0, 8);

    const topCountriesByLetters = [...countryStats]
      .sort((a, b) => b.letterCount - a.letterCount || a.country.localeCompare(b.country))
      .slice(0, 8);

    const topLettersByImages = [...letterStats]
      .sort((a, b) => b.imageCount - a.imageCount || a.letter.localeCompare(b.letter))
      .slice(0, 10);

    return {
      totalImages,
      totalCountries,
      totalLetters,
      completeAlphabetCountries,
      globalMissingLetters,
      countryStats,
      letterStats,
      topCountriesByImages,
      topCountriesByLetters,
      topLettersByImages,
    };
  }

  function createLauncher() {
    const btn = document.createElement("button");
    btn.id = `${NS}-launcher`;
    btn.type = "button";
    btn.innerHTML = `
      <span class="${NS}-launcher-dot"></span>
      <span>Modo Nerd</span>
    `;
    document.body.appendChild(btn);
  }

  function createDashboardModal() {
    const modal = document.createElement("div");
    modal.id = `${NS}-dashboard`;
    modal.innerHTML = `
      <div id="${NS}-dashboard-panel">
        <div id="${NS}-dashboard-header">
          <div>
            <h2>Modo Nerd</h2>
            <p>Painel interno com os dados extraídos da ferramenta da NASA.</p>
          </div>
          <div class="${NS}-header-actions">
            <button type="button" id="${NS}-copy-summary">Copiar resumo</button>
            <button type="button" id="${NS}-export-json">Exportar JSON</button>
            <button type="button" id="${NS}-open-gallery-main" class="${NS}-primary-btn">Galeria</button>
            <button type="button" id="${NS}-close-dashboard" class="${NS}-close-btn">Fechar</button>
          </div>
        </div>

        <div id="${NS}-dashboard-body">
          <section class="${NS}-stats-grid" id="${NS}-stats-grid"></section>

          <section class="${NS}-dashboard-grid">
            <div class="${NS}-card">
              <div class="${NS}-card-title">Países com mais imagens</div>
              <div id="${NS}-chart-countries-images"></div>
            </div>

            <div class="${NS}-card">
              <div class="${NS}-card-title">Países com mais letras únicas</div>
              <div id="${NS}-chart-countries-letters"></div>
            </div>

            <div class="${NS}-card">
              <div class="${NS}-card-title">Letras com mais variações</div>
              <div id="${NS}-chart-letters"></div>
            </div>

            <div class="${NS}-card">
              <div class="${NS}-card-title">Cobertura global do alfabeto</div>
              <div id="${NS}-alphabet-overview"></div>
            </div>
          </section>

          <section class="${NS}-card ${NS}-country-inspector">
            <div class="${NS}-card-title">Inspector por país</div>
            <div class="${NS}-inspector-toolbar">
              <select id="${NS}-country-select"></select>
            </div>
            <div id="${NS}-country-details"></div>
          </section>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    renderDashboard();
  }

  function renderDashboard() {
    renderStatCards();
    renderBarChart(`${NS}-chart-countries-images`, state.stats.topCountriesByImages, "imageCount", "imagem(ns)");
    renderBarChart(`${NS}-chart-countries-letters`, state.stats.topCountriesByLetters, "letterCount", "letra(s)");
    renderBarChart(`${NS}-chart-letters`, state.stats.topLettersByImages, "imageCount", "imagem(ns)", true);
    renderAlphabetOverview();
    renderCountrySelect();
    renderCountryDetails(state.stats.topCountriesByLetters[0]?.country || Object.keys(state.byCountry)[0] || "");
  }

  function renderStatCards() {
    const el = $(`${NS}-stats-grid`);
    if (!el) return;

    const missingGlobal = state.stats.globalMissingLetters.length
      ? state.stats.globalMissingLetters.join(", ")
      : "Nenhuma";

    el.innerHTML = `
      ${statCard("Imagens totais", state.stats.totalImages)}
      ${statCard("Países", state.stats.totalCountries)}
      ${statCard("Letras globais", `${state.stats.totalLetters}/26`)}
      ${statCard("Países com alfabeto completo", state.stats.completeAlphabetCountries)}
      ${statCard("Letras ausentes no dataset", missingGlobal)}
    `;
  }

  function statCard(label, value) {
    return `
      <div class="${NS}-stat-card">
        <div class="${NS}-stat-label">${escapeHtml(label)}</div>
        <div class="${NS}-stat-value">${escapeHtml(String(value))}</div>
      </div>
    `;
  }

  function renderBarChart(containerId, items, key, suffix, labelIsLetter = false) {
    const container = $(containerId);
    if (!container) return;

    const max = Math.max(...items.map((x) => x[key]), 1);

    container.innerHTML = items
      .map((item) => {
        const value = item[key];
        const pct = Math.max(6, Math.round((value / max) * 100));
        const label = labelIsLetter ? item.letter : item.country;

        return `
          <div class="${NS}-bar-row">
            <div class="${NS}-bar-head">
              <span class="${NS}-bar-label">${escapeHtml(label)}</span>
              <span class="${NS}-bar-value">${value} ${escapeHtml(suffix)}</span>
            </div>
            <div class="${NS}-bar-track">
              <div class="${NS}-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderAlphabetOverview() {
    const container = $(`${NS}-alphabet-overview`);
    if (!container) return;

    container.innerHTML = state.stats.letterStats
      .map((item) => {
        const active = item.imageCount > 0 ? "active" : "inactive";
        return `
          <div class="${NS}-letter-chip ${active}" title="${item.letter}: ${item.imageCount} imagem(ns), ${item.countryCount} país(es)">
            <strong>${item.letter}</strong>
            <small>${item.imageCount}</small>
          </div>
        `;
      })
      .join("");
  }

  function renderCountrySelect() {
    const select = $(`${NS}-country-select`);
    if (!select) return;

    const sorted = [...state.stats.countryStats].sort((a, b) => {
      if (b.letterCount !== a.letterCount) return b.letterCount - a.letterCount;
      return a.country.localeCompare(b.country);
    });

    select.innerHTML = sorted
      .map((item) => {
        return `<option value="${escapeAttr(item.country)}">${escapeHtml(item.country)} (${item.letterCount} letras / ${item.imageCount} imagens)</option>`;
      })
      .join("");

    if (sorted[0]) {
      state.selectedCountry = sorted[0].country;
      select.value = sorted[0].country;
    }
  }

  function renderCountryDetails(country) {
    const container = $(`${NS}-country-details`);
    if (!container) return;

    const info = state.stats.countryStats.find((x) => x.country === country);
    if (!info) {
      container.innerHTML = `<p>Nenhum país encontrado.</p>`;
      return;
    }

    state.selectedCountry = country;
    const samples = (state.byCountry[country] || []).slice(0, 12);

    container.innerHTML = `
      <div class="${NS}-country-kpis">
        <div class="${NS}-mini-kpi">
          <span>Imagens</span>
          <strong>${info.imageCount}</strong>
        </div>
        <div class="${NS}-mini-kpi">
          <span>Letras</span>
          <strong>${info.letterCount}/26</strong>
        </div>
        <div class="${NS}-mini-kpi">
          <span>Faltando</span>
          <strong>${info.missingLetters.length}</strong>
        </div>
      </div>

      <div class="${NS}-country-section-title">Letras disponíveis</div>
      <div class="${NS}-letters-wrap">
        ${ALPHABET.map((letter) => {
          const ok = info.uniqueLetters.includes(letter);
          return `<span class="${NS}-pill ${ok ? "ok" : "missing"}">${letter}</span>`;
        }).join("")}
      </div>

      <div class="${NS}-country-section-title">Letras faltantes</div>
      <div class="${NS}-letters-wrap">
        ${
          info.missingLetters.length
            ? info.missingLetters.map((l) => `<span class="${NS}-pill missing">${l}</span>`).join("")
            : `<span class="${NS}-pill ok">Nenhuma</span>`
        }
      </div>

      <div class="${NS}-country-section-title">Amostras</div>
      <div class="${NS}-sample-grid">
        ${samples
          .map((item) => {
            return `
              <button type="button" class="${NS}-sample-card" data-code="${escapeAttr(item.code)}">
                <img src="${escapeAttr(item.imageUrl)}" alt="${escapeAttr(item.code)}" />
                <span>${escapeHtml(item.code)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function createGalleryModal() {
    const modal = document.createElement("div");
    modal.id = `${NS}-gallery-modal`;
    modal.innerHTML = `
      <div id="${NS}-gallery-panel">
        <div id="${NS}-gallery-header">
          <div>
            <h2>Galeria</h2>
            <p>Visualização agrupada por país. Clique em qualquer miniatura para ampliar.</p>
          </div>
          <div class="${NS}-header-actions">
            <input type="text" id="${NS}-gallery-search" placeholder="Buscar país, letra ou local..." />
            <button type="button" id="${NS}-close-gallery" class="${NS}-close-btn">Fechar</button>
          </div>
        </div>

        <div id="${NS}-gallery-content"></div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function renderGallery() {
    const content = $(`${NS}-gallery-content`);
    const search = (($(`${NS}-gallery-search`)?.value || "").trim().toLowerCase());

    if (!content) return;

    const countries = Object.keys(state.byCountry).sort((a, b) => {
      if (a === "Brazil") return -1;
      if (b === "Brazil") return 1;
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return a.localeCompare(b);
    });

    const sections = [];

    countries.forEach((country) => {
      const items = (state.byCountry[country] || []).filter((item) => {
        if (!search) return true;

        return (
          item.country.toLowerCase().includes(search) ||
          item.letter.toLowerCase().includes(search) ||
          item.code.toLowerCase().includes(search) ||
          item.title.toLowerCase().includes(search)
        );
      });

      if (!items.length) return;

      const letters = [...new Set(items.map((i) => i.letter))].sort();

      sections.push(`
        <section class="${NS}-gallery-country">
          <div class="${NS}-gallery-country-head">
            <h3>${escapeHtml(country)}</h3>
            <p>${items.length} imagem(ns) · ${letters.length} letra(s): ${letters.join(", ")}</p>
          </div>

          <div class="${NS}-gallery-grid">
            ${items
              .sort((a, b) => {
                if (a.letter !== b.letter) return a.letter.localeCompare(b.letter);
                return a.variant - b.variant;
              })
              .map((item) => {
                return `
                  <button type="button" class="${NS}-thumb" data-code="${escapeAttr(item.code)}">
                    <img src="${escapeAttr(item.imageUrl)}" alt="${escapeAttr(item.code)}" />
                    <span>${escapeHtml(item.code)}</span>
                    <small>${escapeHtml(item.title)}</small>
                  </button>
                `;
              })
              .join("")}
          </div>
        </section>
      `);
    });

    content.innerHTML = sections.length
      ? sections.join("")
      : `<div class="${NS}-empty-state">Nenhum resultado encontrado.</div>`;
  }

  function createLightbox() {
    const modal = document.createElement("div");
    modal.id = `${NS}-lightbox`;
    modal.innerHTML = `
      <div id="${NS}-lightbox-panel">
        <button type="button" id="${NS}-close-lightbox" class="${NS}-lightbox-close">×</button>
        <img id="${NS}-lightbox-image" alt="" />
        <div id="${NS}-lightbox-info">
          <h3 id="${NS}-lightbox-title"></h3>
          <p id="${NS}-lightbox-meta"></p>
          <p id="${NS}-lightbox-coords"></p>
          <p class="${NS}-lightbox-links">
            <a id="${NS}-lightbox-source" target="_blank" rel="noopener">Fonte</a>
            <a id="${NS}-lightbox-map" target="_blank" rel="noopener">Mapa</a>
          </p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function openDashboard() {
    const modal = $(`${NS}-dashboard`);
    if (!modal) return;
    modal.classList.add("active");
  }

  function closeDashboard() {
    const modal = $(`${NS}-dashboard`);
    if (!modal) return;
    modal.classList.remove("active");
  }

  function openGallery() {
    const modal = $(`${NS}-gallery-modal`);
    if (!modal) return;
    renderGallery();
    modal.classList.add("active");
  }

  function closeGallery() {
    const modal = $(`${NS}-gallery-modal`);
    if (!modal) return;
    modal.classList.remove("active");
  }

  function openLightbox(item) {
    const modal = $(`${NS}-lightbox`);
    if (!modal || !item) return;

    $(`${NS}-lightbox-image`).src = item.imageUrl;
    $(`${NS}-lightbox-image`).alt = item.code;
    $(`${NS}-lightbox-title`).textContent = `${item.code} — ${item.title}`;
    $(`${NS}-lightbox-meta`).textContent = `País: ${item.country} · Letra: ${item.letter} · Variação: ${item.variant}`;
    $(`${NS}-lightbox-coords`).textContent = item.coordinates || "-";
    $(`${NS}-lightbox-source`).href = item.sourceUrl || "#";
    $(`${NS}-lightbox-map`).href = item.mapUrl || "#";

    modal.classList.add("active");
  }

  function closeLightbox() {
    const modal = $(`${NS}-lightbox`);
    if (!modal) return;
    modal.classList.remove("active");
  }

  function bindEvents() {
    $(`${NS}-launcher`)?.addEventListener("click", openDashboard);
    $(`${NS}-close-dashboard`)?.addEventListener("click", closeDashboard);
    $(`${NS}-close-gallery`)?.addEventListener("click", closeGallery);
    $(`${NS}-close-lightbox`)?.addEventListener("click", closeLightbox);
    $(`${NS}-open-gallery-main`)?.addEventListener("click", openGallery);

    $(`${NS}-copy-summary`)?.addEventListener("click", async () => {
      const text = buildSummaryText();

      try {
        await navigator.clipboard.writeText(text);
        alert("Resumo copiado.");
      } catch {
        alert("Não foi possível copiar automaticamente.");
      }
    });

    $(`${NS}-export-json`)?.addEventListener("click", () => {
      const payload = {
        generatedAt: new Date().toISOString(),
        author: "Puglia",
        stats: state.stats,
        metadata: state.metadata,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "landsat-modo-nerd-dashboard.json";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });

    $(`${NS}-country-select`)?.addEventListener("change", (e) => {
      renderCountryDetails(e.target.value);
    });

    $(`${NS}-gallery-search`)?.addEventListener("input", renderGallery);

    document.addEventListener("click", (e) => {
      const thumb = e.target.closest(`.${NS}-thumb`);
      if (thumb) {
        const code = thumb.dataset.code;
        const item = state.metadata.find((x) => x.code === code);
        if (item) openLightbox(item);
      }

      const sample = e.target.closest(`.${NS}-sample-card`);
      if (sample) {
        const code = sample.dataset.code;
        const item = state.metadata.find((x) => x.code === code);
        if (item) openLightbox(item);
      }
    });

    $(`${NS}-dashboard`)?.addEventListener("click", (e) => {
      if (e.target.id === `${NS}-dashboard`) closeDashboard();
    });

    $(`${NS}-gallery-modal`)?.addEventListener("click", (e) => {
      if (e.target.id === `${NS}-gallery-modal`) closeGallery();
    });

    $(`${NS}-lightbox`)?.addEventListener("click", (e) => {
      if (e.target.id === `${NS}-lightbox`) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;

      closeLightbox();
      closeGallery();
      closeDashboard();
    });
  }

  function buildSummaryText() {
    const bestCountry = state.stats.topCountriesByLetters[0];
    const bestByImages = state.stats.topCountriesByImages[0];
    const bestLetter = state.stats.topLettersByImages[0];

    return [
      "Modo Nerd - Resumo",
      "Autor: Puglia",
      `Imagens totais: ${state.stats.totalImages}`,
      `Países: ${state.stats.totalCountries}`,
      `Letras disponíveis globalmente: ${state.stats.totalLetters}/26`,
      `Países com alfabeto completo: ${state.stats.completeAlphabetCountries}`,
      `País com mais letras: ${bestCountry ? `${bestCountry.country} (${bestCountry.letterCount}/26)` : "-"}`,
      `País com mais imagens: ${bestByImages ? `${bestByImages.country} (${bestByImages.imageCount})` : "-"}`,
      `Letra com mais imagens: ${bestLetter ? `${bestLetter.letter} (${bestLetter.imageCount})` : "-"}`,
      `Letras globais ausentes: ${state.stats.globalMissingLetters.length ? state.stats.globalMissingLetters.join(", ") : "Nenhuma"}`
    ].join("\n");
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.id = `${NS}-styles`;
    style.textContent = `
      #${NS}-launcher {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 999999;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 999px;
        background: rgba(10,12,20,.94);
        color: #fff;
        font: 800 14px Arial, sans-serif;
        cursor: pointer;
        box-shadow: 0 14px 40px rgba(0,0,0,.32);
        backdrop-filter: blur(10px);
      }

      .${NS}-launcher-dot {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: #4cff98;
        box-shadow: 0 0 16px rgba(76,255,152,.9);
      }

      #${NS}-dashboard,
      #${NS}-gallery-modal,
      #${NS}-lightbox {
        position: fixed;
        inset: 0;
        z-index: 999998;
        display: none;
        background: rgba(0,0,0,.76);
        backdrop-filter: blur(10px);
      }

      #${NS}-dashboard.active,
      #${NS}-gallery-modal.active,
      #${NS}-lightbox.active {
        display: flex;
      }

      #${NS}-dashboard-panel,
      #${NS}-gallery-panel {
        width: min(1260px, calc(100vw - 24px));
        margin: auto;
        border-radius: 24px;
        overflow: hidden;
        background: #09111f;
        color: #fff;
        box-shadow: 0 30px 100px rgba(0,0,0,.45);
      }

      #${NS}-dashboard-panel {
        height: min(90vh, 980px);
        display: flex;
        flex-direction: column;
      }

      #${NS}-gallery-panel {
        height: min(90vh, 980px);
        display: flex;
        flex-direction: column;
      }

      #${NS}-dashboard-header,
      #${NS}-gallery-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 22px;
        border-bottom: 1px solid rgba(255,255,255,.1);
      }

      #${NS}-dashboard-header h2,
      #${NS}-gallery-header h2 {
        margin: 0 0 4px;
        font: 900 28px Arial, sans-serif;
      }

      #${NS}-dashboard-header p,
      #${NS}-gallery-header p {
        margin: 0;
        color: rgba(255,255,255,.72);
        font: 500 13px Arial, sans-serif;
      }

      .${NS}-header-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
      }

      .${NS}-header-actions button,
      .${NS}-header-actions input,
      #${NS}-country-select {
        height: 42px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.14);
        font: 700 13px Arial, sans-serif;
      }

      .${NS}-header-actions button,
      #${NS}-country-select {
        padding: 0 14px;
        cursor: pointer;
      }

      .${NS}-header-actions button {
        background: rgba(255,255,255,.06);
        color: #fff;
      }

      .${NS}-header-actions input {
        width: 260px;
        padding: 0 14px;
        background: rgba(255,255,255,.06);
        color: #fff;
      }

      #${NS}-gallery-search::placeholder {
        color: rgba(255,255,255,.55);
      }

      #${NS}-country-select,
      #${NS}-country-select option,
      #${NS}-country-select optgroup {
        background: #111827 !important;
        color: #ffffff !important;
      }

      #${NS}-country-select {
        width: 100%;
        color-scheme: dark;
        border: 1px solid rgba(255,255,255,.18) !important;
        outline: none;
      }

      #${NS}-country-select option {
        padding: 10px;
        font: 700 13px Arial, sans-serif;
      }

      #${NS}-country-select option:hover,
      #${NS}-country-select option:checked,
      #${NS}-country-select option:focus {
        background: #1d4ed8 !important;
        color: #ffffff !important;
      }

      .${NS}-primary-btn {
        background: linear-gradient(135deg, #1b77ff, #00a4ff) !important;
        color: #fff !important;
        border-color: transparent !important;
        font-weight: 900 !important;
      }

      .${NS}-close-btn {
        background: rgba(255,255,255,.12) !important;
      }

      #${NS}-dashboard-body,
      #${NS}-gallery-content {
        overflow: auto;
      }

      #${NS}-dashboard-body {
        padding: 20px 22px 28px;
      }

      #${NS}-gallery-content {
        padding: 18px 20px 28px;
      }

      .${NS}-stats-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }

      .${NS}-stat-card,
      .${NS}-card {
        border: 1px solid rgba(255,255,255,.08);
        background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025));
        border-radius: 18px;
      }

      .${NS}-stat-card {
        padding: 16px;
      }

      .${NS}-stat-label {
        color: rgba(255,255,255,.68);
        font: 700 12px Arial, sans-serif;
        margin-bottom: 8px;
      }

      .${NS}-stat-value {
        font: 900 24px Arial, sans-serif;
        line-height: 1.15;
        word-break: break-word;
      }

      .${NS}-dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .${NS}-card {
        padding: 16px;
      }

      .${NS}-card-title {
        font: 900 16px Arial, sans-serif;
        margin-bottom: 14px;
      }

      .${NS}-bar-row + .${NS}-bar-row {
        margin-top: 10px;
      }

      .${NS}-bar-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 6px;
        font: 700 12px Arial, sans-serif;
      }

      .${NS}-bar-label {
        color: #fff;
      }

      .${NS}-bar-value {
        color: rgba(255,255,255,.75);
        white-space: nowrap;
      }

      .${NS}-bar-track {
        width: 100%;
        height: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        overflow: hidden;
      }

      .${NS}-bar-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #1b77ff, #22c6ff);
      }

      #${NS}-alphabet-overview {
        display: grid;
        grid-template-columns: repeat(13, minmax(0, 1fr));
        gap: 8px;
      }

      .${NS}-letter-chip {
        min-height: 62px;
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255,255,255,.1);
        background: rgba(255,255,255,.04);
      }

      .${NS}-letter-chip strong {
        font: 900 16px Arial, sans-serif;
        line-height: 1;
      }

      .${NS}-letter-chip small {
        margin-top: 4px;
        color: rgba(255,255,255,.72);
        font: 700 11px Arial, sans-serif;
      }

      .${NS}-letter-chip.active {
        box-shadow: inset 0 0 0 1px rgba(34,198,255,.22);
      }

      .${NS}-letter-chip.inactive {
        opacity: .45;
      }

      .${NS}-country-inspector {
        margin-top: 14px;
      }

      .${NS}-inspector-toolbar {
        margin-bottom: 14px;
      }

      .${NS}-country-kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 14px;
      }

      .${NS}-mini-kpi {
        padding: 14px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.04);
      }

      .${NS}-mini-kpi span {
        display: block;
        color: rgba(255,255,255,.66);
        font: 700 12px Arial, sans-serif;
        margin-bottom: 6px;
      }

      .${NS}-mini-kpi strong {
        font: 900 20px Arial, sans-serif;
      }

      .${NS}-country-section-title {
        font: 800 13px Arial, sans-serif;
        color: rgba(255,255,255,.8);
        margin: 14px 0 8px;
      }

      .${NS}-letters-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .${NS}-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 34px;
        height: 34px;
        padding: 0 10px;
        border-radius: 999px;
        font: 800 12px Arial, sans-serif;
        border: 1px solid rgba(255,255,255,.12);
      }

      .${NS}-pill.ok {
        background: rgba(34,198,255,.12);
        color: #9cecff;
      }

      .${NS}-pill.missing {
        background: rgba(255,89,89,.12);
        color: #ff9d9d;
      }

      .${NS}-sample-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(98px, 1fr));
        gap: 10px;
      }

      .${NS}-sample-card,
      .${NS}-thumb {
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 16px;
        overflow: hidden;
        background: rgba(255,255,255,.05);
        color: #fff;
        padding: 0;
        cursor: pointer;
        text-align: left;
      }

      .${NS}-sample-card img,
      .${NS}-thumb img {
        display: block;
        width: 100%;
        object-fit: cover;
        background: #000;
      }

      .${NS}-sample-card img {
        aspect-ratio: 1 / 1.35;
      }

      .${NS}-thumb img {
        aspect-ratio: 1 / 1;
      }

      .${NS}-sample-card span,
      .${NS}-thumb span {
        display: block;
        padding: 8px 8px 0;
        font: 900 12px Arial, sans-serif;
      }

      .${NS}-thumb small {
        display: block;
        padding: 4px 8px 10px;
        color: rgba(255,255,255,.72);
        font: 600 10px Arial, sans-serif;
        min-height: 34px;
      }

      .${NS}-gallery-country + .${NS}-gallery-country {
        margin-top: 24px;
      }

      .${NS}-gallery-country-head h3 {
        margin: 0;
        font: 900 18px Arial, sans-serif;
      }

      .${NS}-gallery-country-head p {
        margin: 4px 0 10px;
        color: rgba(255,255,255,.68);
        font: 600 12px Arial, sans-serif;
      }

      .${NS}-gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 10px;
      }

      .${NS}-empty-state {
        padding: 40px;
        text-align: center;
        color: rgba(255,255,255,.72);
        font: 700 14px Arial, sans-serif;
      }

      #${NS}-lightbox-panel {
        position: relative;
        width: min(920px, calc(100vw - 24px));
        margin: auto;
        border-radius: 22px;
        overflow: hidden;
        background: #07111f;
        color: #fff;
        box-shadow: 0 30px 100px rgba(0,0,0,.4);
      }

      .${NS}-lightbox-close {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 2;
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 999px;
        background: rgba(0,0,0,.72);
        color: #fff;
        font: 900 28px Arial, sans-serif;
        cursor: pointer;
      }

      #${NS}-lightbox-image {
        width: 100%;
        max-height: 64vh;
        object-fit: contain;
        display: block;
        background: #000;
      }

      #${NS}-lightbox-info {
        padding: 18px;
      }

      #${NS}-lightbox-info h3 {
        margin: 0 0 8px;
        font: 900 20px Arial, sans-serif;
      }

      #${NS}-lightbox-info p {
        margin: 4px 0;
        color: rgba(255,255,255,.75);
        font: 600 13px Arial, sans-serif;
      }

      .${NS}-lightbox-links {
        display: flex;
        gap: 16px;
        margin-top: 10px !important;
      }

      .${NS}-lightbox-links a {
        color: #97bcff;
      }

      @media (max-width: 1100px) {
        .${NS}-stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .${NS}-dashboard-grid {
          grid-template-columns: 1fr;
        }

        #${NS}-alphabet-overview {
          grid-template-columns: repeat(8, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        #${NS}-dashboard-panel,
        #${NS}-gallery-panel {
          width: calc(100vw - 14px);
          height: calc(100vh - 14px);
          border-radius: 18px;
        }

        #${NS}-dashboard-header,
        #${NS}-gallery-header {
          flex-direction: column;
          align-items: stretch;
        }

        .${NS}-header-actions {
          justify-content: stretch;
        }

        .${NS}-header-actions input {
          width: 100%;
        }

        .${NS}-stats-grid {
          grid-template-columns: 1fr;
        }

        .${NS}-country-kpis {
          grid-template-columns: 1fr;
        }

        #${NS}-alphabet-overview {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    `;

    document.head.appendChild(style);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }
})();
