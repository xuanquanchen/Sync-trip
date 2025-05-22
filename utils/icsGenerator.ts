// file: utils/icsGenerator.ts
import { createEvents } from "ics";
import { Trip } from "../types/Trip";
import { Destination } from "../types/Destination";

/**
 * Generates an iCalendar (.ics) string from a Trip object.
 */
export async function generateICS(trip: Trip): Promise<string> {
  const events = trip.destinations.map((dest: Destination) => {
    const dateObj = dest.date instanceof Date ? dest.date : new Date(dest.date);
    const endDateObj = new Date(dateObj.getTime() + 60 * 60 * 1000);
    return {
      title: dest.description || trip.title,
      start: [
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        dateObj.getDate(),
        dateObj.getHours(),
        dateObj.getMinutes(),
      ],
      // Set an arbitrary 1-hour event duration.
      end: [
        endDateObj.getFullYear(),
        endDateObj.getMonth() + 1,
        endDateObj.getDate(),
        endDateObj.getHours(),
        endDateObj.getMinutes(),
      ],
      location: dest.address || "",
      description: `Trip: ${trip.title}`,
    };
  });

  const { value, error } = createEvents(events);
  if (error) {
    throw error;
  }
  return value;
}