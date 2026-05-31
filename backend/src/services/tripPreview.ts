import { fetchWeatherForecast, resolveDestinationCoords } from "./weatherService.js";

export async function previewTripDestination(destination: string) {
  const geo = await resolveDestinationCoords(destination);
  const weather = await fetchWeatherForecast(geo.lat, geo.lng);
  return {
    destination: geo.formatted_address ?? destination,
    lat: geo.lat,
    lng: geo.lng,
    weather,
  };
}
