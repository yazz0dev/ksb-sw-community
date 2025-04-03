<template>
    <div class="team-management">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="mb-0">Define Teams</h4>
        </div>

        <!-- Auto-Generation Section -->
        <div v-if="props.canAutoGenerate" class="card mb-4 bg-light-subtle">
            <div class="card-body p-3">
                <h6 class="card-title mb-2">Auto-Generate Teams</h6>
                 <div v-if="autoGenErrorMessage" class="alert alert-warning alert-sm py-1 px-2 mb-2" role="alert">{{ autoGenErrorMessage }}</div>
                <div class="row g-2 align-items-end">
                    <div class="col-md-5">
                        <label class="form-label small mb-1">Generation Method:</label>
                        <select v-model="autoGenType" class="form-select form-select-sm" :disabled="props.isSubmitting">
                            <option value="numberOfTeams">Number of Teams</option>
                            <option value="maxMembers">Max Members per Team</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label for="autoGenValueInput" class="form-label small mb-1">
                            {{ autoGenType === 'numberOfTeams' ? 'Teams:' : 'Max Size:' }}
                        </label>
                        <input type="number" id="autoGenValueInput" v-model.number="autoGenValue"
                               class="form-control form-control-sm"
                               :min="autoGenType === 'numberOfTeams' ? 2 : 1"
                               :disabled="props.isSubmitting" />
                    </div>
                    <div class="col-md-4">
                         <button @click="triggerAutoGenerate"
                                class="btn btn-sm btn-primary w-100"
                                :disabled="props.isSubmitting || !canTriggerAutoGenerate">
                            <i class="fas fa-cogs me-1"></i> Generate
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="addTeamErrorMessage" class="alert alert-danger alert-sm" role="alert">{{ addTeamErrorMessage }}</div>

        <!-- Teams List -->
        <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Current Teams ({{ sortedTeams.length }})</h5>
                <button v-if="!areAllStudentsAssigned"
                        @click="prepareNewTeam"
                        class="btn btn-sm btn-outline-primary"
                        :disabled="props.isSubmitting || showNewTeamForm">
                    <i class="fas fa-plus me-1"></i> Add New Team
                </button>
            </div>

            <div v-if="sortedTeams.length === 0" class="alert alert-light alert-sm py-2 px-3">
                No teams defined yet. Click 'Add New Team' to start.
            </div>
            <div v-else class="row row-cols-1 row-cols-md-2 g-3 mb-3">
                <div v-for="(team) in sortedTeams" :key="team.teamName" class="col">
                    <div class="card h-100" :class="{ 'border-primary': editingTeamName === team.teamName }">
                        <div class="card-body position-relative py-2 px-3">
                            <div class="d-flex justify-content-between">
                                <h6 class="card-title mb-2">{{ team.teamName }}</h6>
                                <div class="btn-group btn-group-sm">
                                    <button @click="editTeam(team.teamName)" type="button"
                                            class="btn btn-outline-primary btn-sm"
                                            :disabled="props.isSubmitting || editingTeamName === team.teamName || showNewTeamForm">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button @click="deleteTeam(team.teamName)" type="button"
                                            class="btn btn-outline-danger btn-sm"
                                            :disabled="props.isSubmitting || sortedTeams.length <= 2">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="team-members">
                                <div v-if="team.members && team.members.length > 0" class="d-flex flex-wrap gap-1">
                                    <span v-for="memberId in team.members" :key="memberId"
                                          class="badge bg-light text-dark border small">
                                        {{ props.nameCache[memberId] || 'Anonymous User' }}
                                    </span>
                                </div>
                                <p v-else class="text-muted small mb-0">No members assigned</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Team Edit/Add Form -->
        <div v-if="editingTeamName !== null || showNewTeamForm" class="card mb-3">
            <div class="card-header">
                 <h6 class="mb-0">{{ showNewTeamForm && editingTeamName === null ? 'Add New Team' : `Edit Team: ${editingTeamName}` }}</h6>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label :for="'teamNameInput' + (editingTeamName ?? 'New')" class="form-label">
                        Team Name <span class="text-danger">*</span>
                    </label>
                    <input type="text" :id="'teamNameInput' + (editingTeamName ?? 'New')"
                           v-model="currentTeam.teamName" required class="form-control"
                           :disabled="props.isSubmitting" placeholder="Enter unique team name"/>
                </div>

                <div class="mb-3">
                    <label class="form-label d-flex justify-content-between">
                        <span>Team Members ({{ currentTeam.members.length }})</span>
                        <small class="text-muted">Min: 1 member</small>
                    </label>
                    <div class="input-group input-group-sm mb-2">
                        <input type="text" v-model="studentSearch"
                               placeholder="Search students..."
                               class="form-control"/>
                        <button class="btn btn-outline-secondary" type="button"
                                @click="studentSearch = ''"
                                v-if="studentSearch">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Available Students List -->
                    <div class="row gx-2">
                        <div class="col-md-6">
                            <h6 class="small mb-2">Available Students</h6>
                            <div class="available-students-list border rounded p-2" style="height: 200px; overflow-y: auto;">
                                <div v-for="student in filteredAvailableStudents" :key="student.uid"
                                     class="student-item d-flex justify-content-between align-items-center p-1"
                                     :class="{ 'text-muted': isStudentAssignedElsewhere(student.uid) }">
                                    <span>{{ props.nameCache[student.uid] || 'Anonymous User' }}</span>
                                    <button @click="addMember(student.uid)"
                                            class="btn btn-sm btn-outline-success py-0 px-2"
                                            :disabled="isStudentAssignedElsewhere(student.uid)">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div v-if="filteredAvailableStudents.length === 0 && studentSearch" class="text-muted small p-2">No matching students found.</div>
                                <div v-if="filteredAvailableStudents.length === 0 && !studentSearch" class="text-muted small p-2">All available students are in this team or assigned elsewhere.</div>
                            </div>
                        </div>

                        <!-- Selected Members List -->
                        <div class="col-md-6">
                            <h6 class="small mb-2">Team Members</h6>
                            <div class="selected-members-list border rounded p-2" style="height: 200px; overflow-y: auto;">
                                <div v-if="currentTeam.members.length === 0" class="text-muted small p-2">No members added yet.</div>
                                <div v-else v-for="memberId in currentTeam.members" :key="memberId"
                                     class="student-item d-flex justify-content-between align-items-center p-1">
                                    <span>{{ props.nameCache[memberId] || 'Anonymous User' }}</span>
                                    <button @click="removeMember(memberId)"
                                            class="btn btn-sm btn-outline-danger py-0 px-2">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex gap-2 justify-content-end">
                    <button type="button" @click="cancelEdit"
                            class="btn btn-sm btn-secondary"
                            :disabled="props.isSubmitting">
                        Cancel
                    </button>
                    <button type="button" @click="saveTeam"
                            class="btn btn-sm btn-primary"
                            :disabled="!canSaveTeam">
                        {{ editingTeamName === null ? 'Add Team' : 'Save Changes' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';

interface Team {
    teamName: string;
    members: string[];
}

interface Student {
    uid: string;
}

interface Props {
    initialTeams: Team[];
    students: Student[];
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
    'update:teams': [teams: Team[]];
    'can-add-team': [canAdd: boolean];
    'auto-generate': [config: { generationType: string; value: number }];
}>();

// --- Local State ---
const localTeams = ref<Team[]>([]);
const editingTeamName = ref<string | null>(null);
const currentTeam = reactive<Team>({ teamName: '', members: [] });
const studentSearch = ref<string>('');
const addTeamErrorMessage = ref<string>('');
const showNewTeamForm = ref<boolean>(false);

// --- Initialization ---
onMounted(() => {
    // Deep copy initial teams to avoid modifying prop directly
    localTeams.value = JSON.parse(JSON.stringify(props.initialTeams || []));
});

// --- Watchers ---
// Watch for external changes to initialTeams
watch(() => props.initialTeams, (newVal) => {
    localTeams.value = JSON.parse(JSON.stringify(newVal || []));
    // If the team being edited was removed externally, reset the form
    if (editingTeamName.value !== null && !localTeams.value.some(t => t.teamName === editingTeamName.value)) {
        cancelEdit();
    }
}, { deep: true });

// --- Computed Properties ---

// All student IDs currently assigned to any team
const assignedStudentIds = computed<Set<string>>(() => {
    return new Set(localTeams.value.flatMap(team => team.members || []));
});

// Filtered list of students available to be added to the *current* team being edited/created
const filteredAvailableStudents = computed<Student[]>(() => {
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
const sortedTeams = computed<Team[]>(() => {
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
    return currentTeam.teamName.trim() &&
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

// Emit whether adding more teams is possible (used by parent)
watch(areAllStudentsAssigned, (newVal) => {
    emit('can-add-team', !newVal);
}, { immediate: true });


// --- Auto-Generation Computed ---
const canTriggerAutoGenerate = computed<boolean>(() => {
    autoGenErrorMessage.value = ''; // Clear previous errors
    if (props.isSubmitting) return false;
    if (!Array.isArray(props.students) || props.students.length === 0) {
        autoGenErrorMessage.value = 'No students available to generate teams.';
        return false;
    }
    const value = Number(autoGenValue.value);
     if (isNaN(value) || !Number.isInteger(value) || value <= 0) { // Ensure integer > 0
        autoGenErrorMessage.value = 'Please enter a valid positive whole number.';
        return false;
    }

    if (autoGenType.value === 'numberOfTeams') {
        if (value < 2) {
             autoGenErrorMessage.value = 'Must generate at least 2 teams.';
             return false;
        }
        if (value > props.students.length) {
            autoGenErrorMessage.value = 'Cannot generate more teams than available students.';
            return false;
        }
    } else if (autoGenType.value === 'maxMembers') {
         if (value < 1) {
             // This case is already handled by the positive integer check above
             // autoGenErrorMessage.value = 'Max members per team must be at least 1.';
             // return false;
             return false; // Should not happen due to integer check
         }
         // Check if max members allows for at least 2 teams (if more than 1 student exists)
         if (props.students.length > 1 && Math.ceil(props.students.length / value) < 2 ) {
             autoGenErrorMessage.value = `Max members (${value}) results in only 1 team for ${props.students.length} students. Adjust to create at least 2 teams.`;
             return false;
         }
    }
    return true; // All checks passed
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
    const teamData: Team = {
        teamName: teamNameTrimmed,
        members: [...currentTeam.members] // Create a copy of members
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

// Add a member to the *current* team being edited/created
const addMember = (uid: string): void => {
    if (!currentTeam.members.includes(uid) && !isStudentAssignedElsewhere(uid)) {
        currentTeam.members.push(uid);
    } else if (isStudentAssignedElsewhere(uid)) {
        // Optionally provide feedback that the student is already assigned
        console.warn(`Student ${uid} is already assigned to another team.`);
    }
};

// Remove a member from the *current* team being edited/created
const removeMember = (uid: string): void => {
    const index = currentTeam.members.indexOf(uid);
    if (index !== -1) {
        currentTeam.members.splice(index, 1);
    }
};

// Emit the current valid teams list to the parent
const emitUpdate = (): void => {
    // Filter out any potential invalid teams before emitting (e.g., empty placeholders)
    const validTeams = localTeams.value.filter(team => team.teamName?.trim() && Array.isArray(team.members));
    emit('update:teams', validTeams);
};
</script>

<style scoped>
.team-member-select { min-height: 150px; max-height: 250px; }
.team-member-select option:disabled { color: #adb5bd; font-style: italic; background-color: #e9ecef; }
.fa-xs { font-size: 0.7em; }
.student-item {
    cursor: default; /* Indicate non-interactive text */
    transition: background-color 0.2s ease-in-out;
}
.student-item:hover { background-color: rgba(0,0,0,0.05); }
.available-students-list, .selected-members-list {
    background: white;
}
.team-members {
    min-height: 2rem; /* Ensure space even when empty */
    display: flex; /* Use flexbox for alignment */
    align-items: center; /* Vertically center content */
    flex-wrap: wrap; /* Allow badges to wrap */
    gap: 0.25rem; /* Space between badges */
}
.team-members .text-muted { /* Ensure placeholder text is centered */
    width: 100%;
    text-align: center;
    font-style: italic;
}
.card.border-primary {
    box-shadow: 0 0 0 0.25rem rgba(var(--color-primary-rgb), 0.25);
}
</style>
