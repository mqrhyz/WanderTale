# Crawl preview — số liệu để review (chưa đưa vào DB)

Crawled: **2026-07-02**
Mục đích: seed dữ liệu nhà hàng/quán ăn/cafe cho **agenda AI itinerary** của WanderTale (EXE202).

## Tổng quan kết hợp

| Nguồn | Thành phố | Records | Tên | Ảnh | Lat/lng | Địa chỉ |
|---|---|---:|---:|---:|---:|---:|
| Foody | TP. HCM | 391 | 391 | 391 | 391 | 391 |
| Foody | Hà Nội | 389 | 389 | 389 | 389 | 389 |
| Foody | Đà Lạt (Lâm Đồng) | 312 | 312 | 311 | 312 | 312 |
| Pasgo | TP. HCM | 300 | 300 | 0 | 300 | 158 |
| Pasgo | Hà Nội | 300 | 300 | 0 | 300 | 300 |
| **Tổng** | | **1692** | | | | |

> Pasgo không hỗ trợ Đà Lạt (slug `/da-lat` → 500). Đà Lạt dùng dữ liệu Foody `lam-dong` (283 thuộc TP Đà Lạt).

## So sánh chất lượng

| Nguồn | Tên | Ảnh | Lat/lng | Địa chỉ | Quận/district | Catégorie |
|---|---|---|---|---|---|---|
| **Foody** | ✅ sạch | ✅ 640×400 | ✅ có sẵn | ✅ 100% | ✅ sạch | ✅ nhiều category/cuisine |
| **Pasgo** | ✅ sạch (sau clean) | ❌ ~0% (listing paginate không có storage ảnh) | ✅ có sẵn (link Google Maps) | ⚠️ 53% HCM / 100% HN (parser một số record dính footer công ty Pasgo → đã loại bỏ address) | ⚠️ parse district tốt cho ~80% HN, HCM giảm do footer | ❌ Pasgo không có category |

## Foody (chính) — schema đầy đủ

```json
{
  "source": "foody",
  "source_id": 595,
  "name": "Morico - Contemporary Japanese Lifestyle - Lê Lợi",
  "address": "30 Lê Lợi, P. Bến Nghé",
  "city": "TP. HCM",
  "city_slug": "ho-chi-minh",
  "district": "Quận 1",
  "lat": 10.774454,
  "lng": 106.70549,
  "categories": ["Café/Dessert"],
  "cuisines": ["Món Nhật", "Món Á"],
  "image": "https://down-vn.img.susercontent.com/.../resize_ss640x400",
  "picture_count": 12404,
  "rating": 7.7,
  "total_review": 1422,
  "detail_url": "/ho-chi-minh/morico-...",
  "scraped_at": "2026-07-02T..."
}
```

Phân bố Foody (top):
- **HCM**: Quận 1 (151), Quận 3 (42), Quận 10 (28), Quận 7 (26), Bình Thạnh (26). Loại: Nhà hàng 189, Quán ăn 109, Café/Dessert 68, Buffet 49.
- **Hà Nội**: Hoàn Kiếm (77), Đống Đa (68), Hai Bà Trưng (60), Cầu Giấy (53), Ba Đình (51). Loại: Nhà hàng 160, Quán ăn 93, Café/Dessert 69, Buffet 48.
- **Đà Lạt**: TP Đà Lạt (283), Bảo Lộc (15), Đức Trọng (7). Loại: Quán ăn 100, Nhà hàng 79, Café/Dessert 79, Ăn vặt 17.

## Pasgo — schema

```json
{
  "source": "pasgo",
  "source_id": 712,
  "name": "Nhà hàng Pachi Pachi Mạc Đĩnh Chi",
  "district": "Quận 1",
  "city": "TP. HCM",
  "city_slug": "ho-chi-minh",
  "address": "Số 52 Mạc Đĩnh Chi, Phường Đa Kao, Quận 1, TP.HCM",
  "lat": 10.7874427640535,
  "lng": 106.7054456,
  "image": null,
  "detail_url": "https://pasgo.vn/nha-hang/...",
  "scraped_at": "2026-07-02T..."
}
```

## File & script

```
scripts/crawl-places/
├── crawl_foody.py     # Crawler Foody (HTTP JSON; có retry + dedupe + resume)
├── crawl_pasgo.py     # Crawler Pasgo (Zyte để discover link + HTTP để enrich detail)
└── data/
    ├── foody_ho-chi-minh.json   (267K, 391 records)
    ├── foody_ha-noi.json        (267K, 389 records)
    ├── foody_lam-dong.json      (210K, 312 records — 283 Đà Lạt)
    ├── pasgo_ho-chi-minh.json   (~215K, 300 records)
    ├── pasgo_ha-noi.json        (~215K, 300 records)
    └── PREVIEW.md
```

Chạy lại:
```bash
# Foody (HTTP thuần)
python3 scripts/crawl-places/crawl_foody.py --all --target 400

# Pasgo (cần Zyte API key)
python3 scripts/crawl-places/crawl_pasgo.py --all --target 300 \
  --zyte-key 8541cf71c7f44756a9df5ef20e2c36c6
```

## Riviu — chưa crawl

Riviu (`/ho-chi-minh`) **không phải directory nhà hàng** mà là platform review/blog. Mỗi post có schema.org `Review > itemReviewed > Restaurant` JSON-LD (có name + address + image, **không có lat/lng**). Để crawl cần:
1. Find review post link theo city via các trang category (`/mon-viet`, `/mon-nhat`, ...) + paginate → cần render JS bằng Zyte.
2. Visit từng post (Zyte call mỗi post) → parse JSON-LD.
3. Geocode address → lat/lng qua Nominatim.
   Cost: hàng trăm Zyte call + nhiều place bị trùng lặp (cùng quán nhiều review).

Nếu cần Riviu, cho mình OK để dựng thêm `crawl_riviu.py` (chạy được nhưng tốn Zyte budget + lat/lng phải tự geocode).

## Khuyến nghị mang vào DB sau

- **Bảng đề xuất**: tạo `place_places` riêng cho crawl (name, address, city, district, lat, lng, image_urls[], categories[], cuisines[], source, source_id, source_url, raw jsonb, scraped_at), rồi AI itinerary (`services/openaiItinerary.ts` + `tripSuggestPlaces.ts`) truy vấn theo `(city, category)` để lấy pool gợi ý địa điểm thực tế ở Việt Nam thay vì chỉ Google Places.
- Foody data đủ tốt để seed trực tiếp. Pasgo dùng để bổ sung thêm nhà hàng "đặt bàn" qua Pasgo.

## Lưu ý pháp lý

ToS foody/pasgo/riviu cấm scraping thương mại. Dữ liệu chỉ dùng nội bộ research/đồ án EXE202, **không redistribute**.