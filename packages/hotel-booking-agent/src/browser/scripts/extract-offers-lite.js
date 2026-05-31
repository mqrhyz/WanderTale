/** Trích nhanh: tên KS, giá, rating, link, ảnh preview — không scroll */
function main(params) {
  var site = params.site || "booking";
  var limit = params.limit || 6;
  var baseUrl = params.baseUrl || "";
  var out = [];
  var seen = {};
  // Hỗ trợ cả "765.072 ₫" và "VND 765.072"
  var priceRe1 = /([\d]{1,3}(?:[.,]\d{3})+)\s*(?:₫|VND|đ)/i;
  var priceRe2 = /VND\s*([\d]{1,3}(?:[.,]\d{3})+)/i;
  var ratingRe = /(\d{1,2}[,.]\d)\s*(?:\/\s*10)?|★\s*(\d{1,2}[,.]?\d?)/;

  // Tiếng Việt screen-reader suffix Booking dán vào title → cần cắt
  var NAME_NOISE = [
    "Mở trong cửa sổ mới",
    "Opens in new window",
    "Mở liên kết",
    "Mới mở",
  ];

  var cardSel =
    site === "booking"
      ? '[data-testid="property-card"], [data-testid="property-card-container"]'
      : site === "agoda"
        ? "[data-selenium='hotel-item'], [data-element-name='property-card'], [data-testid='property-card'], li[data-hotelid], .PropertyCard"
        : ".listHotel__item, .hotel-item, [class*='HotelCard'], [class*='hotel-card'], article";

  function parsePrice(text) {
    var m = text.match(priceRe1);
    if (!m) m = text.match(priceRe2);
    if (!m) return null;
    var n = parseInt(m[1].replace(/[.,]/g, ""), 10);
    return n >= 10000 ? n : null;
  }

  function findAllPrices(text) {
    var results = [];
    var re1 = /([\d]{1,3}(?:[.,]\d{3})+)\s*(?:₫|VND|đ)/gi;
    var re2 = /VND\s*([\d]{1,3}(?:[.,]\d{3})+)/gi;
    var m;
    while ((m = re1.exec(text)) !== null) {
      var n = parseInt(m[1].replace(/[.,]/g, ""), 10);
      if (n >= 10000) results.push(n);
    }
    while ((m = re2.exec(text)) !== null) {
      var n2 = parseInt(m[1].replace(/[.,]/g, ""), 10);
      if (n2 >= 10000) results.push(n2);
    }
    return results;
  }

  function pickAdvertisedPrice(root) {
    var struck = root.querySelector(
      'del, s, [class*="strikethrough"], [class*="line-through"], [aria-label*="Original" i], [data-testid*="strikethrough"]'
    );
    if (struck) {
      var struckPrice = parsePrice(struck.textContent || "");
      if (struckPrice) return struckPrice;
    }
    var all = findAllPrices(root.textContent || "");
    if (all.length === 0) return null;
    if (all.length === 1) return all[0];
    return Math.max.apply(null, all);
  }

  /** Booking có element rating riêng — dùng nó để tránh nhầm với "1,6 km" */
  function pickBookingRating(root) {
    var el =
      root.querySelector("[data-testid='review-score']") ||
      root.querySelector("[aria-label*='Có điểm đánh giá' i]") ||
      root.querySelector("[aria-label*='Scored' i]");
    if (!el) return null;
    // Booking đôi khi để score trong <div> con đầu tiên: "8,3" hoặc "Có điểm đánh giá 8,3"
    var label = el.getAttribute("aria-label") || "";
    var text = label + " " + (el.textContent || "");
    var m = text.match(/(\d{1,2}[,.]\d)/);
    if (!m) return null;
    var n = parseFloat(m[1].replace(",", "."));
    return n > 0 && n <= 10 ? n : null;
  }

  function pickRating(root) {
    if (site === "booking") {
      var r = pickBookingRating(root);
      if (r != null) return r;
    }
    var ratingEl = root.querySelector(
      "[data-testid*='rating'], [data-testid*='review'], [data-selenium*='rating'], [class*='Rating'], [class*='rating']"
    );
    var src = ratingEl ? ratingEl.textContent || "" : root.textContent || "";
    var m = src.match(ratingRe);
    if (!m) return null;
    var s = (m[1] || m[2] || "").replace(",", ".");
    var n = parseFloat(s);
    return n > 0 && n <= 10 ? n : null;
  }

  function hostOk(href) {
    if (site === "booking") return href.indexOf("booking.com") >= 0;
    if (site === "agoda") return href.indexOf("agoda.com") >= 0;
    if (site === "vntrip") return href.indexOf("vntrip.vn") >= 0;
    return true;
  }

  function cleanName(raw) {
    if (!raw) return "";
    var s = String(raw).replace(/\s+/g, " ").trim();
    for (var i = 0; i < NAME_NOISE.length; i++) {
      var idx = s.indexOf(NAME_NOISE[i]);
      if (idx >= 0) s = s.slice(0, idx).trim();
    }
    // Cắt nếu có dấu chấm xuống dòng giả ("Hotel X\nĐịa chỉ ...")
    s = s.split(/[\n\r]/)[0].trim();
    return s.slice(0, 140);
  }

  function pickName(root, fallbackLink) {
    var sel =
      site === "booking"
        ? "[data-testid='title']"
        : site === "agoda"
          ? "[data-selenium='hotel-name'], [data-element-name='property-card-title'], h3"
          : ".listHotel__item h3, .listHotel__item [class*='hotelName'], .hotel-name, h3, h2";
    var nameEl = root.querySelector(sel);
    if (nameEl) {
      // Booking: title chứa <span class="sr-only"> "Mở trong cửa sổ mới"
      // → ưu tiên firstChild text nếu element con đầu là text/span tên thật
      var firstChild = nameEl.firstChild;
      if (firstChild && firstChild.nodeType === 3 /* TEXT_NODE */ && (firstChild.textContent || "").trim().length > 1) {
        return cleanName(firstChild.textContent);
      }
      return cleanName(nameEl.textContent);
    }
    if (fallbackLink) return cleanName((fallbackLink.textContent || "").split("\n")[0]);
    return "";
  }

  function pickImagePreviews(root, maxCount) {
    maxCount = maxCount || 8;
    var urls = [];
    var seen = {};

    function add(u) {
      if (!u || u.indexOf("data:") === 0) return;
      if (u.indexOf("//") === 0) u = "https:" + u;
      var key = u.split("?")[0];
      if (seen[key]) return;
      seen[key] = true;
      urls.push(u);
    }

    var imgs = root.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      add(img.getAttribute("src"));
      add(img.getAttribute("data-src"));
      add(img.getAttribute("data-lazy"));
      if (urls.length >= maxCount) return urls;
    }

    var pictures = root.querySelectorAll("picture source[srcset]");
    for (var j = 0; j < pictures.length; j++) {
      var srcset = pictures[j].getAttribute("srcset") || "";
      var parts = srcset.split(",");
      for (var k = 0; k < parts.length; k++) {
        var u = parts[k].trim().split(/\s+/)[0];
        if (u) add(u.indexOf("//") === 0 ? "https:" + u : u);
        if (urls.length >= maxCount) return urls;
      }
    }

    return urls;
  }

  function pickImagePreview(root) {
    var list = pickImagePreviews(root, 1);
    return list.length > 0 ? list[0] : "";
  }

  function pushCard(root) {
    var text = root.textContent || "";
    var priceVnd = pickAdvertisedPrice(root) || parsePrice(text);
    if (!priceVnd) return;
    var link =
      root.querySelector('a[href*="hotel"]') ||
      root.querySelector("a[href*='property']") ||
      root.querySelector("a[href]");
    if (!link || !link.href || !hostOk(link.href)) return;
    var hotelName = pickName(root, link);
    if (!hotelName || hotelName.length < 2) return;
    var key = link.href + ":" + priceVnd;
    if (seen[key]) return;
    seen[key] = true;
    var href = link.href;
    if (href.indexOf("http") !== 0 && baseUrl) {
      try {
        href = new URL(href, baseUrl).href;
      } catch (e) {}
    }
    var roomLine = "";
    var roomEl = root.querySelector("[class*='room'], [data-testid*='room']");
    if (roomEl) roomLine = (roomEl.textContent || "").trim().slice(0, 80);
    var perks = [];
    var perkSeen = {};
    function addPerk(t) {
      t = (t || "").replace(/\s+/g, " ").trim();
      if (!t || t.length < 2 || t.length > 80) return;
      if (/^(\+\d|xem th(?:êm|em)|show more|see all|more amenities)$/i.test(t)) return;
      if (/^\+\s*\d/.test(t)) return;
      if (/^\d+\s*tiện (?:nghi|ích)/i.test(t)) return;
      var parts = t.split(/\s*[|•·]\s*/);
      for (var pi = 0; pi < parts.length; pi++) {
        var p = parts[pi].trim();
        if (!p || p.length < 2) continue;
        var k = p.toLowerCase();
        if (perkSeen[k]) continue;
        perkSeen[k] = true;
        perks.push(p);
      }
    }
    root.querySelectorAll(
      "[data-testid*='facility'], [data-testid*='unit-configuration'], [class*='facilit'], [class*='amenity'], .bui-badge"
    ).forEach(function (el) {
      addPerk(el.textContent);
    });
    out.push({
      hotelName: hotelName,
      priceVnd: priceVnd,
      rating: pickRating(root),
      bookingUrl: href,
      roomName: roomLine || "",
      perks: perks,
      imagePreviewUrl: pickImagePreview(root) || "",
      imagePreviewUrls: pickImagePreviews(root, 8),
    });
  }

  var cards = document.querySelectorAll(cardSel);
  for (var i = 0; i < cards.length && out.length < limit; i++) {
    pushCard(cards[i]);
  }

  if (out.length === 0) {
    var prices = document.querySelectorAll(
      "[data-testid='price-for-x-nights'], [data-testid='price-and-discounted-price'], [data-selenium='hotel-price'], [data-testid='price-text'], [data-element-name='final-price']"
    );
    for (var j = 0; j < prices.length && out.length < limit; j++) {
      var p = prices[j];
      var parent =
        p.closest("[data-testid='property-card'], [data-element-name='property-card'], li, article, section, div") ||
        p.parentElement;
      if (parent) pushCard(parent);
    }
  }

  return out;
}
