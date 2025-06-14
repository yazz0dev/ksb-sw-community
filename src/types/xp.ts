// src/types/xp.ts
import { Timestamp } from 'firebase/firestore';

// Collection path for XP data in Firestore
// export const XP_COLLECTION_PATH = 'xp';

// --- XP Calculation Role Keys ---
// These are internal keys used for logic before mapping to Firestore fields.
// They should correspond to roles/activities that grant XP.
export const xpCalculationRoleKeys = [
    'developer',       // For coding, technical implementation
    'presenter',       // For presenting projects, leading sessions
    'designer',        // For UI/UX design contributions
    'problemSolver',   // For critical thinking, algorithmic solutions
    'organizer',       // For organizing/co-organizing events
    'participation',   // Base XP for participating/submitting
    'bestPerformer',   // Bonus for being voted best individual performer in team events
    // Add more specific roles as your XP system evolves
] as const;

export type XpCalculationRoleKey = typeof xpCalculationRoleKeys[number];

// --- Firestore Field Names for XP (prefixed) ---
// These are the actual field names in the Firestore 'xp/{studentUid}' documents.
export const xpFirestoreFieldKeys = [
    'xp_developer',
    'xp_presenter',
    'xp_designer',
    'xp_problemSolver',
    'xp_organizer',
    'xp_participation',
    'xp_bestPerformer',
] as const;

export type XpFirestoreFieldKey = typeof xpFirestoreFieldKeys[number];


// --- XP Point History Item ---
// Structure for an entry in the point history array.
export interface XPPointHistoryItem {
  eventId: string;
  eventName: string;
  role: XpCalculationRoleKey;
  points: number;
  awardedAt: Timestamp;
  phaseId?: string; // Optional: ID of the phase if XP awarded for a specific phase
  phaseName?: string; // Optional: Name of the phase for display purposes
}


// --- XPData Interface (Firestore: xp/{studentId}) ---
// Structure of the document storing a student's XP.
export interface XPData {
    uid: string;                      // Matches the document ID and student's UID.

    // XP breakdown by role/category
    xp_developer: number;
    xp_presenter: number;
    xp_designer: number;
    xp_problemSolver: number;
    xp_organizer: number;
    xp_participation: number;
    xp_bestPerformer: number;
    // Add new xp_ fields here if more roles are introduced

    count_wins: number;               // How many distinct criteria/event-level awards the student has won.
                                      // Incremented when a student is part of a winning team/individual for a criterion.
    totalCalculatedXp: number;        // Server-calculated sum of all `xp_*` prefixed fields.
                                      // This is the primary value for leaderboard ranking.
    pointHistory: XPPointHistoryItem[]; // Array of all XP awards received.
    lastUpdatedAt: Timestamp;         // When this XP document was last modified.
}

/**
 * Provides default XP data for a new student or when an XP document is missing.
 * @param studentId The UID of the student.
 * @returns A default XPData object.
 */
export function getDefaultXPData(studentId: string): XPData {
    const defaultData: XPData = {
        uid: studentId,
        xp_developer: 0,
        xp_presenter: 0,
        xp_designer: 0,
        xp_problemSolver: 0,
        xp_organizer: 0,
        xp_participation: 0,
        xp_bestPerformer: 0,
        count_wins: 0,
        totalCalculatedXp: 0,
        pointHistory: [],
        lastUpdatedAt: Timestamp.now(),
    };
    return defaultData;
}

/**
 * Maps an internal XpCalculationRoleKey to its corresponding Firestore field key.
 * @param calcRole The internal calculation role key.
 * @returns The prefixed Firestore field key.
 */
export function mapCalcRoleToFirestoreKey(calcRole: XpCalculationRoleKey): XpFirestoreFieldKey {
    return `xp_${calcRole}` as XpFirestoreFieldKey;
}

/**
 * Formats a role key for display by removing the 'xp_' prefix and capitalizing the first letter.
 * @param roleKey The role key to format, e.g. 'xp_developer' or 'developer'
 * @returns The formatted role name, e.g. 'Developer'
 */
export function formatRoleName(roleKey: string): string {
    // Remove 'xp_' prefix if present
    const baseName = roleKey.startsWith('xp_') ? roleKey.substring(3) : roleKey;
    
    // Capitalize the first letter
    return baseName.charAt(0).toUpperCase() + baseName.slice(1);
}

/**
 * Formats role keys (either `XpCalculationRoleKey` or `XpFirestoreFieldKey`) for display in the UI.
 * Provides more detailed formatting than the basic formatRoleName function.
 * @param roleKey The role key string (e.g., "developer", "xp_problemSolver", "totalCalculatedXp").
 * @returns A user-friendly display name (e.g., "Developer", "Problem Solver XP", "Total XP").
 */
export function formatRoleNameForDisplay(roleKey: string | null | undefined): string {
    if (!roleKey) return 'Unknown Category';

    const key = String(roleKey).trim();

    // Specific overrides for special keys
    if (key === 'totalCalculatedXp') return 'Total XP';
    if (key === 'count_wins') return 'Event Wins';

    // Remove "xp_" prefix for display formatting
    const cleanKey = key.startsWith('xp_') ? key.substring(3) : key;

    // Convert camelCase or snake_case to Title Case with spaces
    const formattedName = cleanKey
        .replace(/([A-Z])/g, ' $1')    // Add space before uppercase letters
        .replace(/[_-]/g, ' ')         // Replace underscores/hyphens with spaces
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .replace(/\s+/g, ' ')          // Normalize multiple spaces
        .trim();

    // Append "XP" if it was an XP field and not "Participation" or "Best Performer" which are already descriptive
    if (key.startsWith('xp_') && !['Participation', 'Best Performer', 'Organizer'].includes(formattedName)) {
        return `${formattedName} XP`;
    }

    return formattedName || "Misc. Points"; // Fallback for empty string after processing
}

/**
 * Defines the order in which XP roles/categories should be displayed in UIs (e.g., profile breakdown).
 * Uses XpFirestoreFieldKey for direct mapping to XPData fields.
 * @returns An array of XpFirestoreFieldKey in the desired display order.
 */
export function getXpRoleDisplayOrder(): XpFirestoreFieldKey[] {
    return [
        'xp_developer',
        'xp_designer',
        'xp_presenter',
        'xp_problemSolver',
        'xp_organizer',
        'xp_participation',
        'xp_bestPerformer',
    ];
}