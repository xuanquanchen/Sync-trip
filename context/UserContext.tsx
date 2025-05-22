import React, {createContext, ReactNode, useContext, useEffect, useState} from "react";

import {User} from "../types/User";
import {auth, firestore} from "../utils/firebase";
import {doc, onSnapshot} from "@react-native-firebase/firestore";



interface UserContextType {
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;

    getCurrentUserId: () => string;
    logout: () => void;

    uidToNameMap: { [uid: string]: string };
    setUidToNameMap: React.Dispatch<React.SetStateAction<{ [uid: string]: string }>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({children}: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    // const { setCurrentTrip} = useTrip();
    const [uidToNameMap, setUidToNameMap] = useState<{ [uid: string]: string }>({});


    useEffect(() => {
        // 1) Listen for login / logout
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (!user) {
                // no one’s signed in
                setCurrentUser(null);
                return;
            }

            // 2) When someone logs in, subscribe to their Firestore doc
            const userRef = doc(firestore, "users", user.uid);
            const unsubscribeSnap = onSnapshot(userRef, docSnap => {
                if (docSnap.exists) {
                    setCurrentUser({ uid: docSnap.id, ...docSnap.data() } as User);
                } else {
                    setCurrentUser(null);
                }
            });

            // Clean up the Firestore listener when they sign out or provider unmounts
            return () => unsubscribeSnap();
        });

        // Clean up the auth listener on unmount
        return () => unsubscribeAuth();
    }, []);

    const getCurrentUserId = (): string => {
        if (!currentUser) {
            throw new Error("Current user does not exist");
        }
        return currentUser.uid;
    }

    // Logout function to clear user data
    const logout = () => {
        setCurrentUser(null); // Clear currentUser in the context
        // Additional cleanup logic, e.g., clearing localStorage, Firebase auth sign-out
        console.log('User logged out');
    };

    const value: UserContextType = {
        currentUser,
        setCurrentUser,

        getCurrentUserId,
        logout,

        uidToNameMap,
        setUidToNameMap,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
