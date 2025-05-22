import {auth, firestore} from './firebase';
import {
    arrayUnion,
    arrayRemove,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where
} from '@react-native-firebase/firestore';
import {User} from '../types/User';
import {Alert} from "react-native";

// // Create a new user in Firestore
// export const createUser = async (userData: User): Promise<void> => {
//     const userRef = doc(firestore, 'users', userData.uid);
//     await setDoc(userRef, {
//         ...userData,
//         createdAt: serverTimestamp(),
//         updatedAt: serverTimestamp(),
//     });
// };


// Fetch user by email
export const getUserByEmail = async (email: string) => {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("email", "==", email));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        Alert.alert("User with this email not found")
        throw new Error("User with this email not found");
    }

    const userDoc = querySnapshot.docs[0]; // expect only one result.
    return {uid: userDoc.id, ...userDoc.data()}; // Return the user's data
};

export const getUserById = async (uid: string) => {
    const userRef = doc(firestore, "users", uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists) {
        Alert.alert("User with this ID not found");
        throw new Error("User with this ID not found");
    }

    return { uid: userDoc.id, ...userDoc.data() } as User;
};

export const addCollaboratorByEmail = async (tripId: string, email: string): Promise<void> => {
    const tripRef = doc(firestore, "trips", tripId);
    const userData = await getUserByEmail(email);
    await updateDoc(tripRef, {
        collaborators: arrayUnion(userData.uid), // update Trip's collaborators list
    });

    const userRef = doc(firestore, "users", userData.uid);
    await updateDoc(userRef, {
        tripsIdList: arrayUnion(tripId), // update User's tripsIdList
    });
}

// Update user details in Firestore
export const updateUser = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
    });
};

// Get current user data from Firestore
export const getCurrentUser = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    const userRef = doc(collection(firestore, "users"), user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists) {
        return {uid: userSnap.id, ...userSnap.data()} as User;
    }
    return null;
};


// Set the currentTripId for a user
export const setCurrentTripId = async (userId: string, tripId: string | null): Promise<void> => {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
        currentTripId: tripId,
        updatedAt: serverTimestamp(),
    });
};

export const addTripToUser = async (userId: string, TripsIdList: string): Promise<void> => {
    // const user = auth.currentUser;
    // if (!user) throw new Error("No authenticated user found");

    const userRef = doc(collection(firestore, "users"), userId);
    await updateDoc(userRef, {
        tripsIdList: arrayUnion(TripsIdList), // Adds tripId to the array
        updatedAt: serverTimestamp(),
    });
};

export const removeTripFromAllUsers = async (tripId: string): Promise<void> => {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("tripsIdList", "array-contains", tripId));
    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map(userDoc => {
        return updateDoc(doc(firestore, "users", userDoc.id), {
            tripsIdList: arrayRemove(tripId),
            updatedAt: serverTimestamp(),
        });
    });
    await Promise.all(updatePromises);
};
