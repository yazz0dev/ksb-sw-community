export interface Team {
  teamName: string;
  members: TeamMember[];
  submissions: Submission[];
  ratings: Rating[];
}

export interface TeamMember {
  uid: string;
  name: string;
  role?: string;
}

export interface Submission {
  id: string;
  content: string;
  timestamp: Date;
  submittedBy: string;
}

export interface Rating {
  raterId: string;
  scores: Record<string, number>;
  timestamp: Date;
  comment?: string;
}
