/** Chọn 1 phòng trên bảng availability Booking */
function main() {
  var selects = document.querySelectorAll(
    "select.hprt-nos-select, select.js-hprt-nos-select, table.hprt-table select, #hprt-table select"
  );
  for (var i = 0; i < selects.length; i++) {
    var sel = selects[i];
    if (!sel || sel.options.length < 2) continue;
    sel.selectedIndex = 1;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    return { ok: true, index: i };
  }
  return { ok: false };
}
