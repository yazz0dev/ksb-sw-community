import { Timestamp } from 'firebase/firestore';

/**
 * Maps event data to the format expected by Firestore
 * @param {Object} eventData - The event data to be mapped
 * @returns {Object} - Mapped event data ready for Firestore
 */
export const mapEventDataToFirestore = (eventData) => {
  const mappedData = {
    ...eventData,
    createdAt: Timestamp.now(),
    status: eventData.status || 'Pending',
    ratingsOpen: false,
    ratings: [],
    submissions: [],
  };

  // Convert date strings to Firestore Timestamps if they exist
  if (eventData.startDate) {
    mappedData.startDate = eventData.startDate instanceof Date 
      ? Timestamp.fromDate(eventData.startDate)
      : Timestamp.fromDate(new Date(eventData.startDate));
  }

  if (eventData.endDate) {
    mappedData.endDate = eventData.endDate instanceof Date
      ? Timestamp.fromDate(eventData.endDate)
      : Timestamp.fromDate(new Date(eventData.endDate));
  }

  // Ensure arrays exist
  mappedData.participants = Array.isArray(eventData.participants) ? eventData.participants : [];
  mappedData.coOrganizers = Array.isArray(eventData.coOrganizers) ? eventData.coOrganizers : [];
  mappedData.ratingCriteria = Array.isArray(eventData.ratingCriteria) ? eventData.ratingCriteria : [];
  // Ensure xpAllocation is a number, default to 0 if not provided or invalid
  mappedData.xpAllocation = typeof eventData.xpAllocation === 'number' ? eventData.xpAllocation : 0;

  // Initialize teams array if it's a team event
  if (eventData.isTeamEvent) {
    mappedData.teams = Array.isArray(eventData.teams) ? eventData.teams.map(team => ({
      teamName: team.teamName || 'Unnamed Team',
      members: Array.isArray(team.members) ? team.members : [],
      submissions: [],
      ratings: []
    })) : [];
  }

  return mappedData;
};
