package com.wandertale.mobile.ui.navigation

object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val FORGOT = "forgot"
    const val MAIN = "main"
    const val HOME = "home"
    const val TRIPS = "trips"
    const val FAVORITES = "favorites"
    const val PROFILE = "profile"
    const val CREATE_TRIP = "create_trip"
    const val TRIP_DETAIL = "trip/{tripId}"
    const val TRIP_PLANNER = "planner"
    const val SETTINGS = "settings"
    const val ADMIN = "admin"
    const val BUSINESS = "business"
    const val BOOKING = "booking"
    const val BOOKING_DETAIL = "booking/{bookingId}"
    const val SAVED_OFFERS = "saved_offers"

    /** Routes where bottom nav should be hidden (prefix match). */
    val hideNavRoutePrefixes = setOf(
        CREATE_TRIP,
        SPLASH,
        LOGIN,
        REGISTER,
        FORGOT,
        TRIP_PLANNER,
        SETTINGS,
        SAVED_OFFERS,
        ADMIN,
        BUSINESS,
        BOOKING,
        "booking/",
        "trip/",
    )

    fun tripDetail(id: String) = "trip/$id"
    fun bookingDetail(id: String) = "booking/$id"

    fun tabToNavRoute(tab: String): String = when (tab) {
        "dashboard" -> HOME
        "trips" -> TRIPS
        "create" -> CREATE_TRIP
        "favorites" -> FAVORITES
        "profile" -> PROFILE
        else -> HOME
    }

    fun navRouteToTab(route: String): String = when (route) {
        HOME -> "dashboard"
        TRIPS -> "trips"
        FAVORITES -> "favorites"
        PROFILE -> "profile"
        else -> "dashboard"
    }

    fun shouldShowBottomNav(route: String?): Boolean {
        if (route == null) return false
        return hideNavRoutePrefixes.none { route.startsWith(it) }
    }
}
