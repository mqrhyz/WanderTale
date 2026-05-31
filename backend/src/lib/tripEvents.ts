import { EventEmitter } from "node:events";

export type TripEventType =
  | "skeleton_ready"
  | "route_optimized"
  | "prices_ready"
  | "images_progress"
  | "slot_image"
  | "images_ready"
  | "hotel_images_ready"
  | "coords_ready"
  | "complete"
  | "trip_update";

export type TripUpdatePayload = {
  type: TripEventType;
  tripId: string;
  payload?: Record<string, unknown>;
};

class TripEventBus extends EventEmitter {
  emitTrip(tripId: string, update: Omit<TripUpdatePayload, "tripId">): void {
    const event: TripUpdatePayload = { tripId, ...update };
    this.emit(`trip:${tripId}`, event);
    this.emit("trip:*", event);
  }
}

export const tripEventEmitter = new TripEventBus();

export function emitTripEvent(
  tripId: string,
  type: TripEventType,
  payload?: Record<string, unknown>
): void {
  tripEventEmitter.emitTrip(tripId, { type, payload });
}
