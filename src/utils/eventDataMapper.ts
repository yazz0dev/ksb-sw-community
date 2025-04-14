// src/utils/eventDataMapper.ts
import { getISTTimestamp } from '@/utils/dateTime';
import { EventFormat, EventData, Team } from '@/types/event';

interface MappedEventData extends EventData {
  teams?: Team[];
  participants?: string[];
  eventFormat: EventFormat;
}

export const mapEventDataToFirestore = (eventData: Partial<EventData>): MappedEventData => {
  const mappedData: MappedEventData = { ...eventData } as MappedEventData;

  // Convert dates to IST timestamps
  ['startDate', 'endDate', 'desiredStartDate', 'desiredEndDate'].forEach(field => {
    if (mappedData[field]) {
      mappedData[field] = getISTTimestamp(mappedData[field]);
    }
  });

  // Format conversion
  mappedData.eventFormat = eventData.eventFormat || EventFormat.Individual;
  if (mappedData.eventFormat === EventFormat.Team) {
    mappedData.teams = Array.isArray(eventData.teams) ? eventData.teams.map(t => ({
      teamName: t.teamName || 'Unnamed Team',
      members: Array.isArray(t.members) ? t.members : [],
      submissions: [],
      ratings: []
    })) : [];
    mappedData.participants = [];
  } else {
    delete mappedData.teams;
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
