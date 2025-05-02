import { UserState } from '@/types/user'; // Import User and UserState type

// Define the default XP structure
const defaultXpStructure: Record<string, number> = {
    developer: 0,
    presenter: 0,
    designer: 0,
    organizer: 0,
    problemSolver: 0,
    participation: 0
};


// Define the initial state matching the UserState interface
const state: UserState = {
  // Core User Data Defaults
  currentUser: null, // Initialize currentUser
  uid: null, // Initialize uid
  name: null,
  isAuthenticated: false,
  hasFetched: false, // Initialize hasFetched

  // Student Specific Defaults
  xpByRole: { ...defaultXpStructure }, // Initialize with default structure
  skills: [],
  preferredRoles: [],

  // Student List Defaults
  studentList: [], // Matches User[]
  studentListLastFetch: null,
  studentListTTL: 1000 * 60 * 60, // 1 hour
  studentListLoading: false,
  studentListError: null, // Matches Error | null

  // General User List Default
  allUsers: [], // Matches User[]

  // Name Caching Defaults
  nameCache: new Map(), // Matches Map<string, { name: string; timestamp: number }>
  nameCacheTTL: 1000 * 60 * 30, // 30 minutes

  // XP Calculation Timestamp Default
  lastXpCalculationTimestamp: null,

  // General Loading/Error Defaults
  loading: false,
  error: null, // Matches Error | null

  // Profile Data
  profileData: null,

  // User Requests
  userRequests: [],

  // Leaderboard Users
  leaderboardUsers: [],
};

export default state; // Export the typed state object