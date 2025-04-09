export interface User {
    uid: string;
    name?: string;
    email?: string;
    role?: 'Admin' | 'User' | string;
    profilePicture?: string;
    xp?: number;
    level?: number;
    badges?: string[];
}

export interface UserProfile extends User {
    joinDate?: Date;
    eventsParticipated?: number;
    eventsOrganized?: number;
    bio?: string;
    skills?: string[];
    achievements?: Achievement[];
    lastActive?: Date;
}

interface Achievement {
    id: string;
    name: string;
    description: string;
    dateEarned: Date;
    type: string;
}