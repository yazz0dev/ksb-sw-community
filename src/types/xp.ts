// src/types/xp.ts
import { Timestamp } from 'firebase/firestore';

// Keys for XP fields in XPData, corresponding to roles/categories
// These are the internal keys used for calculation before mapping to Firestore fields
export const xpCalculationRoleKeys = [
    'developer',
    'presenter',
    'designer',
    'problemSolver',
    'organizer',
    'participation',
    'bestPerformer', // Represents XP specifically from being a best performer
] as const;

export type XpCalculationRoleKey = typeof xpCalculationRoleKeys[number];

// Firestore field names for XP (prefixed)
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

export interface XPData {
    uid: string; // Matches the document ID and user's UID
    xp_developer: number;
    xp_presenter: number;
    xp_designer: number;
    xp_problemSolver: number;
    xp_organizer: number;
    xp_participation: number;
    xp_bestPerformer: number;
    count_wins: number; // Separate count for wins
    totalCalculatedXp: number; // Sum of all xp_ prefixed fields
    lastUpdatedAt: Timestamp;
}

export function getDefaultXPData(userId: string): XPData {
    return {
        uid: userId,
        xp_developer: 0,
        xp_presenter: 0,
        xp_designer: 0,
        xp_problemSolver: 0,
        xp_organizer: 0,
        xp_participation: 0,
        xp_bestPerformer: 0,
        count_wins: 0,
        totalCalculatedXp: 0,
        lastUpdatedAt: Timestamp.now(), // Initialize with current time
    };
}

// Helper to map calculation role key to Firestore field key
export function mapCalcRoleToFirestoreKey(calcRole: XpCalculationRoleKey): XpFirestoreFieldKey {
    return `xp_${calcRole}` as XpFirestoreFieldKey;
}