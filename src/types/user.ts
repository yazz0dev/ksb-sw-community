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
  email: string | null;
  role: string | null;
  xpByRole: Record<string, number>;
  studentList: User[];
  allUsers: User[];
  loading: boolean;
  error: string | null;
}