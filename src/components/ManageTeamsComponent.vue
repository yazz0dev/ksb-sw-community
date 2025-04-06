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
                                   :ref="el => { if (el) memberSearchInputs[index] = el as HTMLInputElement }"
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
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { EventTeam, TeamMember } from '../types/event';

interface Props {
    initialTeams: EventTeam[];
    students: TeamMember[];
    nameCache: Record<string, string>;
    isSubmitting: boolean;
    canAutoGenerate: boolean;
}

// --- Props and Emits ---
const props = defineProps<Props>();
const emit = defineEmits<{
    'update:teams': [teams: EventTeam[]];
    'can-add-team': [canAdd: boolean];
    'auto-generate': [config: { generationType: string; value: number }];
}>();

// --- Local State ---
const localTeams = ref<EventTeam[]>([]);
const searchQueries = reactive<Record<number, string>>({});
const dropdownVisible = reactive<Record<number, boolean>>({});
const currentTeam = reactive<EventTeam>({ teamName: '', members: [], ratings: [], submissions: [] });
const editingTeamName = ref<string | null>(null);
const studentSearch = ref<string>('');
const addTeamErrorMessage = ref<string>('');
const showNewTeamForm = ref<boolean>(false);
const showValidationErrors = ref<boolean>(false);
const minTeams = ref<number>(2);
const autoGenType = ref<'numberOfTeams' | 'maxMembers'>('numberOfTeams');
const autoGenValue = ref<number>(2);
const autoGenErrorMessage = ref<string>('');
const memberSearchInputs = ref<Record<number, HTMLInputElement>>({}); // Add ref for inputs

// --- Helper Methods (Define BEFORE use in watchers/initialization) ---

// Emit the current valid teams list to the parent
const emitUpdate = (): void => {
    // Filter out any potential invalid teams before emitting (e.g., empty placeholders)
    const validTeams = localTeams.value.filter(team => team.teamName?.trim() && Array.isArray(team.members));
    emit('update:teams', validTeams);
};

// Add new method to check unique team names
const ensureUniqueTeamNames = () => {
    const usedNames = new Set<string>();
    localTeams.value.forEach((team, index) => {
        let baseName = team.teamName || `Team ${index + 1}`;
        let newName = baseName;
        let counter = 1;
        
        while (usedNames.has(newName.toLowerCase())) {
            newName = `${baseName} ${counter}`;
            counter++;
        }
        
        if (newName !== team.teamName) {
            team.teamName = newName;
        }
        usedNames.add(newName.toLowerCase());
    });
};

// Helper to initialize or reset local teams
const initializeTeams = (initialData: EventTeam[]) => {
    if (!initialData || initialData.length === 0) {
        // Add two empty teams by default
        localTeams.value = [
            { teamName: 'Team 1', members: [], ratings: [], submissions: [] },
            { teamName: 'Team 2', members: [], ratings: [], submissions: [] }
        ];
    } else {
        localTeams.value = JSON.parse(JSON.stringify(initialData));
    }
    ensureUniqueTeamNames(); // Now safe to call

    // Initialize search queries and dropdown visibility
    localTeams.value.forEach((_, index) => {
        searchQueries[index] = '';
        dropdownVisible[index] = false;
    });
};

// Function to filter students for a specific team
const filteredStudents = (teamIndex: number): TeamMember[] => {
    if (!Array.isArray(props.students)) return [];
    
    const currentTeam = localTeams.value[teamIndex];
    if (!currentTeam) return [];
    
    // Get all assigned students except those in current team
    const assignedElsewhere = new Set(
        localTeams.value
            .filter((_, idx) => idx !== teamIndex)
            .flatMap(team => team.members || [])
    );
    
    // Filter available students
    let available = props.students.filter(student => 
        !assignedElsewhere.has(student.uid) || 
        (currentTeam.members && currentTeam.members.includes(student.uid))
    );
    
    // Apply search filter
    if (searchQueries[teamIndex]) {
        const search = searchQueries[teamIndex].toLowerCase();
        available = available.filter(student => {
            const name = (props.nameCache[student.uid] || student.uid).toLowerCase();
            return name.includes(search);
        });
    }
    
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
const addMember = async (teamIndex: number, student: TeamMember) => { // Make async
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
            searchQueries[teamIndex] = ''; // Clear search even if cancelled
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

    // Refocus the input after clearing search and updating state
    await nextTick(); // Wait for DOM update
    const inputElement = memberSearchInputs.value[teamIndex];
    if (inputElement) {
        inputElement.focus();
        // Ensure dropdown re-opens if needed
        showDropdown(teamIndex); 
    }
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
    const newTeamNumber = localTeams.value.length + 1;
    localTeams.value.push({
        teamName: `Team ${newTeamNumber}`,
        members: [],
        ratings: [],
        submissions: []
    });
    
    // Initialize search and dropdown for the new team
    const newIndex = localTeams.value.length - 1;
    searchQueries[newIndex] = '';
    dropdownVisible[newIndex] = false;
    
    ensureUniqueTeamNames(); // Ensure name is unique after adding
    emitUpdate();
};

// --- Computed Properties (Can be defined after methods they use) ---

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

// --- Watchers (Define AFTER functions they call) ---
watch(() => props.initialTeams, (newTeams) => {
    // Call the initialization function which is now defined above
    initializeTeams(newTeams);
}, { immediate: true, deep: true }); // Added deep: true for better reactivity on nested changes if needed

// --- Lifecycle Hooks ---
onMounted(() => {
    // Ensure initial state is set correctly if watcher didn't cover it
    if (localTeams.value.length === 0) {
        initializeTeams([]); // Use the initializer function
    }
});
</script>
