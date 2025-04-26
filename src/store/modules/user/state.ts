import { User } from '@/types/user'; // Import User type

interface UserState {
  studentList: any[];
  studentListLastFetch: number | null;
  studentListTTL: number;
  studentListLoading: boolean;
  studentListError: null | Error;
  nameCache: Map<string, { name: string; timestamp: number }>;
  nameCacheTTL: number;
  currentUser: User | null; // Add currentUser property
  uid: string | null; // Add uid property
  hasFetched: boolean; // Add hasFetched property
}

export default {
  studentList: [],
  studentListLastFetch: null, // Timestamp of last fetch
  studentListTTL: 1000 * 60 * 60, // 1 hour TTL
  studentListLoading: false,
  studentListError: null,
  nameCache: new Map(), // Cache for user names
  nameCacheTTL: 1000 * 60 * 30, // 30 minute TTL for names
  currentUser: null, // Initialize currentUser
  uid: null, // Initialize uid
  hasFetched: false, // Initialize hasFetched
} as UserState;