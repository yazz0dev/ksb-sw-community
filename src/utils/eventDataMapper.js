// src/utils/eventDataMapper.js
import { Timestamp } from 'firebase/firestore';

export const mapEventDataToFirestore = (eventData) => {
  const mappedData = {
    ...eventData,
    createdAt: eventData.createdAt instanceof Timestamp ? eventData.createdAt : Timestamp.now(),
    status: eventData.status || 'Pending',
    ratingsOpen: eventData.ratingsOpen === true || eventData.ratingsOpen === false ? eventData.ratingsOpen : false,
    ratings: Array.isArray(eventData.ratings) ? eventData.ratings : [],
    submissions: Array.isArray(eventData.submissions) ? eventData.submissions : [],
    winnersPerRole: typeof eventData.winnersPerRole === 'object' && eventData.winnersPerRole !== null ? eventData.winnersPerRole : {},
  };

  // Date Conversion
  const dateFieldsToConvert = ['startDate', 'endDate', 'desiredStartDate', 'desiredEndDate'];
  dateFieldsToConvert.forEach(field => {
    if (eventData[field]) {
      try {
        // Check if it's already a Timestamp
        if (eventData[field] instanceof Timestamp) {
          mappedData[field] = eventData[field];
        } else {
          // Attempt to convert from Date object or string/number
          const dateObj = new Date(eventData[field]);
          if (!isNaN(dateObj.getTime())) {
            mappedData[field] = Timestamp.fromDate(dateObj);
          } else {
            console.warn(`mapEventDataToFirestore: Invalid date value for field ${field}:`, eventData[field]);
            mappedData[field] = null; // Set to null if conversion fails
          }
        }
      } catch (e) {
        console.error(`mapEventDataToFirestore: Error converting date field ${field}:`, e);
        mappedData[field] = null; // Set to null on error
      }
    } else {
      // Ensure field exists and is null if not provided or falsey
      mappedData[field] = null;
    }
  });

  // Array Initializations / Type Checks
  mappedData.participants = Array.isArray(eventData.participants) ? eventData.participants : [];
  mappedData.organizers = Array.isArray(eventData.organizers) ? eventData.organizers : [];
  // --- MODIFIED: Use only xpAllocation ---
  mappedData.xpAllocation = Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [];
  // REMOVED: ratingCriteria mapping is no longer needed


  // Team Initialization
  if (eventData.isTeamEvent) {
    mappedData.teams = Array.isArray(eventData.teams) ? eventData.teams.map(t => ({
        teamName: t.teamName || 'Unnamed Team',
        members: Array.isArray(t.members) ? t.members : [],
        // Ensure submissions/ratings arrays exist, even if empty
        submissions: Array.isArray(t.submissions) ? t.submissions : [],
        ratings: Array.isArray(t.ratings) ? t.ratings : []
    })) : [];
    // Ensure participants is empty for team events
    mappedData.participants = [];
  } else {
    // Ensure teams field is removed for individual events
    delete mappedData.teams;
    // Ensure participants is an array for individual events (might be populated later)
    mappedData.participants = Array.isArray(eventData.participants) ? eventData.participants : [];
  }

  // Clean up any potential undefined values before returning
  Object.keys(mappedData).forEach(key => {
    if (mappedData[key] === undefined) {
      delete mappedData[key]; // Firestore doesn't like undefined
    }
  });

  return mappedData;
};
