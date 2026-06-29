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
            "Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng."
        msg.contains("timeout", ignoreCase = true) ->
            "Máy chủ phản hồi chậm. Vui lòng thử lại."
        msg.contains("Unable to resolve host", ignoreCase = true) ||
            msg.contains("UnknownHost", ignoreCase = true) ->
            "Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng."
        msg.isNotBlank() -> msg
        else -> fallback
    }
}
