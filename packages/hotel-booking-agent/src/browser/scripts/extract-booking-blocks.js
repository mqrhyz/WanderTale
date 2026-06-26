/** Deterministic Booking.com room block extractor.
 *  Parses embedded `b_blocks` JSON from the hotel detail page HTML.
 *  Returns cheapest bookable room + a short list of alternatives.
 */
function main(params) {
  var html = document.documentElement ? document.documentElement.outerHTML : "";
  if (!html) return { roomName: "", rooms: [], error: "no html" };

  function extractBalancedArrays(needle) {
    var results = [];
    var pos = 0;
    while (true) {
      var idx = html.indexOf(needle, pos);
      if (idx < 0) break;
      var start = idx + needle.length;
      while (start < html.length && " \t\n\r".indexOf(html[start]) >= 0) start++;
      if (start >= html.length || html[start] !== "[") {
        pos = idx + 1;
        continue;
      }
      var depth = 1;
      var i = start + 1;
      while (i < html.length && depth > 0) {
        var c = html[i];
        if (c === "[") depth++;
        else if (c === "]") depth--;
        i++;
      }
      if (depth === 0) results.push(html.slice(start, i));
      pos = i;
    }
    return results;
  }

  function parseBlocks() {
    var blocks = [];
    var arrays = extractBalancedArrays('"b_blocks":');
    for (var a = 0; a < arrays.length; a++) {
      try {
        var arr = JSON.parse(arrays[a]);
        if (Array.isArray(arr)) {
          for (var k = 0; k < arr.length; k++) {
            var entry = arr[k];
            if (entry && typeof entry === "object" && entry.b_block_id) {
              blocks.push(entry);
            }
          }
        }
      } catch (e) {}
    }
    return blocks;
  }

  function buildBlockNameMap() {
    var namePositions = [];
    var nameRe = /"b_name"\s*:\s*"([^"]+)"/g;
    var m;
    while ((m = nameRe.exec(html)) !== null) {
      namePositions.push({ pos: m.index, name: m[1] });
    }
    var blockPositions = [];
    var blockRe = /"b_block_id"\s*:\s*"([^"]+)"/g;
    while ((m = blockRe.exec(html)) !== null) {
      blockPositions.push({ pos: m.index, id: m[1] });
    }
    var events = [];
    for (var i = 0; i < namePositions.length; i++) events.push({ pos: namePositions[i].pos, kind: "name", val: namePositions[i].name });
    for (var j = 0; j < blockPositions.length; j++) events.push({ pos: blockPositions[j].pos, kind: "block", val: blockPositions[j].id });
    events.sort(function (a, b) { return a.pos - b.pos; });

    var map = {};
    var currentName = null;
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      if (ev.kind === "name") currentName = ev.val;
      else if (ev.kind === "block" && currentName && !map[ev.val]) map[ev.val] = currentName;
    }

    var roomIdToName = {};
    for (var bid in map) {
      if (!map.hasOwnProperty(bid)) continue;
      var parts = bid.split("_");
      if (parts.length > 1) roomIdToName[parts[1]] = map[bid];
    }
    for (var n = 0; n < blockPositions.length; n++) {
      var bid2 = blockPositions[n].id;
      if (map[bid2]) continue;
      var parts2 = bid2.split("_");
      if (parts2.length > 1 && roomIdToName[parts2[1]]) {
        map[bid2] = roomIdToName[parts2[1]] + " (inferred)";
      }
    }
    return map;
  }

  function parseCurrency(text) {
    if (!text) return "VND";
    var t = String(text);
    if (/₫|VND|đ\b/i.test(t)) return "VND";
    if (/US\$|\$|USD/i.test(t)) return "USD";
    if (/€|EUR/i.test(t)) return "EUR";
    if (/£|GBP/i.test(t)) return "GBP";
    return "VND";
  }

  function parseAmount(text) {
    if (!text) return 0;
    var normalized = String(text).replace(/\s/g, "").replace(/,/g, "").replace(/\./g, "");
    var num = parseInt(normalized, 10);
    return isNaN(num) ? 0 : num;
  }

  var blocks = parseBlocks();
  if (blocks.length === 0) return { roomName: "", rooms: [], error: "no b_blocks" };

  var nameMap = buildBlockNameMap();
  var rooms = [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var rawPrice = b.b_raw_price;
    if (!rawPrice) continue;
    var total = 0;
    try { total = parseFloat(rawPrice); } catch (e) {}
    if (!total || total <= 0) continue;

    var pbs = b.b_price_breakdown_simplified || {};
    var tpList = pbs.b_total_price || [{}];
    var tp = tpList[0] || {};
    var displayPrice = String(tp.b_value_user_currency_rounded || tp.b_raw_value_user_currency || rawPrice);
    var currency = parseCurrency(displayPrice);
    var amount = parseAmount(displayPrice);
    if (!amount) amount = Math.round(total);

    var blockId = String(b.b_block_id || "");
    var roomName = nameMap[blockId] || "";
    if (!roomName) {
      var parts = blockId.split("_");
      if (parts.length > 1 && nameMap[parts[1]]) roomName = nameMap[parts[1]];
    }
    if (!roomName) roomName = "Phòng tại Booking";

    var mealPlan = String(b.b_mealplan_included_name || "").trim();
    var maxPersons = b.b_max_persons;
    var canFit = b.b_can_fit_them_all;
    var isGenius = !!b.b_rate_is_genius;

    var perks = [];
    if (mealPlan) perks.push(mealPlan);
    if (maxPersons) perks.push(maxPersons + " khách");
    if (isGenius) perks.push("Genius");

    rooms.push({
      roomName: roomName.replace(/\s+/g, " ").trim().slice(0, 120),
      totalAmount: amount,
      currency: currency,
      displayPrice: displayPrice,
      mealPlan: mealPlan,
      maxPersons: maxPersons,
      canFit: canFit,
      isGenius: isGenius,
      perks: perks,
    });
  }

  if (rooms.length === 0) return { roomName: "", rooms: [], error: "no priced blocks" };

  rooms.sort(function (a, b) { return a.totalAmount - b.totalAmount; });

  return {
    roomName: rooms[0].roomName,
    rooms: rooms.slice(0, 3),
  };
}
