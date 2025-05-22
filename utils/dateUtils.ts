
import { Timestamp } from "@react-native-firebase/firestore";

export const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const convertTimestampToDate = (ts: any): Date => {
    // If ts is an instance of Timestamp, use its toDate() method.
    if (ts instanceof Timestamp) {
        return ts.toDate();
    }
    // Otherwise, assume it has seconds and nanoseconds properties.
    return new Date(ts.seconds * 1000);
};
