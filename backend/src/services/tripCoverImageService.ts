import { resolvePexelsCoverUrl } from "../lib/pexels.js";

type TripLike = { id: string; destination: string };

export async function enrichTripWithCoverImage<T extends TripLike>(
  trip: T
): Promise<T & { cover_image_url: string | null }> {
  const cover_image_url = await resolvePexelsCoverUrl(trip.destination, trip.id);
  return { ...trip, cover_image_url };
}

export async function enrichTripsWithCoverImages<T extends TripLike>(
  trips: T[]
): Promise<Array<T & { cover_image_url: string | null }>> {
  return Promise.all(trips.map((t) => enrichTripWithCoverImage(t)));
}
