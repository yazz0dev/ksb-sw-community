// src/utils/formatters.ts

export type RoleKey = string;
export type FormattedRoleName = string;

// Helper to format role keys/names for display
export const formatRoleName = (roleKeyOrName: RoleKey): FormattedRoleName => {
    if (!roleKeyOrName) return '';
    
    const name: string = roleKeyOrName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
    
    // Special cases for display
    switch (name) {
        case 'Xp By Role':
            return 'Overall';
        case 'Problem Solver':
            return 'Problem Solver';
        case 'Org Role':
            return 'Organizer';
        case 'Part Role':
            return 'Participant';
        default:
            return name;
    }
};

// Add other shared formatting functions here in the future