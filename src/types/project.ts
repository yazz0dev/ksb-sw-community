// Basic Project type definition
export interface Project {
    id: string;
    projectName: string;  // Required field
    eventName: string;
    eventType?: string;
    description?: string;
    link: string;        // Required for portfolio
    submittedAt?: any;   // Consider using firebase.firestore.Timestamp
}
