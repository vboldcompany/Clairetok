(function(){
  "use strict";

  const DATA = window.BOOKS_DATA;
  if (!DATA) return;

  const booksGrid = document.getElementById("booksGrid");
  const booksEmpty = document.getElementById("booksEmpty");
  const marketSelect = document.getElementById("marketSelect");
  const marketNote = document.getElementById("marketNote");

  function normalizeLocaleTag(tag){
    return String(tag || "").trim().replace(/_/g, "-");
  }

  function getLocaleLanguage(tag){
    const safe = normalizeLocaleTag(tag);
    return safe ? safe.split("-")[0].toLowerCase() : "";
  }

  function getRegionFromLocale(tag){
    const safe = normalizeLocaleTag(tag);
    if (!safe) return "";

    try{
      const loc = new Intl.Locale(safe);
      if (loc && loc.region) return String(loc.region).toUpperCase();

      const max = typeof loc.maximize === "function" ? loc.maximize() : null;
      if (max && max.region) return String(max.region).toUpperCase();
    }catch(_){}

    const parts = safe.split("-");
    const last = parts[parts.length - 1] || "";
    return /^[a-zA-Z]{2}$/.test(last) ? last.toUpperCase() : "";
  }

  function getLocaleCandidates(){
    const out = [];

    try{
      if (Array.isArray(navigator.languages)){
        navigator.languages.forEach(function(value){
          const normalized = normalizeLocaleTag(value);
          if (normalized) out.push(normalized);
        });
      }
    }catch(_){}

    try{
      const normalized = normalizeLocaleTag(navigator.language);
      if (normalized) out.push(normalized);
    }catch(_){}

    return out.filter(Boolean);
  }

  function getMarketById(id){
    return DATA.markets.find(function(market){
      return String(market.id) === String(id);
    }) || null;
  }

  function getSavedMarket(){
    try{
      const saved = localStorage.getItem(DATA.storageKey);
      return saved ? getMarketById(saved) : null;
    }catch(_){
      return null;
    }
  }

  function saveMarket(id){
    try{
      localStorage.setItem(DATA.storageKey, String(id || ""));
    }catch(_){}
  }

  function detectMarket(){
    const locales = getLocaleCandidates();

    for (const locale of locales){
      const exact = DATA.markets.find(function(market){
        return Array.isArray(market.localeMatches) && market.localeMatches.includes(locale);
      });
      if (exact) return exact;
    }

    for (const locale of locales){
      const region = getRegionFromLocale(locale);
      if (!region) continue;

      const byRegion = DATA.markets.find(function(market){
        return Array.isArray(market.regionMatches) && market.regionMatches.includes(region);
      });
      if (byRegion) return byRegion;
    }

    for (const locale of locales){
      const lang = getLocaleLanguage(locale);
      const fallbackId = DATA.languageFallbacks[lang];
      const fallback = fallbackId ? getMarketById(fallbackId) : null;
      if (fallback) return fallback;
    }

    return getMarketById("fr_FR") || DATA.markets[0] || null;
  }

  function getCurrentMarket(){
    return getSavedMarket() || detectMarket();
  }

  function isFilledAsin(asin){
    const safe = String(asin || "").trim();
    return !!safe && !safe.includes("ASIN_BOOK_") && !safe.includes("COLLE_ICI");
  }

  function buildAmazonUrl(book, market){
    if (!book || !market) return "";

    const asin = String(book.asins && book.asins[market.lang] ? book.asins[market.lang] : "").trim();
    if (!isFilledAsin(asin)) return "";

    return "https://www." + market.domain + "/dp/" + encodeURIComponent(asin);
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderMarketSelect(){
    if (!marketSelect) return;

    const current = getCurrentMarket();

    marketSelect.innerHTML = DATA.markets.map(function(market){
      return '<option value="' + market.id + '">' + market.label + '</option>';
    }).join("");

    if (current) marketSelect.value = current.id;
  }

  function renderMarketNote(){
    const market = getCurrentMarket();
    if (!marketNote || !market) return;

    marketNote.textContent = "Boutique Amazon : " + market.label + " • " + market.domain;
  }

  function renderBooks(){
    if (!booksGrid) return;

    const market = getCurrentMarket();

    const availableBooks = DATA.books
      .map(function(book){
        return {
          book: book,
          amazonUrl: buildAmazonUrl(book, market)
        };
      })
      .filter(function(item){
        return !!item.amazonUrl;
      });

    if (!availableBooks.length){
      booksGrid.innerHTML = "";
      if (booksEmpty) booksEmpty.hidden = false;
      return;
    }

    if (booksEmpty) booksEmpty.hidden = true;

    booksGrid.innerHTML = availableBooks.map(function(item){
      const book = item.book;
      const detailUrl = "book.html?id=" + encodeURIComponent(book.id);

      return '' +
        '<article class="book-card" data-book-card="' + escapeHtml(book.id) + '">' +
          '<a class="book-cover-link" href="' + detailUrl + '" aria-label="' + escapeHtml(book.title) + '">' +
            '<img class="book-cover" src="' + escapeHtml(book.cover) + '" alt="' + escapeHtml(book.title) + '" data-book-img="' + escapeHtml(book.id) + '">' +
          '</a>' +
          '<a class="book-title" href="' + detailUrl + '">' + escapeHtml(book.title) + '</a>' +
          '<a class="amazon-btn" href="' + item.amazonUrl + '" target="_blank" rel="noopener noreferrer">Acheter sur Amazon</a>' +
        '</article>';
    }).join("");

    setupImageFallbacks();
  }

  function setupImageFallbacks(){
    const imgs = Array.from(document.querySelectorAll("[data-book-img]"));

    imgs.forEach(function(img){
      img.addEventListener("error", function(){
        const card = img.closest("[data-book-card]");
        if (card) card.remove();

        const remaining = document.querySelectorAll("[data-book-card]").length;
        if (!remaining && booksEmpty) booksEmpty.hidden = false;
      }, { once:true });
    });
  }

  function bindEvents(){
    if (!marketSelect) return;

    marketSelect.addEventListener("change", function(){
      const market = getMarketById(marketSelect.value);
      if (!market) return;

      saveMarket(market.id);
      renderMarketNote();
      renderBooks();
    });
  }

  renderMarketSelect();
  renderMarketNote();
  renderBooks();
  bindEvents();
})();
