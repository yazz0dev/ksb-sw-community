export interface User {
  uid: string;
  name: string;
  email: string;
  role?: string;
  xpByRole?: Record<string, number>;
}

export interface UserState {
  uid: string | null;
  name: string | null;
  role: string | null;
  xpByRole: Record<string, number>;
  skills: string[]; // Added skills
  preferredRoles: string[]; // Added preferredRoles
  isAuthenticated: boolean; // Added isAuthenticated
  hasFetched: boolean; // Added hasFetched
  studentList: User[];
  allUsers: User[];
  userNameCache: Record<string, string>; // Added userNameCache (using Record for simplicity)
  lastXpCalculationTimestamp: number | null; // Added lastXpCalculationTimestamp
  loading: boolean; // Added loading
  error: string | null; // Added error
}