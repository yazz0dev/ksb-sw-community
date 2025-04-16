// Basic Project type definition
export interface Project {
    id: string;
    eventName: string; // Or projectId, projectName etc.
    // Add other relevant project properties based on your data structure
    description?: string;
    link?: string;
    submittedAt?: any; // Use appropriate type like Date or Timestamp
    // ... other fields
}
