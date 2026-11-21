import { isFirebaseEnabled } from "../firebase";
import { firebaseAuth, firestoreData } from "./firestore";
import { localAuth, localData } from "./local";

export const data = isFirebaseEnabled ? firestoreData : localData;
export const auth = isFirebaseEnabled ? firebaseAuth : localAuth;
