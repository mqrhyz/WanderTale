"""Generate SQL seed file cho place_places từ filtered_for_db.json.

Output: supabase/seed/place_places_seed.sql (INSERT ... ON CONFLICT).
"""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts/crawl-places/data/filtered_for_db.json"
OUT = ROOT / "supabase/seed/place_places_seed.sql"
OUT.parent.mkdir(parents=True, exist_ok=True)


def sql_str(s):
    if s is None:
        return "NULL"
    s = str(s)
    return "'" + s.replace("'", "''") + "'"


def sql_array(items):
    if not items:
        return "ARRAY[]::TEXT[]"
    cleaned = [str(x) for x in items if x]
    return "ARRAY[" + ",".join(sql_str(x) for x in cleaned) + "]::TEXT[]"


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    print(f"loaded {len(data)} records")
    # Loại trùng (source, source_id) lần nữa cho chắc
    seen = set()
    uniq = []
    for r in data:
        key = (r["source"], str(r["source_id"]))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)
    print(f"unique: {len(uniq)}")

    lines = [
        "-- Seed place_places (Foody crawl — 1091 records HCM/HN/Đà Lạt).",
        "-- Chạy sau migration 20260702000000_place_places.sql",
        "-- Insert idempotent (ON CONFLICT source,source_id).",
        "\\set ON_ERROR_STOP on",
        "BEGIN;",
        "TRUNCATE TABLE public.place_places RESTART IDENTITY CASCADE;",
        "",
    ]
    cols = ("source, source_id, name, address, city, city_slug, district, "
            "lat, lng, categories, cuisines, image, image_urls, rating, "
            "total_review, detail_url, raw, scraped_at")
    BATCH = 200
    for i in range(0, len(uniq), BATCH):
        chunk = uniq[i:i + BATCH]
        lines.append(f"INSERT INTO public.place_places ({cols}) VALUES")
        vals = []
        for r in chunk:
            rating = r.get("rating")
            rating_sql = f"{float(rating)!r}" if rating is not None else "NULL"
            tr = r.get("total_review")
            tr_sql = f"{int(tr)}" if tr is not None else "NULL"
            lat = r.get("lat")
            lng = r.get("lng")
            lat_sql = f"{float(lat)!r}" if lat is not None else "NULL"
            lng_sql = f"{float(lng)!r}" if lng is not None else "NULL"
            img = r.get("image")
            image_urls = [img] if img else []
            scraped = r.get("scraped_at")
            image_urls_sql = sql_array(image_urls)
            row = (
                f"  ({sql_str(r['source'])}, {sql_str(str(r['source_id']))}, "
                f"{sql_str(r['name'])}, {sql_str(r['address'])}, "
                f"{sql_str(r.get('city'))}, {sql_str(r.get('city_slug'))}, "
                f"{sql_str(r.get('district'))}, {lat_sql}, {lng_sql}, "
                f"{sql_array(r.get('categories') or [])}, {sql_array(r.get('cuisines') or [])}, "
                f"{sql_str(img)}, {image_urls_sql}, {rating_sql}, {tr_sql}, "
                f"{sql_str(r.get('detail_url'))}, "
                f"'{json.dumps(r, ensure_ascii=False).replace(chr(39), chr(39)*2)}'::jsonb, "
                f"{sql_str(scraped)})"
            )
            vals.append(row)
        lines.append(",\n".join(vals))
        lines.append("ON CONFLICT (source, source_id) DO NOTHING;")
        lines.append("")

    lines.append("COMMIT;")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"saved {OUT} ({OUT.stat().st_size/1024:.1f}KB)")


if __name__ == "__main__":
    main()