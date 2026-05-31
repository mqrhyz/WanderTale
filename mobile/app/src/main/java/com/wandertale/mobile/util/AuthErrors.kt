package com.wandertale.mobile.util

fun formatAuthError(error: Throwable, fallback: String): String {
    val msg = error.message.orEmpty()
    return when {
        msg.contains("timeout", ignoreCase = true) ->
            "Kết nối Supabase quá chậm (timeout). Kiểm tra mạng emulator/thiết bị rồi thử lại."
        msg.contains("Unable to resolve host", ignoreCase = true) ||
            msg.contains("UnknownHost", ignoreCase = true) ->
            "Không có kết nối mạng. Bật Wi‑Fi/data trên emulator hoặc thiết bị."
        msg.contains("Connection refused", ignoreCase = true) ||
            msg.contains("Failed to connect", ignoreCase = true) ->
            "Không kết nối được máy chủ. Kiểm tra mạng và thử lại."
        msg.isNotBlank() -> msg
        else -> fallback
    }
}

fun formatApiError(error: Throwable, fallback: String = "Không tải được dữ liệu."): String {
    val msg = error.message.orEmpty()
    return when {
        msg.contains("Connection refused", ignoreCase = true) ||
            msg.contains("Failed to connect", ignoreCase = true) ->
            "Backend API chưa chạy. Trên máy dev: cd wander-tale/backend && npm run dev (cổng 8000). Emulator dùng http://10.0.2.2:8000."
        msg.contains("timeout", ignoreCase = true) ->
            "Backend phản hồi quá chậm. Kiểm tra server đang chạy tại cổng 8000."
        msg.contains("Unable to resolve host", ignoreCase = true) ||
            msg.contains("UnknownHost", ignoreCase = true) ->
            "Không tìm thấy máy chủ API. Kiểm tra API_URL trong mobile/local.properties."
        msg.isNotBlank() -> msg
        else -> fallback
    }
}
