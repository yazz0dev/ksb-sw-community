import { db } from '@/firebase';
import {
    enableNetwork as enableFirestoreNetworkFn,
    disableNetwork as disableFirestoreNetworkFn
} from "firebase/firestore";

/**
 * Enable Firestore network access
 * @returns Promise that resolves when network is enabled
 */
export const enableFirestoreNetwork = async (): Promise<void> => {
  try {
    await enableFirestoreNetworkFn(db);
    console.log("Firestore network access enabled.");
  } catch (error) {
    console.error("Error enabling Firestore network:", error);
    throw error;
  }
};

/**
 * Disable Firestore network access
 * @returns Promise that resolves when network is disabled
 */
export const disableFirestoreNetwork = async (): Promise<void> => {
  try {
    await disableFirestoreNetworkFn(db);
    console.log("Firestore network access disabled.");
  } catch (error) {
    console.error("Error disabling Firestore network:", error);
    throw error;
  }
}; 