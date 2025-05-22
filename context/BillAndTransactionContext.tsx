import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "@react-native-firebase/firestore";
import {firestore, getUserDocRef} from "../utils/firebase";
import { Bill } from "../types/Bill";
import {
  createBill as apiCreateBill,
  updateBill as apiUpdateBill,
  deleteBill as apiDeleteBill,
  parseBill,
} from "../utils/billAndTransactionAPI";
import { useTrip } from "./TripContext"; // Import current trip context to get the currentTripId

// Define the context type for bills and transactions
interface BillTransactionContextType {
  bills: Bill[];
  // Bill API functions
  createBill: (bill: Bill) => Promise<string>;
  updateBill: (billId: string, updatedBill: Partial<Bill>) => Promise<void>;
  deleteBill: (billId: string) => Promise<void>;
  archiveBill: (billId: string) => Promise<void>;
  restoreBill: (billId: string) => Promise<void>;
}

const BillTransactionContext = createContext<BillTransactionContextType | undefined>(undefined);

export const BillTransactionProvider = ({ children }: { children: ReactNode }) => {
  // State for bills and transactions
  const [bills, setBills] = useState<Bill[]>([]);

  // Get the current trip from TripContext
  const { currentTrip } = useTrip();
  const currentTripId = currentTrip?.id;

  
  // Subscribe to the bills collection changes of the current trip.
  useEffect(() => {
    if (!currentTripId) return;

    const billsRef = collection(firestore, "trips", currentTripId, "bills");
    const unsubscribe = onSnapshot(
      billsRef,
      (snapshot) => {
        if (snapshot && snapshot.docs) {
          const billsData = snapshot.docs.map((docSnap) =>
            parseBill(docSnap.id, docSnap.data()),
          ) as Bill[];
          console.log('🔔 [Context] onSnapshot bills:', billsData.map(b => ({
            id: b.id,
            archived: b.archived,
          })));
          setBills(billsData);
        } else {
          console.error("Bills onSnapshot: received a null snapshot");
        }
      },
      (error) => {
        console.error("Bills onSnapshot error:", error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [currentTripId]);

  // Create a new bill using the API helper function
  const createBill = async (bill: Bill): Promise<string> => {
    if (!currentTripId) throw new Error("No current trip available.");
    const newId = await apiCreateBill(currentTripId, bill);
    //send notification for the new created bill
    bill.participants.forEach((participant) => {

    })
    return newId;
  };

  // Update an existing bill using the API helper function
  const updateBill = async (billId: string, updatedBill: Partial<Bill>): Promise<void> => {
    if (!currentTripId) throw new Error("No current trip available.");
    if (
      !updatedBill ||
      typeof updatedBill !== "object" ||
      Object.keys(updatedBill).length === 0
    ) {
      console.warn(`updateBill: nothing to update for bill ${billId}`);
      return;
    }
    const cleanData: Record<string, any> = {};
    Object.entries(updatedBill).forEach(([key, value]) => {
      if (value !== undefined && key !== "isDraft") {
        cleanData[key] = value;
      }
    });
    
    if (Object.keys(cleanData).length === 0) {
      console.warn(`updateBill: no valid fields to update for bill ${billId}`);
      return;
    }

    await apiUpdateBill(currentTripId, billId, cleanData);
  };

  // Delete a bill using the API helper function
  const deleteBill = async (billId: string): Promise<void> => {
    if (!currentTripId) throw new Error("No current trip available.");
    await apiDeleteBill(currentTripId, billId);
  };

  const archiveBill = async (billId: string) => {
    if (!currentTripId) return;
    await apiUpdateBill(currentTripId, billId, { archived: true });
  };
  
  const restoreBill = async (billId: string) => {
    if (!currentTripId) throw new Error("No current trip available.");
    await apiUpdateBill(currentTripId, billId, { archived: false });
  };

  return (
    <BillTransactionContext.Provider
      value={{
        bills,
        createBill,
        updateBill,
        deleteBill,
        archiveBill,
        restoreBill,
      }}
    >
      {children}
    </BillTransactionContext.Provider>
  );
};

// Custom hook to use the BillTransactionContext
export const useBillTransaction = () => {
  const context = useContext(BillTransactionContext);
  if (!context) {
    throw new Error("useBillTransaction must be used within a BillTransactionProvider");
  }
  return context;
};