/** Trích link Maps + nhiều URL ảnh preview từ Google Maps web */
function main(params) {
  var query = params.query || "";
  var max = params.max || 5;

  function cleanUrl(href) {
    if (!href) return "";
    try {
      var u = href;
      if (u.indexOf("/url?q=") >= 0) {
        var m = u.match(/[?&]q=([^&]+)/);
        if (m) u = decodeURIComponent(m[1]);
      }
      return u.split("#")[0];
    } catch (e) {
      return href;
    }
  }

  function isMapsPhoto(src) {
    if (!src || src.indexOf("data:") === 0) return false;
    return (
      src.indexOf("googleusercontent.com") >= 0 ||
      src.indexOf("ggpht.com") >= 0 ||
      src.indexOf("gstatic.com/maps") >= 0
    );
  }

  function pickMapsLink() {
    var selectors = [
      'a[href*="/maps/place/"]',
      'a[href*="maps.google.com/maps/place"]',
      'div[role="feed"] a[href*="place"]',
      'a.hfpxzc[href*="place"]',
    ];
    for (var s = 0; s < selectors.length; s++) {
      var el = document.querySelector(selectors[s]);
      if (el && el.href) return cleanUrl(el.href);
    }
    var all = document.querySelectorAll("a[href]");
    for (var i = 0; i < all.length; i++) {
      var h = all[i].href || "";
      if (h.indexOf("/maps/place/") >= 0 || h.indexOf("maps/place/") >= 0) {
        return cleanUrl(h);
      }
    }
    return "";
  }

  function pickPreviewImages(maxCount) {
    var urls = [];
    var seen = {};
    function add(src) {
      if (!isMapsPhoto(src)) return;
      var key = src.split("=")[0];
      if (seen[key]) return;
      seen[key] = true;
      urls.push(src);
    }
    var imgs = document.querySelectorAll("img[src], img[data-src]");
    for (var i = 0; i < imgs.length; i++) {
      add(imgs[i].getAttribute("src") || imgs[i].src || "");
      add(imgs[i].getAttribute("data-src") || "");
      if (urls.length >= maxCount) return urls;
    }
    var buttons = document.querySelectorAll('button[aria-label*="Photo"], button[data-photo-index]');
    for (var j = 0; j < buttons.length; j++) {
      var bg = buttons[j].style && buttons[j].style.backgroundImage;
      if (bg) {
        var m = bg.match(/url\(['"]?([^'")]+)/);
        if (m) add(m[1]);
      }
      if (urls.length >= maxCount) return urls;
    }
    return urls;
  }

  var mapsUrl = pickMapsLink();
  if (!mapsUrl && query) {
    mapsUrl =
      "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  }

  var imagePreviewUrls = pickPreviewImages(max);
  var imagePreviewUrl = imagePreviewUrls.length > 0 ? imagePreviewUrls[0] : undefined;

  return {
    maps_url: mapsUrl,
    image_preview_url: imagePreviewUrl,
    image_preview_urls: imagePreviewUrls.length > 0 ? imagePreviewUrls : undefined,
  };
}
