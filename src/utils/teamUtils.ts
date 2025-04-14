import { Team, TeamMember } from '@/types/team';

export interface TeamUtils {
  validateTeam(team: Team): boolean;
  getTeamMembers(team: Team): TeamMember[];
  // Add more team utility functions as needed
}

export const validateTeam = (team: Team): boolean => {
  return team.members?.length > 0 && !!team.teamName;
};

export const getTeamMembers = (team: Team): TeamMember[] => {
  return team.members || [];
};
