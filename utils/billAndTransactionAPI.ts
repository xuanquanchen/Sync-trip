import { firestore } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  getDocs,
} from "@react-native-firebase/firestore"
import { Bill } from "../types/Bill";
import { Transaction } from "../types/Transaction";



/* =========================
    BILL API FUNCTIONS
   ========================= */

export const parseBill = (id: string, data: any): Bill => {
  if (!data.title || !data.participants) {
    throw new Error("Invalid bill data: missing required fields");
  }
  return {
    id,
    title: data.title,
    createdBy: data.createdBy,
    participants: data.participants,
    summary: data.summary || {},
    currency: data.currency || "USD",
    isDraft: data.isDraft || false,
    archived: data.archived || false,
    description: data.description || "",
    category: data.category || "",
  };
};

  

export const getBillById = async (tripId: string, billId: string): Promise<Bill> => {
    const billRef = doc(firestore, "trips", tripId, "bills", billId);
    const billSnap = await getDoc(billRef);
    if (!billSnap.exists) {
      throw new Error(`Bill with ID ${billId} doesn't exist in trip ${tripId}`);
    }
    return parseBill( billSnap.id, billSnap.data() ) as Bill;
};

export const createBill = async (tripId: string, billData: Bill): Promise<string> => {
    const billsRef = collection(firestore, "trips", tripId, "bills");
    const docRef = await addDoc(billsRef, {
      ...billData,
    });
    return docRef.id;
};
  
export const updateBill = async (
    tripId: string,
    billId: string,
    updatedData: Partial<Bill>
  ): Promise<void> => {
    const billRef = doc(firestore, "trips", tripId, "bills", billId);
    await updateDoc(billRef, {
      ...updatedData,
    });
};

export const deleteBill = async (tripId: string, billId: string): Promise<void> => {
    const billRef = doc(firestore, "trips", tripId, "bills", billId);
    await deleteDoc(billRef);
};

export const subscribeToBill = (
    tripId: string,
    billId: string,
    callback: (data: Bill | null) => void
  ) => {
    const billRef = doc(firestore, "trips", tripId, "bills", billId);
    return onSnapshot(billRef, (docSnap) => {
      if (docSnap.exists) {
        callback( parseBill( docSnap.id, docSnap.data() ) as Bill);
      } else {
        callback(null);
      }
    });
};



/* =========================
    TRANSACTION API FUNCTIONS
   ========================= */



export const getTransactionById = async (
tripId: string,
transactionId: string
): Promise<Transaction> => {
const transactionRef = doc(firestore, "trips", tripId, "transactions", transactionId);
const transactionSnap = await getDoc(transactionRef);
if (!transactionSnap.exists) {
    throw new Error(`Transaction with ID ${transactionId} doesn't exist in trip ${tripId}`);
}
return { transactionId: transactionSnap.id, ...transactionSnap.data() } as Transaction;
};

export const createTransaction = async (
    tripId: string,
    transactionData: Omit<Transaction, "transactionId">
  ): Promise<string> => {
    const transactionsRef = collection(firestore, "trips", tripId, "transactions");
    const docRef = await addDoc(transactionsRef, {
      ...transactionData,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
};

export const updateTransaction = async (
    tripId: string,
    transactionId: string,
    updatedData: Partial<Transaction>
  ): Promise<void> => {
    const transactionRef = doc(firestore, "trips", tripId, "transactions", transactionId);
    await updateDoc(transactionRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });
};

export const deleteTransaction = async (
    tripId: string,
    transactionId: string
  ): Promise<void> => {
    const transactionRef = doc(firestore, "trips", tripId, "transactions", transactionId);
    await deleteDoc(transactionRef);
};

export const subscribeToTransactions = (
    tripId: string,
    callback: (transactions: Transaction[]) => void
  ) => {

    if (!tripId) {
      console.error("subscribeToTransactions: tripId is invalid.");
      callback([]);
      return () => {};
    }

    const transactionsRef = collection(firestore, "trips", tripId, "transactions");
    return onSnapshot(
      transactionsRef,
      (snapshot) => {
        if (!snapshot) {
          console.error("subscribeToTransactions: Received null snapshot.");
          callback([]);
          return;
        }

        const transactionsArray: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists) {
            transactionsArray.push({ transactionId: docSnap.id, ...docSnap.data() } as Transaction);
          }
        });
      callback(transactionsArray);
    },
    (error) => {
      console.error("subscribeToTransactions: onSnapshot error:", error);
      callback([]);
    }
  );
};