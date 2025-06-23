// src/types/xp.ts
import { Timestamp } from 'firebase/firestore';
import { formatRoleName as formatRoleNameForDisplay } from '@/utils/formatters'; // Corrected import path

// --- XP Calculation Role Keys ---
export const xpCalculationRoleKeys = [
    'developer',
    'presenter',
    'designer',
    'problemSolver',
    'organizer',
    'participation',
    'bestPerformer',
] as const;

export type XpCalculationRoleKey = typeof xpCalculationRoleKeys[number];

// --- Firestore Field Names for XP (prefixed) ---
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
export interface XPPointHistoryItem {
  eventId: string;
  eventName: string;
  role: XpCalculationRoleKey;
  points: number;
  awardedAt: Timestamp;
  phaseId?: string;
  phaseName?: string;
}

// --- XPData Interface (Firestore: xp/{studentId}) ---
export interface XPData {
    uid: string;
    xp_developer: number;
    xp_presenter: number;
    xp_designer: number;
    xp_problemSolver: number;
    xp_organizer: number;
    xp_participation: number;
    xp_bestPerformer: number;
    count_wins: number;
    totalCalculatedXp: number;
    pointHistory: XPPointHistoryItem[];
    lastUpdatedAt: Timestamp;
}

// --- Utility Functions for XP Types ---

export function getDefaultXPData(studentId: string): XPData {
    return {
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
}

export function mapCalcRoleToFirestoreKey(calcRole: XpCalculationRoleKey): XpFirestoreFieldKey {
    return `xp_${calcRole}` as XpFirestoreFieldKey;
}

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

// Re-export the centralized formatter for convenience where this type module is used
export { formatRoleNameForDisplay };