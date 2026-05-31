/** Trích tên phòng + tiện nghi từ trang chi tiết KS (Booking/Agoda/Vntrip). */
function main(params) {
  var site = params.site || "booking";
  var perks = [];
  var seen = {};
  var roomName = "";

  function isNoise(t) {
    t = (t || "").trim();
    if (!t || t.length < 2) return true;
    if (/^(\+\d|xem th(?:êm|em)|show more|see all|see more|more amenities)$/i.test(t)) return true;
    if (/^\+\s*\d/.test(t)) return true;
    if (/^\d+\s*tiện (?:nghi|ích)/i.test(t)) return true;
    return false;
  }

  function add(t) {
    if (isNoise(t)) return;
    var parts = (t || "").split(/\s*[|•·]\s*/);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/\s+/g, " ").trim();
      if (!p || p.length < 2 || p.length > 80) continue;
      if (/^(₫|VND|đ\b|\d{1,3}(?:[.,]\d{3})+)/i.test(p)) continue;
      if (isNoise(p)) continue;
      var k = p.toLowerCase();
      if (seen[k]) continue;
      seen[k] = true;
      perks.push(p);
    }
  }

  if (site === "booking") {
    var row =
      document.querySelector("#hprt-table tbody tr.js-rt-block-row") ||
      document.querySelector("#hprt-table tbody tr");
    if (row) {
      var rt =
        row.querySelector(".hprt-roomtype-link") ||
        row.querySelector(".hprt-roomtype-icon-link") ||
        row.querySelector("[data-testid='room-name']");
      if (rt) roomName = (rt.textContent || "").trim();

      var unitCfg = row.querySelector("[data-testid='unit-configuration']");
      if (unitCfg) add(unitCfg.textContent);

      var bedCfg = row.querySelector("[data-testid='bed-configuration']");
      if (bedCfg) add(bedCfg.textContent);

      var occupancy = row.querySelector("[data-testid='occupancy']");
      if (occupancy) add(occupancy.textContent);

      row.querySelectorAll(
        ".hprt-facilities-facility, .hprt-facilities-conditions li, .bui-list__description, [data-testid='property-facility-badge']"
      ).forEach(function (el) {
        add(el.textContent);
      });

      var blockText = (row.querySelector(".hprt-roomtype-block") || {}).textContent || "";
      var sizeM = blockText.match(/(\d{1,3})\s*m²/i);
      if (sizeM) add(sizeM[1] + " m²");
    }

    document
      .querySelectorAll(
        "#hprt-table .hprt-facilities-facility, .important_facility, .facilitiesChecklistSection li, [data-testid='property-facility-badge']"
      )
      .forEach(function (el) {
        add(el.textContent);
      });
  } else if (site === "agoda") {
    var titleEl =
      document.querySelector("[data-selenium='masterroom-title']") ||
      document.querySelector("[class*='MasterRoom'] h2, [class*='masterroom'] h2");
    if (titleEl) roomName = (titleEl.textContent || "").trim();
    document
      .querySelectorAll(
        "[data-selenium='room-feature'], [class*='facility'], [class*='amenity'], .property-highlights li, .hotel-feature"
      )
      .forEach(function (el) {
        add(el.textContent);
      });
  } else {
    document
      .querySelectorAll(".room-name, .hotel-room-name, [class*='amenity'], [class*='facility'] li, .tag-item")
      .forEach(function (el) {
        add(el.textContent);
      });
  }

  if (!perks.some(function (p) { return /m²/i.test(p); })) {
    var m = (document.body.innerText || "").match(/(\d{1,3})\s*m²/);
    if (m) add(m[1] + " m²");
  }

  roomName = roomName.replace(/\s+/g, " ").trim().slice(0, 120);
  return { roomName: roomName, perks: perks };
}
