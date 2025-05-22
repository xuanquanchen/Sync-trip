import { firestore } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  getDocs,
} from "@react-native-firebase/firestore";
import { Trip } from "../types/Trip";
import { Destination } from "../types/Destination";
import { ChecklistItem } from "../types/Checklist";
import { Announcement } from "../types/Announcement";

export const getATripById = async (tripId: string): Promise<Trip> => {
  const tripRef = doc(firestore, "trips", tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists) {
    throw new Error(`Trip with ${tripId} doesn't exist`);
  }
  return { id: tripSnap.id, ...tripSnap.data() } as Trip;
};

// Create a new trip and return its document ID.
export const createTrip = async (tripData: Trip): Promise<string> => {
  const tripRef = await addDoc(collection(firestore, "trips"), {
    ...tripData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return tripRef.id;
};

// Update an existing trip.
export const updateTrip = async (tripId: string, updatedData: Partial<Trip>) => {
  const tripRef = doc(firestore, "trips", tripId);
  await updateDoc(tripRef, {
    ...updatedData,
    updatedAt: serverTimestamp(),
  });
};

// Add a destination to a trip.
export const addDestinationToTrip = async (tripId: string, destination: any) => {
  try {
    if (!tripId) throw new Error("Trip ID is missing");
    const destinationsRef = collection(firestore, "trips", tripId, "destinations");
    const docRef = await addDoc(destinationsRef, {
      ...destination,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding destination:", error);
    throw error;
  }
};

export const deleteDestinationInTrip = async (tripId: string, destinationId: string) => {
  try {
    if (!tripId) throw new Error("Trip ID is missing");
    const destinationRef = doc(firestore, "trips", tripId, "destinations", destinationId);
    await deleteDoc(destinationRef);
    console.log(`Destination was deleted with ID ${destinationRef.id}`);
  } catch (error) {
    console.error("Error deleting destination:", error);
    throw error;
  }
};

// Get a trip with real-time updates.
export const subscribeToTrip = (tripId: string, callback: (data: any) => void) => {
  const tripRef = doc(firestore, "trips", tripId);
  return onSnapshot(tripRef, (docSnap) => {
    if (docSnap.exists) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

export const updateDestination = async (
  tripId: string,
  destinationId: string,
  updatedData: Partial<Destination>
) => {
  if (updatedData.date instanceof Date) {
    updatedData.date = Timestamp.fromDate(updatedData.date) as any;
  }
  const destinationRef = doc(firestore, "trips", tripId, "destinations", destinationId);
  await updateDoc(destinationRef, {
    ...updatedData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTrip = async (tripId: string): Promise<void> => {
  // Delete destinations and their nested subcollections (checklists)
  const destinationsCollection = collection(firestore, "trips", tripId, "destinations");
  const destinationsSnapshot = await getDocs(destinationsCollection);

  for (const destinationDoc of destinationsSnapshot.docs) {
    // Delete checklists within each destination
    const checklistsCollection = collection(firestore, "trips", tripId, "destinations", destinationDoc.id, "checklists");
    const checklistsSnapshot = await getDocs(checklistsCollection);
    for (const checklistDoc of checklistsSnapshot.docs) {
      await deleteDoc(doc(firestore, "trips", tripId, "destinations", destinationDoc.id, "checklists", checklistDoc.id));
    }
    // Delete the destination document itself
    await deleteDoc(doc(firestore, "trips", tripId, "destinations", destinationDoc.id));
  }

  // Delete announcements (notices) subcollection
  const noticesCollection = collection(firestore, "trips", tripId, "notices");
  const noticesSnapshot = await getDocs(noticesCollection);
  for (const noticeDoc of noticesSnapshot.docs) {
    await deleteDoc(doc(firestore, "trips", tripId, "notices", noticeDoc.id));
  }

  // Finally, delete the trip document itself
  await deleteDoc(doc(firestore, "trips", tripId));
};

// Checklist API functions

export const addChecklistItem = async (
  tripId: string,
  destId: string,
  text: string,
  completed: boolean = false
): Promise<void> => {
  if (!tripId || !destId) throw new Error("Trip or Destination ID is missing");
  const checklistRef = collection(
    firestore,
    "trips",
    tripId,
    "destinations",
    destId,
    "checklists"
  );
  const docRef = await addDoc(checklistRef, {
    text,
    completed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  console.log("Checklist item added with ID:", docRef.id);
};

export const updateChecklistItem = async (
  tripId: string,
  destId: string,
  itemId: string,
  updates: Partial<Pick<ChecklistItem, "text" | "completed">>
): Promise<void> => {
  if (!tripId || !destId || !itemId) throw new Error("Missing IDs for checklist update");
  const itemRef = doc(
    firestore,
    "trips",
    tripId,
    "destinations",
    destId,
    "checklists",
    itemId
  );
  await updateDoc(itemRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteChecklistItem = async (
  tripId: string,
  destId: string,
  itemId: string
): Promise<void> => {
  if (!tripId || !destId || !itemId) throw new Error("Missing IDs for checklist deletion");
  const itemRef = doc(
    firestore,
    "trips",
    tripId,
    "destinations",
    destId,
    "checklists",
    itemId
  );
  await deleteDoc(itemRef);
  console.log(`Checklist item deleted with ID ${itemRef.id}`);
};


// create Announcement
export const createAnnouncement = async (
  tripId: string, 
  message: string,
  authorID: string 
): Promise<void> => { 
  if (!message) throw new Error("Announcement text is missing");
  const announcementRef = collection(firestore, "trips", tripId, "notices");
  const docRef = await addDoc(announcementRef, {
    message: message,
    authorID: authorID,
    lastUpdatedBy: authorID,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  console.log("Announcement added with ID:", docRef.id);
};

export const updateAnnouncement = async (
  tripId: string,
  announcementId: string,
  newMessage: string,
  lastUpdatedBy: string
): Promise<void> => {
  if (!announcementId) throw new Error("Announcement ID is missing");
  const announcementDocRef = doc(firestore, "trips", tripId, "notices", announcementId);
  await updateDoc(announcementDocRef, {
    message: newMessage,
    lastUpdatedBy: lastUpdatedBy,
    updatedAt: serverTimestamp(),
  });
};

export const deleteAnnouncement = async (
  tripId: string,
  announcementId: string
): Promise<void> => {
  if (!announcementId) throw new Error("Announcement ID is missing");
  const announcementDocRef = doc(firestore, "trips", tripId, "notices", announcementId);
  await deleteDoc(announcementDocRef);
  console.log(`Announcement deleted with ID ${announcementDocRef.id}`);
};
