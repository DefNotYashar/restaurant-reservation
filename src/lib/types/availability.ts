export type Channel = "TELEGRAM" | "WHATSAPP" | "WEB" | "STAFF";

export type AvailabilityResult = "AVAILABLE" | "NOT_AVAILABLE";

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export interface AvailabilityCheck {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  excludeReservationId?: string;
}

export interface AvailabilityResponse {
  status: AvailabilityResult;
  availableTimeSlots?: TimeSlot[];
  reason?: string;
}

export interface TableSuggestion {
  tableId: string;
  name: string;
  capacity: number;
}
