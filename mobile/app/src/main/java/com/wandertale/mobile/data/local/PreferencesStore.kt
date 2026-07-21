package com.wandertale.mobile.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("wander_tale_prefs")

class PreferencesStore(private val context: Context) {
    private val favoritesKey = stringSetPreferencesKey("favorite_trip_ids")

    val favoriteTripIds: Flow<Set<String>> = context.dataStore.data.map { it[favoritesKey] ?: emptySet() }

    suspend fun toggleFavorite(tripId: String): Set<String> {
        var result = emptySet<String>()
        context.dataStore.edit { prefs ->
            val current = prefs[favoritesKey] ?: emptySet()
            result = if (tripId in current) current - tripId else current + tripId
            prefs[favoritesKey] = result
        }
        return result
    }
}
