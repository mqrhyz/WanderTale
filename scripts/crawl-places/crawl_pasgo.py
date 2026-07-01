"""
Crawl Pasgo (pasgo.vn) nhà hàng/quán ăn:
  - Discover link các nhà hàng bằng Zyte API (render JS) cho vài listing URL mỗi thành phố.
  - Enrich thông tin (tên, địa chỉ, lat/lng, ảnh) bằng HTTP thuần (trang chi tiết server-render).

Output: scripts/crawl-places/data/pasgo_{city}.json
Mỗi record:
  {
    "source":"pasgo","source_id":int(id),
    "name":str,"district":str|None,"city":str,"city_slug":str,
    "address":str|None,"lat":float|None,"lng":float|None,
    "image":str|None,"detail_url":str,"scraped_at":ISO
  }

Cách chạy:
  python3 crawl_pasgo.py --zyte-key 8541cf71c7f44756a9df5ef20e2c36c6 --target 300
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import datetime as dt
from pathlib import Path
from html import unescape

import requests
from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
HEADERS_HTTP = {"User-Agent": UA, "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8"}

CITIES = {
    "ho-chi-minh": {"label": "TP. HCM", "province": "Thành phố Hồ Chí Minh"},
    "ha-noi":      {"label": "Hà Nội",  "province": "Hà Nội"},
}

# Pasgo có listing discover qua paginate: /{city}/nha-hang?page=N (~20 nhà hàng/page)
PAGINATION_MAX = 40            # cap pages
EMPTY_STOP_STREAK = 3          # dừng khi thấy 3 page liên tiếp không có id mới

ANCHOR_RE = re.compile(
    r'<a [^>]*?href="(https://pasgo\.vn/nha-hang/[a-z0-9-]+-(\d+))"[^>]*?title="([^"]+)"',
    re.I,
)
IMG_INNER_RE = re.compile(
    r'(?:data-src|src)="(https://storage\.pasgo\.com\.com\.vn/[^"]+)"', re.I
) if False else re.compile(
    r'(?:data-src|src)="(https://storage\.pasgo\.com\.vn/[^"]+)"', re.I
)
LATLNG_RE = re.compile(r"google\.com/maps/place/(-?\d+\.\d+),(-?\d+\.\d+)")
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
ADDR_BLOCK_RE = re.compile(
    r"Địa chỉ[^<]*</strong>\s*</h\d>\s*<p>(.*?)</p>", re.I | re.S
)
DESC_RE = re.compile(r'<meta name="description" content="([^"]+)"', re.I)


def parse_district(text: str) -> str | None:
    """Trích district/quận/huyện/quận-level từ text người dùng."""
    if not text:
        return None
    pats = [
        # Quận <tên có thể nhiều chữ: "Quận Ba Đình", "Quận Hai Bà Trưng", "Quận 12"
        r"(Quận\s+[A-Za-zÀ-ỹ0-9]+(?:\s+[A-Za-zÀ-ỹ]+){0,2})",
        r"(Thành\s+Phố\s+[A-Za-zÀ-ỹ]+(?:\s+[A-Za-zÀ-ỹ]+){0,2})",
        r"(Thị\s+Xã\s+[A-Za-zÀ-ỹ]+(?:\s+[A-Za-zÀ-ỹ]+){0,2})",
        r"(Huyện\s+[A-Za-zÀ-ỹ]+(?:\s+[A-Za-zÀ-ỹ]+){0,2})",
        r"(Hà\s+Đông|Long\s+Biên|Cầu\s+Giấy|Ba\s+Đình|Hoàn\s+Kiếm|Tây\s+Hồ)",
    ]
    for p in pats:
        m = re.search(p, text, re.I)
        if m:
            return re.sub(r"\s+", " ", m.group(1)).strip()
    return None


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


# ----------------------- Zyte render -----------------------
def zyte_render(url: str, key: str, session: requests.Session,
                max_retry: int = 3, timeout: int = 180) -> str | None:
    backoff = 5.0
    for attempt in range(max_retry):
        try:
            r = session.post(
                "https://api.zyte.com/v1/extract",
                auth=(key, ""),
                json={"url": url, "browserHtml": True},
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=timeout,
            )
            if r.status_code == 200:
                return r.json().get("browserHtml")
            print(f"  ! zyte {url} HTTP {r.status_code}: {r.text[:160]}", file=sys.stderr)
        except requests.RequestException as e:
            print(f"  ! zyte {url} attempt {attempt+1}: {e}", file=sys.stderr)
        time.sleep(backoff); backoff *= 2
    return None


# ----------------------- Discovery -----------------------
def discover(city: str, key: str, session: requests.Session) -> dict[int, dict]:
    """Pagination qua /{city}/nha-hang?page=N cho tới hết."""
    found: dict[int, dict] = {}
    empty_streak = 0
    for page in range(1, PAGINATION_MAX + 1):
        url = f"https://pasgo.vn/{city}/nha-hang?page={page}"
        print(f"  discover page {page}: {url}", flush=True)
        html = zyte_render(url, key, session)
        if not html:
            empty_streak += 1
            if empty_streak >= EMPTY_STOP_STREAK:
                print("  -> Zyte fail quá nhiều liên tiếp, dừng discovery", flush=True)
                break
            continue
        new_this_page = 0
        for m in ANCHOR_RE.finditer(html):
            href, rid, title = m.group(1), int(m.group(2)), unescape(m.group(3)).strip()
            slug = href.rsplit("/", 1)[-1]
            if rid in found:
                continue
            tail = html[m.end():m.end() + 600]
            im = IMG_INNER_RE.search(tail)
            image = im.group(1).replace("Width=250", "Width=600") if im else None
            found[rid] = {
                "source": "pasgo", "source_id": rid, "slug": slug, "name": title,
                "image": image, "discovery_url": href,
                "city": CITIES[city]["label"], "city_slug": city,
            }
            new_this_page += 1
        print(f"      page {page}: +{new_this_page} new (cum {len(found)})", flush=True)
        if new_this_page == 0:
            empty_streak += 1
            if empty_streak >= EMPTY_STOP_STREAK:
                print("  -> hết page có nhà hàng mới, dừng discovery", flush=True)
                break
        else:
            empty_streak = 0
    return found


# ----------------------- Detail enrichment (plain HTTP) -----------------------
def parse_address(h: str) -> str | None:
    """Robust: tìm "Địa chỉ..." → cắt tới "Xem thêm"/section kế → strip tag + prefix."""
    pos = h.find("Địa chỉ")
    if pos < 0:
        return None
    end = h.find("Xem thêm", pos)
    if end < 0 or end - pos > 3000:
        end = h.find("Tổng quan", pos)
    if end < 0 or end - pos > 3000:
        end = pos + 1500
    window = h[pos:end]
    txt = re.sub(r"<[^>]+>", " ", window)
    txt = unescape(txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    # Cắt các hậu tố marketing nếu lọt vào
    for sep in ("[", "Đặt bàn PasGo", "Đặt bàn Pasgo", "Menu", "Thực đơn",
                "Xem thêm", "Đường", "Trang chủ", "Hotline"):
        if sep in txt and txt.find(sep) > 8:
            txt = txt.split(sep)[0].strip()
    # Bỏ prefix "Địa chỉ ...:" (label doanh nghiệp/thương hiệu)
    # Ví dụ: "Địa chỉ nhà hàng: Nhà hàng X: ADDRESS" → strip tới " : " thứ 2
    parts = re.split(r":\s", txt)
    if len(parts) >= 3:
        # phần địa chỉ là sau " : " thứ 2 (label-house, name-rest, addr)
        addr = ":".join(parts[2:]).strip()
    elif len(parts) == 2:
        # "Địa chỉ nhà hàng: ADDRESS" hoặc "Địa chỉ NAME: ADDRESS"
        head = parts[0]
        if re.search(r"nhà hàng|địa điểm|quán|cơ sở", head, re.I):
            addr = parts[1].strip()
        else:
            # head = "Địa chỉ <BrandName>" → phần sau " : " là địa chỉ
            addr = parts[1].strip() if ":" in txt[: txt.find(parts[1])] else txt
    else:
        addr = re.sub(r"^Địa chỉ[:\s]*", "", txt, flags=re.I).strip()
    # Nếu addr bắt đầu bằng dấu phẩy → bỏ
    addr = addr.lstrip(", .").strip()
    # Giới hạn 4 chuỗi
    if len(addr) > 250:
        addr = addr[:250]
    return addr or None


def clean_name(name: str) -> str:
    if not name:
        return name
    name = re.sub(r"\s+", " ", name).strip()
    # Bỏ hậu tố " | Pasgo.vn" / " | Xem menu ..." / " | Đặt bàn..."
    name = re.split(r"\s*\|\s*", name)[0].strip()
    name = re.split(r"\s+\|\s+(Xem|Đặt|Menu|Nhận|Ưu đãi|PasGo|Pasgo)", name, 1, flags=re.I)[0].strip()
    # bỏ hậu tố " - HomeStyle |..." hoặc " - Nhà hàng |..."
    # District phần cuối " - Quận 7" → bỏ nếu là district
    if " - " in name:
        base, _, tail = name.rpartition(" - ")
        if parse_district(tail):
            name = base.strip()
    return name.rstrip(" -:,-|").strip()


# Pasgo không có ảnh trên listing paginate → image coverage thấp (chỉ card home featured);
# giữ image hiện có (nếu có), không ghi đè bằng None.
def enrich(rec: dict, city: str, session: requests.Session) -> dict:
    url = rec["discovery_url"]
    try:
        r = session.get(url, headers=HEADERS_HTTP, timeout=25)
    except requests.RequestException:
        return rec
    if r.status_code != 200:
        return rec
    h = r.text

    # Title = "Name - Quận X" (Pasgo SEO). Lấy làm tên (sau khi clean).
    name = None
    mt = TITLE_RE.search(h)
    if mt:
        name = clean_name(unescape(mt.group(1)).strip())
    md = DESC_RE.search(h)
    desc = unescape(md.group(1)).strip() if md else None

    # Ưu tiên desc → sạch hơn nếu title chứa marketing-suffix lẫn lộn
    if name and "|" in name:
        alt = clean_name(desc or "")
        if alt and len(alt) >= 6 and len(alt) <= len(name) + 20:
            pass  # giữ name đã clean
    if not name:
        # fallback: slug → "Nha hang Buffet Sao Bac Dau Tan Son Nhat Hotel"
        slug_clean = re.sub(r"-\d+$", "", rec.get("slug", ""))
        name = slug_clean.replace("-", " ").strip().title()

    addr = parse_address(h)
    district = parse_district(addr or "") or parse_district(name or "") or parse_district(desc or "")

    ml = LATLNG_RE.search(h)
    lat = lng = None
    if ml:
        try:
            lat = float(ml.group(1)); lng = float(ml.group(2))
        except (TypeError, ValueError):
            pass

    rec["name"] = name or rec.get("name")
    rec["district"] = district
    rec["address"] = addr
    if lat is not None:
        rec["lat"] = lat
        rec["lng"] = lng
    rec.setdefault("image", None)
    rec["city"] = CITIES[city]["label"]
    rec["city_slug"] = city
    rec["detail_url"] = url
    rec["scraped_at"] = now_iso()
    return rec


def crawl(city: str, key: str, target: int, enrich_sleep: float = 1.0) -> list[dict]:
    label = CITIES[city]["label"]
    print(f"\n=== Pasgo {city} ({label}) — target {target} ===", flush=True)
    out_path = DATA_DIR / f"pasgo_{city}.json"

    # Resume
    existing: dict[int, dict] = {}
    if out_path.exists():
        try:
            for r in json.loads(out_path.read_text(encoding="utf-8")):
                existing[r["source_id"]] = r
        except Exception:
            pass
    enriched = sum(1 for r in existing.values() if r.get("address") or r.get("lat"))
    print(f"  đã có {len(existing)} (enriched {enriched})", flush=True)

    session = requests.Session()

    if len(existing) < target:
        print("  -- discovery (Zyte) --", flush=True)
        discovered = discover(city, key, session)
        print(f"  discovered {len(discovered)} unique restaurant", flush=True)
        # merge: giữ enriched cũ, thêm discovered mới
        for rid, info in discovered.items():
            if rid in existing:
                continue
            existing[rid] = info
        out_path.write_text(json.dumps(list(existing.values()), ensure_ascii=False, indent=2),
                            encoding="utf-8")
        print(f"  -> {len(existing)} discovered total", flush=True)

    # Enrich các record thiếu address (re-parse chi tiết)
    todo = [r for r in existing.values() if not r.get("address")]
    print(f"  -- enrich {len(todo)} records via HTTP --", flush=True)
    for i, rec in enumerate(todo, 1):
        enrich(rec, city, session)
        if i % 20 == 0:
            print(f"     enriched {i}/{len(todo)}", flush=True)
            out_path.write_text(json.dumps(list(existing.values()), ensure_ascii=False, indent=2),
                                encoding="utf-8")
        time.sleep(enrich_sleep + (0.3 if i % 5 == 0 else 0.0))

    # Lấy target đầu (đã enriched)
    final = [r for r in existing.values() if r.get("address") or r.get("lat")]
    if len(final) > target:
        final = final[:target]
    out_path.write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  -> saved {len(final)} enriched records", flush=True)
    return final


def summarize(city: str) -> None:
    path = DATA_DIR / f"pasgo_{city}.json"
    if not path.exists():
        print(f"  (no file for {city})"); return
    recs = json.loads(path.read_text(encoding="utf-8"))
    with_img = with_ll = with_addr = with_dist = 0
    districts: dict[str, int] = {}
    for r in recs:
        if r.get("image"): with_img += 1
        if r.get("lat") and r.get("lng"): with_ll += 1
        if r.get("address"): with_addr += 1
        d = r.get("district") or "?"
        districts[d] = districts.get(d, 0) + 1
        if d != "?": with_dist += 1
    total = len(recs)
    print(f"\n— {city} — total={total}")
    if total:
        print(f"   with image: {with_img} ({with_img * 100 // total}%)")
        print(f"   with lat/lng: {with_ll} ({with_ll * 100 // total}%)")
        print(f"   with address: {with_addr} ({with_addr * 100 // total}%)")
        print(f"   with district: {with_dist} ({with_dist * 100 // total}%)")
        top = sorted(districts.items(), key=lambda x: -x[1])[:8]
        print(f"   top districts: {' | '.join(f'{d}={n}' for d, n in top)}")
    for r in recs[:3]:
        print(f"   • {r.get('name','?')} — {r.get('district')} — lat={r.get('lat')} addr={(r.get('address') or '')[:60]}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--zyte-key", default=os.environ.get("ZYTE_KEY", ""),
                    help="Zyte API key (hoặc set ZYTE_KEY env)")
    ap.add_argument("--city", choices=list(CITIES))
    ap.add_argument("--target", type=int, default=300)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--summary-only", action="store_true")
    args = ap.parse_args()

    if args.summary_only:
        for c in (args.city and [args.city] or list(CITIES)):
            summarize(c)
        return 0

    if not args.zyte_key:
        print("ERROR: cần --zyte-key hoặc env ZYTE_KEY", file=sys.stderr)
        return 2

    cities = list(CITIES) if args.all or not args.city else [args.city]
    for c in cities:
        crawl(c, args.zyte_key, args.target)
    print("\n============= PASGO SUMMARY =============")
    for c in cities:
        summarize(c)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())