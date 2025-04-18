// src/appwrite.ts
import { Client, Account, Functions } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || '';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

if (!endpoint || !projectId) {
    console.warn("Appwrite endpoint or project ID is missing in environment variables. Appwrite features will be disabled.");
} else {
    client
        .setEndpoint(endpoint)
        .setProject(projectId);
}


export const account = new Account(client);
export const functions = new Functions(client); // Export functions instance
export default client;

// Helper function to check if Appwrite config is valid
export const isAppwriteConfigured = (): boolean => {
    return !!endpoint && !!projectId;
};