// src/utils/formatters.js

// Helper to format role keys/names for display
export const formatRoleName = (roleKeyOrName) => {
    if (!roleKeyOrName) return '';
    // Handle potential keys or display names
    const name = roleKeyOrName
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
    // Special cases for display
    if (name === 'Xp By Role') return 'Overall'; // This might need adjustment based on actual keys
    if (name === 'Problem Solver') return 'Problem Solver'; // Ensure exact match for display
    if (name === 'Org Role') return 'Organizer';
    if (name === 'Part Role') return 'Participant';
    return name;
};

// Add other shared formatting functions here in the future 