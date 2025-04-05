<template>
    <div class="manage-teams-component space-y-6">
        <div v-if="teams.length === 0" class="bg-info-extraLight border border-info-light text-info-text px-4 py-3 rounded-md text-sm shadow-sm italic">
            <i class="fas fa-info-circle mr-1"></i> No teams defined yet. Click "Add Another Team" to begin.
        </div>
        <div class="manage-teams-component space-y-4">
            <h4 class="text-xl font-semibold text-text-primary">Define Teams</h4>
            <p class="text-sm text-text-secondary">Define at least two teams for this event. Add members to each team.</p>

            <div v-if="teams.length === 0" class="bg-warning-extraLight border border-warning-light text-warning-text px-4 py-2 rounded-md text-sm">
                No teams defined yet. Click "Add Another Team".
            </div>

            <div v-for="(team, index) in teams" :key="index" class="bg-surface border border-border rounded-lg shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
                <div class="p-4 sm:p-5 space-y-4">
                    <div>
                        <label :for="'teamName-' + index" class="block text-sm font-medium text-text-secondary mb-1">Team {{ index + 1 }} Name <span class="text-danger">*</span></label>
                        <input type="text" :id="'teamName-' + index"
                               v-model.trim="team.teamName"
                               class="block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors bg-surface text-text-primary"
                               placeholder="Enter team name (e.g., Team Alpha)"
                               :disabled="isSubmitting"
                               @input="emitUpdate">
                        <p v-if="duplicateTeamNames.has(team.teamName)" class="mt-1 text-xs text-danger">Team name must be unique.</p>
                    </div>

                    <div>
                        <label :for="'memberSearch-' + index" class="block text-sm font-medium text-text-secondary mb-1">Team Members ({{ team.members.length }}) <span class="text-danger">*</span></label>
                        <div class="relative">
                            <input type="text" :id="'memberSearch-' + index"
                                   v-model="searchQueries[index]"
                                   class="block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors bg-surface text-text-primary"
                                   placeholder="Search available students to add..."
                                   @focus="showDropdown(index)"
                                   @blur="hideDropdown(index)"
                                   :disabled="isSubmitting"
                                   autocomplete="off">
                            <transition name="fade-fast">
                                <div v-if="dropdownVisible[index]"
                                     class="absolute z-50 mt-1 w-full bg-surface shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-border">
                                    <button v-for="student in filteredStudents(index)"
                                            :key="student.uid"
                                            class="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-primary-light hover:text-white transition-colors"
                                            type="button"
                                            @mousedown.prevent="addMember(index, student)">
                                        {{ props.nameCache[student.uid] || student.uid }}
                                    </button>
                                    <div v-if="!filteredStudents(index).length"
                                         class="px-4 py-2 text-sm text-text-secondary italic">
                                        {{ searchQueries[index] ? 'No matching students found.' : 'No more students available.' }}
                                    </div>
                                </div>
                            </transition>
                        </div>

                        <div v-if="team.members.length > 0" class="mt-3 flex flex-wrap gap-2">
                            <span v-for="memberId in team.members" :key="memberId"
                                  class="inline-flex items-center py-1 pl-2.5 pr-1 rounded-full text-xs font-medium bg-gray-200 text-text-primary border border-gray-300 shadow-sm">
                                {{ props.nameCache[memberId] || memberId }}
                                <button type="button"
                                        class="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-400 hover:bg-danger-extraLight hover:text-danger focus:outline-none focus:ring-1 focus:ring-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        @click="removeMember(index, memberId)" :disabled="isSubmitting"
                                        :aria-label="`Remove ${props.nameCache[memberId] || memberId}`">
                                    <svg class="h-2.5 w-2.5" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                                        <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                                    </svg>
                                </button>
                            </span>
                        </div>
                        <p v-if="showValidationErrors && team.members.length === 0" class="mt-1 text-xs text-danger">Each team must have at least one member.</p>
                    </div>

                    <div class="pt-3 border-t border-border text-right">
                        <button type="button"
                                class="inline-flex justify-center items-center px-3 py-1.5 border border-danger-light shadow-sm text-xs font-medium rounded-md text-danger bg-surface hover:bg-danger-extraLight focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                @click="removeTeam(index)"
                                :disabled="isSubmitting || teams.length <= minTeams">
                            <i class="fas fa-trash-alt mr-1.5 h-3 w-3"></i> Remove Team
                        </button>
                    </div>
                </div>
            </div>

            <div class="mt-6 text-center">
                <button type="button"
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        @click="addTeam" :disabled="isSubmitting || !canAddMoreTeams">
                    <i class="fas fa-plus mr-1.5 h-4 w-4"></i> Add Another Team
                </button>
                <p v-if="!canAddMoreTeams" class="text-text-secondary text-xs mt-1 italic">
                    Maximum number of teams reached or no more students available.
                </p>
            </div>

            <p v-if="showValidationErrors && !overallValidation.isValid" class="mt-4 text-sm text-danger text-center">
                <i class="fas fa-exclamation-triangle mr-1"></i> {{ overallValidation.message }}
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { EventTeam } from '../types/event';

interface Props {
    initialTeams: EventTeam[];
    students: { uid: string }[];
    nameCache: Record<string, string>;
    isSubmitting: boolean;
    canAutoGenerate: boolean;
}

// --- Auto-Generation State ---
const autoGenType = ref<'numberOfTeams' | 'maxMembers'>('numberOfTeams');
const autoGenValue = ref<number>(2);
const autoGenErrorMessage = ref<string>('');

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:teams': [teams: EventTeam[]];
    'can-add-team': [canAdd: boolean];
    'auto-generate': [config: { generationType: string; value: number }];
}>();

// --- Local State ---
// Directly use localTeams as the primary reactive source for the template
const localTeams = ref<EventTeam[]>([]);

// Added: States for search and dropdown visibility, reactive for each team
const searchQueries = reactive<Record<number, string>>({});
const dropdownVisible = reactive<Record<number, boolean>>({});

// Current team being edited
const currentTeam = reactive<EventTeam>({ teamName: '', members: [], ratings: [], submissions: [] });
const editingTeamName = ref<string | null>(null);
const studentSearch = ref<string>('');
const addTeamErrorMessage = ref<string>('');
const showNewTeamForm = ref<boolean>(false);
const showValidationErrors = ref<boolean>(false);
const minTeams = ref<number>(2);

// Validation state
const overallValidation = computed(() => {
    const validTeams = localTeams.value.filter(team => 
        team.teamName.trim() !== '' && team.members.length > 0
    );
    
    if (validTeams.length < minTeams.value) {
        return {
            isValid: false,
            message: `At least ${minTeams.value} valid teams are required.`
        };
    }
    
    return { isValid: true, message: '' };
});

// Check if we can add more teams
const canAddMoreTeams = computed(() => {
    const maxTeams = 10; // Maximum number of teams allowed
    return localTeams.value.length < maxTeams;
});

// --- Initialization ---
// Helper to initialize or reset local teams
function initializeTeams(initialData: EventTeam[]) {
    localTeams.value = JSON.parse(JSON.stringify(initialData || []));
    // Ensure searchQueries and dropdownVisible have entries for each team
    // Clear existing keys first to handle cases where teams are removed
    Object.keys(searchQueries).forEach(key => delete searchQueries[key]);
    Object.keys(dropdownVisible).forEach(key => delete dropdownVisible[key]);

    localTeams.value.forEach((_, index) => {
        searchQueries[index] = ''; // Initialize search for the team
        dropdownVisible[index] = false; // Initialize dropdown state
    });
     // Add default team if none exist initially AND if the component isn't just displaying existing teams (e.g., in an edit mode where initialTeams might be empty)
     // Let's refine this: Only add if initialData itself was effectively empty/null.
    if (!initialData || initialData.length === 0) {
       if (localTeams.value.length === 0) { // Double check after potential stringify issues
         addTeam(); // Start with one empty team if truly empty
       }
    }
}

// Initialize immediately on setup
initializeTeams(props.initialTeams);

// --- Watchers ---
watch(() => props.initialTeams, (newVal) => {
    // Re-initialize when the prop changes
    initializeTeams(newVal);
}, { deep: true });

// --- Computed Properties ---

// Replaces direct use of `teams` in template
const teams = computed(() => localTeams.value);

// Detect duplicate team names
const duplicateTeamNames = computed(() => {
    const names = new Set();
    const duplicates = new Set();
    
    localTeams.value.forEach(team => {
        const name = team.teamName.trim().toLowerCase();
        if (name && names.has(name)) {
            duplicates.add(team.teamName);
        } else if (name) {
            names.add(name);
        }
    });
    
    return duplicates;
});

// All student IDs currently assigned to any team
const assignedStudentIds = computed<Set<string>>(() => {
    return new Set(localTeams.value.flatMap(team => team.members || []));
});

// Filtered list of students available to be added to the *current* team being edited/created
const filteredAvailableStudents = computed<{ uid: string }[]>(() => {
    if (!Array.isArray(props.students)) return [];

    // Students not already in the *current* team's member list
    let available = props.students.filter(student => !currentTeam.members.includes(student.uid));

    // Further filter by search term if present
    if (studentSearch.value) {
        const search = studentSearch.value.toLowerCase();
        available = available.filter(student => {
            const name = props.nameCache[student.uid] || '';
            return name.toLowerCase().includes(search) ||
                   student.uid.toLowerCase().includes(search);
        });
    }

    // Sort alphabetically
    return available.sort((a, b) => {
        const nameA = props.nameCache[a.uid] || '';
        const nameB = props.nameCache[b.uid] || '';
        return nameA.localeCompare(nameB);
    });
});

// Sorted list of teams for display purposes
const sortedTeams = computed<EventTeam[]>(() => {
     // Filter out any potential invalid/empty placeholder teams before sorting
     const validTeams = localTeams.value.filter(team => team && team.teamName);
     return [...validTeams].sort((a, b) =>
        (a?.teamName || '').localeCompare(b?.teamName || '')
    );
});

// Validation: Check if the current state represents valid teams (e.g., >= 2 teams, each with name and members)
// Note: This might be better handled in the parent component before final submission
const hasValidTeamsConfiguration = computed<boolean>(() => {
    const validTeams = localTeams.value.filter(team => team.teamName?.trim() && Array.isArray(team.members) && team.members.length > 0);
    return validTeams.length >= 2; // Example: require at least 2 valid teams
});

// Computed property to enable/disable the save button for the current team form
const canSaveTeam = computed<boolean>(() => {
    return !!currentTeam.teamName.trim() &&
           currentTeam.members.length > 0 &&
           !props.isSubmitting;
});

// Computed property to check if all available students have been assigned to a team
const areAllStudentsAssigned = computed<boolean>(() => {
    if (!Array.isArray(props.students) || props.students.length === 0) {
        return true; // Or false, depending on desired behavior when no students exist
    }
    const currentAssignedIds = assignedStudentIds.value; // Use the computed set
    return props.students.every(student => currentAssignedIds.has(student.uid));
});

// Check if adding another team is possible
const canAddTeam = computed<boolean>(() => { 
     const maxTeams = 10; // Example limit
     return localTeams.value.length < maxTeams && !props.isSubmitting;
});

// --- Auto-Generation Computed ---
const canTriggerAutoGenerate = computed<boolean>(() => {
    autoGenErrorMessage.value = '';
    if (props.isSubmitting) return false;
    if (!Array.isArray(props.students) || props.students.length === 0) {
        autoGenErrorMessage.value = 'No students available to generate teams.';
        return false;
    }
    return true;
});

// --- Helper Methods ---

// Checks if a student is assigned to *another* team (different from the one currently being edited)
const isStudentAssignedElsewhere = (studentUid: string): boolean => {
    return localTeams.value.some(team =>
        team.teamName !== editingTeamName.value && // Exclude the team currently being edited
        Array.isArray(team.members) &&
        team.members.includes(studentUid)
    );
};


// --- Auto-Generation Action ---
const triggerAutoGenerate = (): void => {
    if (!canTriggerAutoGenerate.value) {
        // Error message should already be set by the computed property
        return;
    }
    // Emit the event for the parent component to handle the logic
    emit('auto-generate', {
        generationType: autoGenType.value,
        value: Number(autoGenValue.value) // Ensure it's a number
    });
};


// --- Team Management Actions ---

// Prepare the form for adding a *new* team
const prepareNewTeam = (): void => {
    editingTeamName.value = null; // Ensure we are not in edit mode
    currentTeam.teamName = '';
    currentTeam.members = [];
    currentTeam.ratings = [];
    currentTeam.submissions = [];
    studentSearch.value = '';
    addTeamErrorMessage.value = '';
    showNewTeamForm.value = true; // Show the form
};

// Prepare the form for editing an *existing* team
const editTeam = (teamName: string): void => {
    const teamToEdit = localTeams.value.find(t => t.teamName === teamName);
    if (teamToEdit) {
        editingTeamName.value = teamName; // Set the name of the team being edited
        currentTeam.teamName = teamToEdit.teamName;
        // Deep copy members to avoid modifying original array directly during edit
        currentTeam.members = teamToEdit.members ? [...teamToEdit.members] : [];
        currentTeam.ratings = teamToEdit.ratings ? [...teamToEdit.ratings] : [];
        currentTeam.submissions = teamToEdit.submissions ? [...teamToEdit.submissions] : [];
        studentSearch.value = '';
        addTeamErrorMessage.value = '';
        showNewTeamForm.value = false; // Ensure add mode is off
    } else {
        console.error("Could not find team to edit with name:", teamName);
        cancelEdit(); // Reset if team not found
    }
};

// Cancel the current add/edit operation and hide the form
const cancelEdit = (): void => {
    editingTeamName.value = null;
    showNewTeamForm.value = false;
    currentTeam.teamName = '';
    currentTeam.members = [];
    currentTeam.ratings = [];
    currentTeam.submissions = [];
    studentSearch.value = '';
    addTeamErrorMessage.value = '';
};

// Save the team currently in the form (either add new or update existing)
const saveTeam = (): void => {
    addTeamErrorMessage.value = ''; // Clear previous errors
    const teamNameTrimmed = currentTeam.teamName.trim();

    // --- Validation ---
    if (!teamNameTrimmed) {
        addTeamErrorMessage.value = 'Team name is required.';
        return;
    }
    if (!Array.isArray(currentTeam.members) || currentTeam.members.length === 0) {
        addTeamErrorMessage.value = 'Team must have at least one member.';
        return;
    }

    // Check for duplicate team names (case-insensitive), excluding the team being edited
    const isNameDuplicate = localTeams.value.some(team =>
        team.teamName !== editingTeamName.value && // Exclude self if editing
        team.teamName.trim().toLowerCase() === teamNameTrimmed.toLowerCase()
    );
    if (isNameDuplicate) {
        addTeamErrorMessage.value = `Team name "${teamNameTrimmed}" already exists. Please use a unique name.`;
        return;
    }

    // --- Update Logic ---
    const teamData: EventTeam = {
        teamName: teamNameTrimmed,
        members: [...currentTeam.members], // Create a copy of members
        ratings: [...currentTeam.ratings],
        submissions: [...currentTeam.submissions]
    };

    const existingTeamIndex = localTeams.value.findIndex(t => t.teamName === editingTeamName.value);

    if (editingTeamName.value !== null && existingTeamIndex !== -1) {
        // Update existing team
        localTeams.value.splice(existingTeamIndex, 1, teamData);
    } else {
        // Add new team
        localTeams.value.push(teamData);
    }

    emitUpdate(); // Emit the updated list
    cancelEdit(); // Close form and reset state
};

// Delete a team by its name
const deleteTeam = (teamNameToDelete: string): void => {
    // Prevent deleting if it leaves less than 2 teams
     if (localTeams.value.filter(t => t.teamName).length <= 2) {
        addTeamErrorMessage.value = 'Cannot delete team: Minimum of 2 teams required.';
        // Use a more persistent notification system if needed
        setTimeout(() => addTeamErrorMessage.value = '', 3000);
        return;
    }

    if (confirm(`Are you sure you want to delete team "${teamNameToDelete}"? This cannot be undone.`)) {
        const indexToDelete = localTeams.value.findIndex(t => t.teamName === teamNameToDelete);
        if (indexToDelete !== -1) {
            localTeams.value.splice(indexToDelete, 1);

            // If the deleted team was being edited, reset the form
            if (editingTeamName.value === teamNameToDelete) {
                 cancelEdit();
            }
            emitUpdate(); // Emit the updated list
        } else {
             console.error("Could not find team to delete with name:", teamNameToDelete);
             addTeamErrorMessage.value = 'Error deleting team: Team not found.';
        }
    }
};

// These functions are replaced by the team-specific versions below

// Emit the current valid teams list to the parent
const emitUpdate = (): void => {
    // Filter out any potential invalid teams before emitting (e.g., empty placeholders)
    const validTeams = localTeams.value.filter(team => team.teamName?.trim() && Array.isArray(team.members));
    emit('update:teams', validTeams);
};

// Function to filter students for a specific team
const filteredStudents = (teamIndex: number) => {
    if (!Array.isArray(props.students)) return [];
    
    const currentTeam = localTeams.value[teamIndex];
    if (!currentTeam) return [];
    
    // Get all student IDs assigned to any team
    const allAssignedIds = new Set(
        localTeams.value.flatMap(team => team.members || [])
    );
    
    // Filter students that are not already in any team or are in the current team
    let available = props.students.filter(student => 
        !allAssignedIds.has(student.uid) || currentTeam.members.includes(student.uid)
    );
    
    // Further filter by search term if present
    if (searchQueries[teamIndex]) {
        const search = searchQueries[teamIndex].toLowerCase();
        available = available.filter(student => {
            const name = props.nameCache[student.uid] || student.uid;
            return name.toLowerCase().includes(search);
        });
    }
    
    // Sort alphabetically
    return available.sort((a, b) => {
        const nameA = props.nameCache[a.uid] || a.uid;
        const nameB = props.nameCache[b.uid] || b.uid;
        return nameA.localeCompare(nameB);
    });
};

// Show dropdown for a specific team
const showDropdown = (index: number) => {
    dropdownVisible[index] = true;
};

// Hide dropdown for a specific team
const hideDropdown = (index: number) => {
    // Use setTimeout to allow click events to complete before hiding
    setTimeout(() => {
        dropdownVisible[index] = false;
    }, 200);
};

// Add a member to a specific team
const addMember = (teamIndex: number, student: { uid: string }) => {
    const team = localTeams.value[teamIndex];
    if (!team) return;
    
    // Check if student is already in this team
    if (team.members.includes(student.uid)) return;
    
    // Check if student is in another team
    const isInOtherTeam = localTeams.value.some((t, idx) => 
        idx !== teamIndex && t.members.includes(student.uid)
    );
    
    // If student is in another team, ask for confirmation
    if (isInOtherTeam) {
        const studentName = props.nameCache[student.uid] || student.uid;
        if (!confirm(`${studentName} is already in another team. Move to this team?`)) {
            return;
        }
        
        // Remove from other teams
        localTeams.value.forEach((t, idx) => {
            if (idx !== teamIndex && t.members.includes(student.uid)) {
                t.members = t.members.filter(id => id !== student.uid);
            }
        });
    }
    
    // Add to current team
    team.members.push(student.uid);
    searchQueries[teamIndex] = ''; // Clear search
    emitUpdate();
};

// Remove a member from a specific team
const removeMember = (teamIndex: number, memberId: string) => {
    const team = localTeams.value[teamIndex];
    if (!team) return;
    
    team.members = team.members.filter(id => id !== memberId);
    emitUpdate();
};

// Remove a team
const removeTeam = (index: number) => {
    if (localTeams.value.length <= minTeams.value) {
        alert(`At least ${minTeams.value} teams are required.`);
        return;
    }
    
    localTeams.value.splice(index, 1);
    emitUpdate();
};

// Add a new team
const addTeam = () => {
    localTeams.value.push({
        teamName: '',
        members: [],
        ratings: [],
        submissions: []
    });
    
    // Initialize search and dropdown for the new team
    const newIndex = localTeams.value.length - 1;
    searchQueries[newIndex] = '';
    dropdownVisible[newIndex] = false;
    
    emitUpdate();
};
</script>
