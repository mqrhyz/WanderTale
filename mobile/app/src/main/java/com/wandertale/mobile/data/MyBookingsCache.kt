package com.wandertale.mobile.data

import com.wandertale.mobile.data.model.BookingRecord

/** In-memory cache for user bookings so the bottom-bar "Đặt chỗ" tab
 *  and other booking lists don't reload from network on every composition. */
object MyBookingsCache {
    var bookings: List<BookingRecord>? = null
        private set

    private var updatedAt: Long = 0
    private const val TTL_MS = 60_000L // 1 phút

    fun isFresh(): Boolean = bookings != null && (System.currentTimeMillis() - updatedAt) < TTL_MS

    fun set(list: List<BookingRecord>) {
        bookings = list
        updatedAt = System.currentTimeMillis()
    }

    fun clear() {
        bookings = null
        updatedAt = 0
    }
}
