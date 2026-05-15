(function(){
  "use strict";

  const DATA = window.BOOKS_DATA;
  if (!DATA) return;

  const detail = document.getElementById("bookDetail");
  const marketNote = document.getElementById("marketNote");

  function getQueryId(){
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "";
  }

  function getBookById(id){
    return DATA.books.find(function(book){
      return String(book.id) === String(id);
    }) || null;
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

  function normalizeLocaleTag(tag){
    return String(tag || "").trim().replace(/_/g, "-");
  }

  function getLocaleLanguage(tag){
    const safe = normalizeLocaleTag(tag);
    return safe ? safe.split("-")[0].toLowerCase() : "";
  }

  function detectMarket(){
    let lang = "";

    try{
      lang = getLocaleLanguage(navigator.language);
    }catch(_){}

    const fallbackId = DATA.languageFallbacks[lang] || "fr_FR";
    return getMarketById(fallbackId) || DATA.markets[0] || null;
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

  function renderMarketNote(){
    const market = getCurrentMarket();
    if (!marketNote || !market) return;

    marketNote.textContent = "Boutique Amazon : " + market.label + " • " + market.domain;
  }

  function renderDetail(){
    if (!detail) return;

    const book = getBookById(getQueryId());
    const market = getCurrentMarket();

    if (!book){
      detail.innerHTML = '' +
        '<div class="detail-content">' +
          '<h1>Livre introuvable</h1>' +
          '<p>Ce livre n’existe pas ou n’est plus disponible.</p>' +
          '<div class="detail-actions">' +
            '<a class="back-btn" href="index.html">Retour aux livres</a>' +
          '</div>' +
        '</div>';
      return;
    }

    const amazonUrl = buildAmazonUrl(book, market);
    const summary = Array.isArray(book.summary) ? book.summary : [];

    detail.innerHTML = '' +
      '<div class="detail-cover">' +
        '<img src="' + escapeHtml(book.cover) + '" alt="' + escapeHtml(book.title) + '" id="detailCoverImg">' +
      '</div>' +
      '<div class="detail-content">' +
        '<h1>' + escapeHtml(book.title) + '</h1>' +
        summary.map(function(paragraph){
          return '<p>' + escapeHtml(paragraph) + '</p>';
        }).join("") +
        '<div class="detail-actions">' +
          (amazonUrl ? '<a class="amazon-btn" href="' + amazonUrl + '" target="_blank" rel="noopener noreferrer">Acheter sur Amazon</a>' : '') +
          '<a class="back-btn" href="index.html">Retour aux livres</a>' +
        '</div>' +
      '</div>';

    const img = document.getElementById("detailCoverImg");
    if (img){
      img.addEventListener("error", function(){
        const cover = img.closest(".detail-cover");
        if (cover) cover.remove();
      }, { once:true });
    }
  }

  renderMarketNote();
  renderDetail();
})();
