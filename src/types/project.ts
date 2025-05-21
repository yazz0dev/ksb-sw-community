// src/types/project.ts
import type { Timestamp } from 'firebase/firestore';

export interface Project {
  id: string;                 // Can be derived (e.g., eventId + submissionIndex) or a unique ID if projects are stored separately.
  eventId?: string;            // ID of the event this project belongs to
  eventName?: string;          // Name of the event
  projectName: string;
  description?: string;
  link: string;               // URL to the project (GitHub, Demo, Figma)
  submittedBy: string;        // Student UID of the main submitter
  teamName?: string;           // If a team project
  teamMembers?: string[];      // Student UIDs of team members (if applicable, could be fetched/denormalized)
  submittedAt: Timestamp | Date | string; // Use Timestamp from Firestore, Date/string in forms/display
  thumbnailUrl?: string;       // Optional thumbnail for display
  tags?: string[];             // Optional tags/keywords
}