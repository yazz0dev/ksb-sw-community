// src/appwrite.ts
import { Client, Account, Functions } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || '') // Provide default empty string
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || ''); // Provide default empty string

export const account = new Account(client);
export const functions = new Functions(client);
export default client;

// Helper function to check if Appwrite config is valid
export const isAppwriteConfigured = (): boolean => {
    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
    const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
    return !!endpoint && !!projectId;
};