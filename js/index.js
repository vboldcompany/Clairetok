(function(){
  "use strict";

  const DATA = window.BOOKS_DATA;
  if (!DATA || !Array.isArray(DATA.books)) return;

  const booksGrid = document.getElementById("booksGrid");
  const modal = document.getElementById("bookModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalSummary = document.getElementById("modalSummary");
  const modalCover = document.getElementById("modalCover");
  const modalCoverFallback = document.getElementById("modalCoverFallback");
  const modalAmazonBtn = document.getElementById("modalAmazonBtn");

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
    return (DATA.markets || []).find(function(market){
      return String(market.id) === String(id);
    }) || null;
  }

  function detectMarket(){
    const markets = Array.isArray(DATA.markets) ? DATA.markets : [];
    const locales = getLocaleCandidates();

    for (const locale of locales){
      const exact = markets.find(function(market){
        return Array.isArray(market.localeMatches) && market.localeMatches.includes(locale);
      });
      if (exact) return exact;
    }

    for (const locale of locales){
      const region = getRegionFromLocale(locale);
      if (!region) continue;
      const byRegion = markets.find(function(market){
        return Array.isArray(market.regionMatches) && market.regionMatches.includes(region);
      });
      if (byRegion) return byRegion;
    }

    for (const locale of locales){
      const lang = getLocaleLanguage(locale);
      const fallbackId = DATA.languageFallbacks && DATA.languageFallbacks[lang];
      const fallback = fallbackId ? getMarketById(fallbackId) : null;
      if (fallback) return fallback;
    }

    return getMarketById("fr_FR") || markets[0] || { domain:"amazon.fr", lang:"fr" };
  }

  function isFilledAsin(asin){
    const safe = String(asin || "").trim();
    return !!safe && !safe.includes("ASIN_BOOK_") && !safe.includes("COLLE_ICI");
  }

  function buildAmazonUrl(book){
    const market = detectMarket();
    if (!book || !market) return "";

    const asin = String(book.asins && book.asins[market.lang] ? book.asins[market.lang] : "").trim();
    if (isFilledAsin(asin)){
      return "https://www." + market.domain + "/dp/" + encodeURIComponent(asin);
    }

    return "";
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clampText(value, max){
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trim().replace(/[,.!?:;\-–—]+$/, "") + "…";
  }

  function getSummary(book){
    return Array.isArray(book && book.summary) ? book.summary.filter(Boolean) : [];
  }

  function getBookById(id){
    return DATA.books.find(function(book){
      return String(book.id) === String(id);
    }) || null;
  }

  function hideMissingImage(img){
    const visualButton = img.closest(".book-visual-button");
    if (!visualButton) return;

    visualButton.hidden = true;

    const card = visualButton.closest(".book-card");
    if (card) card.classList.add("book-card--no-cover");
  }

  function hasValidAsinForCurrentMarket(book){
    return !!buildAmazonUrl(book);
  }

  function renderBooks(){
    if (!booksGrid) return;

    const visibleBooks = DATA.books.filter(function(book){
      return hasValidAsinForCurrentMarket(book);
    });

    booksGrid.innerHTML = visibleBooks.map(function(book){
      const summary = getSummary(book);
      const shortText = clampText(summary[0] || "Découvrez une histoire sombre issue de notre univers.", 138);
      const amazonUrl = buildAmazonUrl(book);

      return '' +
        '<article class="book-card" data-book-id="' + escapeHtml(book.id) + '">' +
          '<button class="book-visual-button" type="button" data-open-book="' + escapeHtml(book.id) + '" aria-label="Voir ' + escapeHtml(book.title) + '">' +
            '<img class="book-card-img" src="' + escapeHtml(book.cover) + '" alt="' + escapeHtml(book.title) + '" loading="lazy" data-book-img="' + escapeHtml(book.id) + '">' +
          '</button>' +
          '<div class="book-body">' +
            '<h2 class="book-card-title">' + escapeHtml(book.title) + '</h2>' +
            '<p class="book-short">' + escapeHtml(shortText) + '</p>' +
            '<div class="book-actions">' +
              '<button class="details-btn" type="button" data-open-book="' + escapeHtml(book.id) + '" aria-label="Résumé de ' + escapeHtml(book.title) + '">Voir résumé</button>' +
              '<a class="amazon-btn" href="' + escapeHtml(amazonUrl) + '" target="_blank" rel="noopener noreferrer">Acheter sur Amazon</a>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join("");

    Array.from(document.querySelectorAll("[data-book-img]")).forEach(function(img){
      img.addEventListener("error", function(){
        hideMissingImage(img);
      }, { once:true });
    });
  }

  function openBook(id){
    const book = getBookById(id);
    if (!book || !modal) return;

    const summary = getSummary(book);
    const amazonUrl = buildAmazonUrl(book);

    modalTitle.textContent = book.title || "Livre";
    modalSummary.innerHTML = summary.map(function(paragraph){
      return '<p>' + escapeHtml(paragraph) + '</p>';
    }).join("") || '<p>Découvrez une histoire sombre issue de notre univers.</p>';

    if (modalAmazonBtn){
      if (amazonUrl){
        modalAmazonBtn.hidden = false;
        modalAmazonBtn.href = amazonUrl;
      }else{
        modalAmazonBtn.hidden = true;
        modalAmazonBtn.removeAttribute("href");
      }
    }

    const modalCoverWrap = modalCover ? modalCover.closest(".modal-cover-wrap") : null;
    if (modalCoverWrap) modalCoverWrap.hidden = false;

    modalCover.hidden = false;
    modalCover.src = book.cover || "";
    modalCover.alt = book.title || "Couverture du livre";

    if (modalCoverFallback){
      modalCoverFallback.hidden = true;
      modalCoverFallback.textContent = "";
    }

    modalCover.onerror = function(){
      modalCover.hidden = true;
      if (modalCoverWrap) modalCoverWrap.hidden = true;
      if (modalCoverFallback){
        modalCoverFallback.hidden = true;
        modalCoverFallback.textContent = "";
      }
    };

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  }

  function closeBook(){
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  function bindEvents(){
    document.addEventListener("click", function(event){
      const openBtn = event.target.closest("[data-open-book]");
      if (openBtn){
        event.preventDefault();
        openBook(openBtn.getAttribute("data-open-book"));
        return;
      }

      if (event.target.closest("[data-close-modal]")){
        event.preventDefault();
        closeBook();
      }
    });

    document.addEventListener("keydown", function(event){
      if (event.key === "Escape") closeBook();
    });
  }

  renderBooks();
  bindEvents();
})();
