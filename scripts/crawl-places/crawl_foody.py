"""
Crawl dữ liệu địa điểm từ Foody (HTTP JSON, không cần browser) cho mục đích研发/seed dữ liệu AI itinerary.

Output: scripts/crawl-places/data/foody_{city}.json
Mỗi record:
  {
    "source": "foody",
    "source_id": int (Foody Id),
    "name": str,
    "address": str,
    "city": str,                 # "TP. HCM" / "Hà Nội" / "Lâm Đồng"
    "city_slug": str,
    "district": str | None,
    "lat": float | None,
    "lng": float | None,
    "categories": [str],         # ví dụ ["Nhà hàng", "Café/Dessert"]
    "cuisines": [str],
    "image": str | None,         # ảnh chính (640x400)
    "picture_count": int,
    "rating": float | None,
    "total_review": int,
    "detail_url": str,
    "scraped_at": str ISO
  }

Chạy:
  python3 crawl_foody.py --city ho-chi-minh --target 400
  python3 crawl_foody.py --city ha-noi      --target 400
  python3 crawl_foody.py --city lam-dong     --target 500   # Đà Lạt nằm dưới Lâm Đồng
  python3 crawl_foody.py --all               # cả 3, mặc định 400

Lưu ý: Foody throttle ("System Busy") khi gọi nhanh → có delay + retry backoff.
Chỉ chạy vì mục đích Personal—nghiên cứu. ToS Foody cấm scraping thương mại.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
import datetime as dt
from pathlib import Path

import requests
from bs4 import BeautifulSoup  # noqa: F401  (dự phòng parse HTML lỗi)

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
HEADERS = {
    "User-Agent": UA,
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
}

CITIES = {
    "ho-chi-minh": {"label": "TP. HCM",   "target": 400, "provinceId": 217},
    "ha-noi":      {"label": "Hà Nội",    "target": 400, "provinceId": 49},
    "lam-dong":    {"label": "Lâm Đồng",  "target": 500, "provinceId": 64},   # Đà Lạt
}

# Endpoints per category. Foody JSON cap ~4 pages = 48 items / endpoint.
# Kết hợp nhiều endpoint (có overlap) rồi dedupe theo source_id để đạt target.
ENDPOINTS = [("dia-diem", "Ăn uống"), ("nha-hang", "Nhà hàng"),
             ("quan-an", "Quán ăn"), ("cafe", "Café/Dessert"),
             ("buffet", "Buffet"),
             ("dia-diem-phong-cach-viet-nam", "Món Việt"),
             ("dia-diem-phong-cach-nhat-ban", "Món Nhật"),
             ("dia-diem-phong-cach-han-quoc", "Món Hàn"),
             ("dia-diem-phong-cach-thai-lan", "Món Thái"),
             ("dia-diem-phong-cach-chau-a", "Món Á"),
             ("dia-diem-phong-cach-an-do", "Món Ấn"),
             ("dia-diem-phong-cach-y", "Món Ý")]

NAH_FOOD_MASTER_ID = 1   # MasterCategoryId cho "Ăn uống" — tất cả item trên /dia-diem


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def fetch_page(city: str, endpoint: str, page: int, session: requests.Session,
               province_id: int | None = None, max_retry: int = 4) -> dict | None:
    url = f"https://www.foody.vn/{city}/{endpoint}"
    params = {"t": "placeJson"}
    if page > 1:
        params["page"] = page
    if province_id:
        params["provinceId"] = province_id
    backoff = 3.0
    for attempt in range(max_retry):
        try:
            r = session.get(url, params=params, headers={
                **HEADERS,
                "Referer": f"https://www.foody.vn/{city}/{endpoint}",
            }, timeout=30)
        except requests.RequestException as e:
            print(f"  ! [{endpoint} p{page}] attempt {attempt+1} network: {e}", file=sys.stderr)
            time.sleep(backoff); backoff *= 2; continue
        body = r.text
        if r.status_code != 200 or body.lstrip().startswith("<!DOCTYPE") or "<title>" in body[:300]:
            title = ""
            try:
                title = BeautifulSoup(body, "html.parser").title.get_text(strip=True)
            except Exception:
                pass
            print(f"  ! [{endpoint} p{page}] attempt {attempt+1} non-json ({title})", file=sys.stderr)
            time.sleep(backoff); backoff *= 2; continue
        try:
            return json.loads(body)
        except json.JSONDecodeError as e:
            print(f"  ! [{endpoint} p{page}] json decode: {e}", file=sys.stderr)
            time.sleep(backoff); backoff *= 2; continue
    return None


def normalize_item(it: dict, city: str, city_label: str) -> dict | None:
    # Chỉ giữ food/drink (đều thuộc về /dia-diem nên mặc định OK). Lọc bỏ branch Parent nếu thiếu tên.
    name = (it.get("Name") or "").strip()
    if not name:
        return None
    cats = [c.get("Name") for c in (it.get("Categories") or []) if c.get("Name")]
    cuisines = [c.get("Name") for c in (it.get("Cuisines") or []) if c.get("Name")]
    # Ưu tiên ảnh lớn
    img = it.get("MobilePicturePath") or it.get("PicturePathLarge") or it.get("PicturePath") or None
    lat = it.get("Latitude")
    lng = it.get("Longitude")
    try:
        lat = float(lat) if lat not in (None, "") else None
        lng = float(lng) if lng not in (None, "") else None
    except (TypeError, ValueError):
        lat = lng = None
    try:
        rating = float(it.get("AvgRatingOriginal") or it.get("AvgRating") or 0) or None
    except (TypeError, ValueError):
        rating = None
    return {
        "source": "foody",
        "source_id": it.get("Id"),
        "name": name,
        "address": (it.get("Address") or "").strip() or None,
        "city": it.get("City") or city_label,
        "city_slug": city,
        "district": it.get("District") or None,
        "lat": lat,
        "lng": lng,
        "categories": cats,
        "cuisines": cuisines,
        "image": img,
        "picture_count": int(it.get("PictureCount") or 0),
        "rating": rating,
        "total_review": int(it.get("TotalReview") or 0),
        "detail_url": it.get("DetailUrl") or None,
        "scraped_at": now_iso(),
    }


def crawl(city: str, target: int, page_cap: int = 4, sleep_base: float = 2.5,
          max_same_dup: int = 3, province_id: int | None = None) -> list[dict]:
    label = CITIES.get(city, {}).get("label", city)
    province_id = province_id or CITIES.get(city, {}).get("provinceId")
    print(f"\n=== Foody {city} ({label}) — target {target} (provinceId={province_id}) ===", flush=True)
    out_path = DATA_DIR / f"foody_{city}.json"

    # Resume: load existing IDs để không crawl lại nếu đã có file
    existing: dict[int, dict] = {}
    if out_path.exists():
        try:
            for r in json.loads(out_path.read_text(encoding="utf-8")):
                sid = r.get("source_id")
                if sid is not None:
                    existing[sid] = r
        except Exception:
            pass
    if len(existing) >= target:
        print(f"  đã có {len(existing)} ≥ target {target} → skip")
        return list(existing.values())
    print(f"  đã có {len(existing)} records (resume)")
    collected = dict(existing)

    session = requests.Session()
    for endpoint, ep_label in ENDPOINTS:
        if len(collected) >= target:
            break
        print(f"  -- endpoint /{endpoint} ({ep_label})", flush=True)
        last_items: tuple | None = None
        dup_streak = 0
        for page in range(1, page_cap + 1):
            if len(collected) >= target:
                break
            payload = fetch_page(city, endpoint, page, session, province_id)
            if payload is None:
                print(f"     p{page}: fail → skip endpoint")
                break
            items = payload.get("searchItems") or []
            total = payload.get("totalResult")
            if page == 1:
                print(f"     endpoint totalResult={total}", flush=True)
            if not items:
                print(f"     p{page}: empty → next endpoint")
                break
            key = tuple(sorted((i.get("Id"), i.get("Name")) for i in items))
            if last_items == key:
                dup_streak += 1
                if dup_streak >= max_same_dup:
                    print(f"     p{page}: identical page x{dup_streak} → next endpoint")
                    break
            else:
                dup_streak = 0
            last_items = key

            added = 0
            for it in items:
                rec = normalize_item(it, city, label)
                if not rec:
                    continue
                sid = rec["source_id"]
                if sid in collected:
                    continue
                collected[sid] = rec
                added += 1
            print(f"     p{page}: +{added} (cum {len(collected)}/{target})", flush=True)
            out_path.write_text(json.dumps(list(collected.values()), ensure_ascii=False, indent=2), encoding="utf-8")
            time.sleep(max(0.8, sleep_base) + random.uniform(0, 1.0))
        # Longer delay between endpoints to avoid "System Busy"
        time.sleep(max(2.0, sleep_base) + random.uniform(0, 1.5))

    out_path.write_text(json.dumps(list(collected.values()), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  -> saved {len(collected)} records")
    return list(collected.values())


def summarize(city: str) -> None:
    path = DATA_DIR / f"foody_{city}.json"
    if not path.exists():
        print(f"  (no file for {city})")
        return
    recs = json.loads(path.read_text(encoding="utf-8"))
    by_district: dict[str, int] = {}
    with_img = with_ll = with_addr = 0
    cats: dict[str, int] = {}
    for r in recs:
        d = r.get("district") or "?"
        by_district[d] = by_district.get(d, 0) + 1
        if r.get("image"): with_img += 1
        if r.get("lat") is not None and r.get("lng") is not None: with_ll += 1
        if r.get("address"): with_addr += 1
        for c in r.get("categories") or []:
            cats[c] = cats.get(c, 0) + 1
    top_districts = sorted(by_district.items(), key=lambda x: -x[1])[:8]
    total = len(recs)
    print(f"\n— {city} — total={total}")
    print(f"   with image: {with_img} ({with_img*100//total if total else 0}%)")
    print(f"   with lat/lng: {with_ll} ({with_ll*100//total if total else 0}%)")
    print(f"   with address: {with_addr} ({with_addr*100//total if total else 0}%)")
    print(f"   top districts: {' | '.join(f'{d}={n}' for d,n in top_districts)}")
    print(f"   top categories: {' | '.join(f'{c}={n}' for c,n in sorted(cats.items(), key=lambda x:-x[1])[:8])}")
    # samples
    print("   samples:")
    for r in recs[:3]:
        print(f"     • {r['name']} — {r['address']} — {r['district']} — img={bool(r['image'])} lat={r['lat']}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", choices=list(CITIES))
    ap.add_argument("--target", type=int, default=None)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--pages-cap", type=int, default=80)
    ap.add_argument("--sleep", type=float, default=2.5)
    ap.add_argument("--summary-only", action="store_true")
    args = ap.parse_args()

    if args.summary_only:
        for c in (args.city and [args.city] or list(CITIES)):
            summarize(c)
        return 0

    if args.all or not args.city:
        for c, meta in CITIES.items():
            crawl(c, target=args.target or meta["target"],
                  page_cap=args.pages_cap, sleep_base=args.sleep,
                  province_id=meta.get("provinceId"))
        for c in CITIES:
            summarize(c)
        return 0

    crawl(args.city, target=args.target or CITIES[args.city]["target"],
          page_cap=args.pages_cap, sleep_base=args.sleep,
          province_id=CITIES[args.city].get("provinceId"))
    summarize(args.city)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())