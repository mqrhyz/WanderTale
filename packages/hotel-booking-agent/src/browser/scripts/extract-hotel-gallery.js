/** Trích URL ảnh phòng/khách sạn từ trang OTA (Booking/Agoda) — copy link preview. */
function main(params) {
  var max = params.max || 10;
  var urls = [];
  var seen = {};

  function normalize(u) {
    if (!u) return "";
    u = String(u).trim();
    if (u.indexOf("//") === 0) u = "https:" + u;
    return u;
  }

  function isHotelImage(u) {
    if (!u || u.indexOf("data:") === 0) return false;
    if (u.indexOf("http") !== 0) return false;
    return (
      u.indexOf("bstatic.com") >= 0 ||
      u.indexOf("agoda.net") >= 0 ||
      u.indexOf("vntrip") >= 0 ||
      u.indexOf("traveloka") >= 0 ||
      u.indexOf("hotel") >= 0 ||
      u.indexOf("room") >= 0
    );
  }

  function add(u) {
    u = normalize(u);
    if (!isHotelImage(u)) return;
    var key = u.split("?")[0].replace(/\/max\d+\//, "/");
    if (seen[key]) return;
    seen[key] = true;
    urls.push(u);
  }

  document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(function (m) {
    add(m.getAttribute("content"));
  });

  document.querySelectorAll("[data-testid='gallery-photo'], [data-testid='photo-viewer'] img, .bh-photo-grid-item img, .hotelGallery img").forEach(function (img) {
    add(img.getAttribute("src"));
    add(img.getAttribute("data-src"));
    add(img.getAttribute("data-highres"));
  });

  document.querySelectorAll("img").forEach(function (img) {
    add(img.getAttribute("src"));
    add(img.getAttribute("data-src"));
    add(img.getAttribute("data-lazy"));
    add(img.getAttribute("data-highres"));
  });

  document.querySelectorAll("source[srcset]").forEach(function (s) {
    var parts = (s.getAttribute("srcset") || "").split(",");
    for (var i = 0; i < parts.length; i++) {
      add(parts[i].trim().split(/\s+/)[0]);
    }
  });

  document.querySelectorAll("[style*='background-image']").forEach(function (el) {
    var st = el.getAttribute("style") || "";
    var m = st.match(/url\(['"]?([^'")]+)/);
    if (m) add(m[1]);
  });

  return urls.slice(0, max);
}
