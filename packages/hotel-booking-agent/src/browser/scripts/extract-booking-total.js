/** Lấy "Tổng cộng" trên trang checkout Booking — tìm đúng label "Tổng cộng/Total" */
function main() {
  // Regex hỗ trợ cả "VND 765.072" và "765.072 VND" và "765.072 ₫"
  var priceRe1 = /VND\s*([\d]{1,3}(?:[.,]\d{3})+)/gi;
  var priceRe2 = /([\d]{1,3}(?:[.,]\d{3})+)\s*(?:₫|VND|đ)/gi;

  function parseNum(str) {
    if (!str) return 0;
    var cleaned = str.replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
    return parseInt(cleaned, 10) || 0;
  }

  function findPricesInText(text) {
    var results = [];
    var m;
    priceRe1.lastIndex = 0;
    while ((m = priceRe1.exec(text)) !== null) {
      var n = parseNum(m[1]);
      if (n > 0 && n < 500000000) results.push(n);
    }
    priceRe2.lastIndex = 0;
    while ((m = priceRe2.exec(text)) !== null) {
      var n = parseNum(m[1]);
      if (n > 0 && n < 500000000) results.push(n);
    }
    return results;
  }

  // 1) TÌM "Tổng cộng" hoặc "Total" trực tiếp
  var totalLabels = document.querySelectorAll("*");
  for (var i = 0; i < totalLabels.length; i++) {
    var el = totalLabels[i];
    var text = (el.textContent || "").trim();
    // Tìm element có "Tổng cộng" hoặc "Total" kèm giá trong cùng dòng/container
    if (/^(Tổng cộng|Total)\s*:?\s*(VND|₫)?\s*[\d.,]+/i.test(text)) {
      var prices = findPricesInText(text);
      if (prices.length > 0) {
        // Lấy giá lớn nhất trong dòng "Tổng cộng..."
        return { totalVnd: Math.max.apply(null, prices), source: "totalLabel" };
      }
    }
  }

  // 2) Tìm trong row/div có chứa "Tổng cộng" hoặc "Total"
  var rows = document.querySelectorAll("tr, div, span, p");
  for (var j = 0; j < rows.length; j++) {
    var rowText = (rows[j].textContent || "").trim();
    if (/Tổng cộng|Total price|Grand total/i.test(rowText)) {
      var rowPrices = findPricesInText(rowText);
      if (rowPrices.length > 0) {
        // Lấy giá lớn nhất trong row "Tổng cộng"
        return { totalVnd: Math.max.apply(null, rowPrices), source: "totalRow" };
      }
    }
  }

  // 3) Fallback: tìm trong sidebar price summary
  var sidebars = document.querySelectorAll(
    '[data-testid="price-summary"], aside, [class*="PriceSummary"], [class*="reservation-summary"], .bui-price-display__value'
  );
  var fallbackPrices = [];
  for (var k = 0; k < sidebars.length; k++) {
    var sidebarPrices = findPricesInText(sidebars[k].textContent || "");
    fallbackPrices = fallbackPrices.concat(sidebarPrices);
  }
  // Chọn giá trong khoảng hợp lý cho phòng khách sạn (100k - 50M VND)
  var validPrices = fallbackPrices.filter(function (p) {
    return p >= 100000 && p <= 50000000;
  });
  if (validPrices.length > 0) {
    // Giá "Tổng cộng" thường là giá lớn nhất trong danh sách (sau discount)
    // Nhưng nhỏ hơn "Giá gốc" strikethrough
    // Sắp xếp và lấy giá thứ 2 lớn nhất nếu có nhiều giá, vì giá lớn nhất có thể là giá gốc
    validPrices.sort(function (a, b) { return b - a; });
    if (validPrices.length >= 2 && validPrices[0] > validPrices[1] * 1.1) {
      // Nếu giá lớn nhất > 10% giá thứ 2, có thể là giá gốc (strikethrough)
      return { totalVnd: validPrices[1], source: "sidebar_second" };
    }
    return { totalVnd: validPrices[0], source: "sidebar" };
  }

  // 4) Cuối cùng: quét toàn bộ body
  var bodyPrices = findPricesInText(document.body.innerText || "");
  var bodyValid = bodyPrices.filter(function (p) {
    return p >= 100000 && p <= 50000000;
  });
  if (bodyValid.length > 0) {
    bodyValid.sort(function (a, b) { return b - a; });
    if (bodyValid.length >= 2 && bodyValid[0] > bodyValid[1] * 1.1) {
      return { totalVnd: bodyValid[1], source: "body_second" };
    }
    return { totalVnd: bodyValid[0], source: "body" };
  }

  return { totalVnd: null, source: "not_found" };
}
