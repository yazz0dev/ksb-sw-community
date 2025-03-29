<template>
    <div class="team-management">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="mb-0">Define Teams</h4>
            <!-- Remove this button as we have another one below -->
        </div>
        
        <div v-if="addTeamErrorMessage" class="alert alert-danger alert-sm" role="alert">{{ addTeamErrorMessage }}</div>

        <!-- Teams List -->
        <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Current Teams ({{ localTeams.length }})</h5>
                <button v-if="!areAllStudentsAssigned" 
                        @click="prepareNewTeam" 
                        class="btn btn-sm btn-outline-primary" 
                        :disabled="props.isSubmitting">
                    <i class="fas fa-plus me-1"></i> Add New Team
                </button>
            </div>
            
            <div v-if="localTeams.length === 0" class="alert alert-light alert-sm py-2 px-3">
                No teams defined yet.
            </div>
            <div v-else class="row row-cols-1 row-cols-md-2 g-3 mb-3">
                <div v-for="(team, index) in sortedTeams" :key="team.teamName" class="col">
                    <div class="card h-100" :class="{ 'border-primary': editingTeamIndex === index }">
                        <div class="card-body position-relative py-2 px-3">
                            <div class="d-flex justify-content-between">
                                <h6 class="card-title mb-2">{{ team.teamName }}</h6>
                                <div class="btn-group btn-group-sm">
                                    <button @click="editTeam(index)" type="button" 
                                            class="btn btn-outline-primary btn-sm" 
                                            :disabled="props.isSubmitting || editingTeamIndex === index">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button @click="deleteTeam(index)" type="button" 
                                            class="btn btn-outline-danger btn-sm"
                                            :disabled="props.isSubmitting || localTeams.length <= 2">
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

        <!-- Team Edit Form -->
        <div v-if="editingTeamIndex !== null || showNewTeamForm" class="card mb-3">
            <div class="card-header bg-light">
                <h6 class="mb-0">{{ editingTeamIndex === null ? 'Add New Team' : `Edit Team: ${localTeams[editingTeamIndex].teamName}` }}</h6>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label :for="'teamNameInput' + (editingTeamIndex ?? 'New')" class="form-label">
                        Team Name <span class="text-danger">*</span>
                    </label>
                    <input type="text" :id="'teamNameInput' + (editingTeamIndex ?? 'New')"
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
                                     :class="{ 'text-muted': isStudentAssignedElsewhere(student.uid, editingTeamIndex) }">
                                    <span>{{ props.nameCache[student.uid] || 'Anonymous User' }}</span>
                                    <button @click="addMember(student.uid)" 
                                            class="btn btn-sm btn-outline-success py-0 px-2"
                                            :disabled="isStudentAssignedElsewhere(student.uid, editingTeamIndex)">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Selected Members List -->
                        <div class="col-md-6">
                            <h6 class="small mb-2">Team Members</h6>
                            <div class="selected-members-list border rounded p-2" style="height: 200px; overflow-y: auto;">
                                <div v-for="memberId in currentTeam.members" :key="memberId"
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
                        {{ editingTeamIndex === null ? 'Add Team' : 'Save Changes' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';

const props = defineProps({
    initialTeams: { type: Array, default: () => [] },
    students: { type: Array, required: true }, // Full list of available students
    nameCache: { type: Object, required: true }, // Map of UID -> Name
    isSubmitting: { type: Boolean, default: false } // Passed from parent during submission
});

const emit = defineEmits(['update:teams', 'can-add-team']); // Add 'can-add-team' to emits

// Local state for managing teams within the component
const localTeams = ref([{ teamName: '', members: [] }]);
const editingTeamIndex = ref(null); // null for adding new, index for editing
const currentTeam = reactive({ teamName: '', members: [] });
const studentSearch = ref('');
const addTeamErrorMessage = ref('');

// Initialize local teams based on prop
onMounted(() => {
     localTeams.value = JSON.parse(JSON.stringify(props.initialTeams || [{ teamName: '', members: [] }]));
     if (localTeams.value.length === 0) {
         localTeams.value.push({ teamName: '', members: [] });
     }
     // Start by editing the first team if it exists, otherwise prepare new
     if (localTeams.value.length > 0 && localTeams.value[0].teamName) {
         editTeam(0);
     } else {
         prepareNewTeam();
     }
});

// Watch for external changes to initialTeams (less common for modal use)
watch(() => props.initialTeams, (newVal) => {
     localTeams.value = JSON.parse(JSON.stringify(newVal || [{ teamName: '', members: [] }]));
     if (editingTeamIndex.value === null && localTeams.value.length === 0) {
          localTeams.value.push({ teamName: '', members: [] });
          prepareNewTeam();
     } else if (editingTeamIndex.value !== null && editingTeamIndex.value >= localTeams.value.length) {
         // If the team being edited was removed externally, reset
         prepareNewTeam();
     }
}, { deep: true });


// --- Computed Properties ---
const assignedStudentIds = computed(() => {
    return new Set(localTeams.value.flatMap(team => team.members || []));
});

const filteredStudents = computed(() => {
    if (!Array.isArray(props.students)) return [];
    const searchLower = studentSearch.value.toLowerCase();
    const sortedStudents = [...props.students].sort((a, b) => {
         const nameA = props.nameCache[a.uid] || a.uid;
         const nameB = props.nameCache[b.uid] || b.uid;
         return nameA.localeCompare(nameB);
     });
    if (!searchLower) return sortedStudents;
    return sortedStudents.filter(student => {
        const name = props.nameCache[student.uid] || '';
        const uid = student.uid || '';
        return name.toLowerCase().includes(searchLower) || uid.toLowerCase().includes(searchLower);
    });
});

const sortedTeams = computed(() => {
     return [...localTeams.value].sort((a, b) => 
        (a?.teamName || '').localeCompare(b?.teamName || '')
    );
});

// Add minimum teams validation
const hasValidTeams = computed(() => {
    // Check if we have at least 2 teams
    if (!Array.isArray(localTeams.value) || localTeams.value.length < 2) {
        return false;
    }

    // Check if each team has a name and at least one member
    return localTeams.value.every(team => 
        team.teamName?.trim() && 
        Array.isArray(team.members) && 
        team.members.length > 0
    );
});

// Add new computed property for save button state
const canSaveTeam = computed(() => {
    return currentTeam.teamName.trim() && 
           currentTeam.members.length > 0 && 
           !props.isSubmitting;
});

// Add new computed property for available students filtering
const filteredAvailableStudents = computed(() => {
    let available = props.students.filter(student => !currentTeam.members.includes(student.uid));
    
    if (studentSearch.value) {
        const search = studentSearch.value.toLowerCase();
        available = available.filter(student => {
            const name = props.nameCache[student.uid] || '';
            return name.toLowerCase().includes(search) || 
                   student.uid.toLowerCase().includes(search);
        });
    }
    
    return available.sort((a, b) => {
        const nameA = props.nameCache[a.uid] || '';
        const nameB = props.nameCache[b.uid] || '';
        return nameA.localeCompare(nameB);
    });
});

// Add new ref for new team form visibility
const showNewTeamForm = ref(false);

// Add computed property to check if all students are assigned
const areAllStudentsAssigned = computed(() => {
    const assignedStudents = new Set(
        localTeams.value.flatMap(team => team.members || [])
    );
    return props.students.every(student => assignedStudents.has(student.uid));
});

// Move initialization before the watch
const previousAllAssigned = ref(false);

// Update watch to avoid ReferenceError
watch([localTeams, areAllStudentsAssigned], (newVals, oldVals) => {
    const [_, newAllAssigned] = newVals;
    if (previousAllAssigned.value !== newAllAssigned) {
        emit('can-add-team', !newAllAssigned);
        previousAllAssigned.value = newAllAssigned;
    }
}, { immediate: true });

// --- Helper Methods ---
const isStudentAssignedElsewhere = (studentUid, currentEditIndex) => {
    return localTeams.value.some((team, index) => index !== currentEditIndex && team.members.includes(studentUid));
};

const getTeamAssignmentName = (studentUid) => {
    const team = localTeams.value.find(t => t.members.includes(studentUid));
    return team ? team.teamName : '';
};

// --- Actions ---
const prepareNewTeam = () => {
    editingTeamIndex.value = null;
    currentTeam.teamName = '';
    currentTeam.members.length = 0; // Clear array while maintaining reactivity
    studentSearch.value = '';
    addTeamErrorMessage.value = '';
    showNewTeamForm.value = true;
};

const editTeam = (index) => {
    if (index >= 0 && index < localTeams.value.length) {
        editingTeamIndex.value = index;
        const teamToEdit = localTeams.value[index];
        currentTeam.teamName = teamToEdit.teamName || '';
        currentTeam.members.length = 0; // Clear first
        if (Array.isArray(teamToEdit.members)) {
            teamToEdit.members.forEach(member => currentTeam.members.push(member));
        }
        studentSearch.value = '';
        addTeamErrorMessage.value = '';
    }
};

const cancelEdit = () => {
    showNewTeamForm.value = false;
    editingTeamIndex.value = null;
    currentTeam.teamName = '';
    currentTeam.members = [];
    studentSearch.value = '';
    addTeamErrorMessage.value = '';
};

const saveTeam = () => {
    try {
        addTeamErrorMessage.value = '';
        const teamNameTrimmed = currentTeam?.teamName?.trim() || '';

        // Validation
        if (!teamNameTrimmed) { 
            addTeamErrorMessage.value = 'Team name is required.'; 
            return; 
        }
        if (!Array.isArray(currentTeam.members) || currentTeam.members.length === 0) { 
            addTeamErrorMessage.value = 'Team must have at least one member.'; 
            return; 
        }

        const isNameDuplicate = localTeams.value.some((team, index) =>
            index !== editingTeamIndex.value && 
            (team?.teamName || '').trim().toLowerCase() === teamNameTrimmed.toLowerCase()
        );
        if (isNameDuplicate) { 
            addTeamErrorMessage.value = `Team name "${teamNameTrimmed}" already exists.`; 
            return; 
        }

        const updatedTeams = [...localTeams.value];
        const newTeam = { 
            teamName: teamNameTrimmed, 
            members: [...currentTeam.members] 
        };

        if (editingTeamIndex.value !== null) {
            updatedTeams[editingTeamIndex.value] = newTeam;
        } else {
            if (updatedTeams.length === 1 && 
                !updatedTeams[0]?.teamName && 
                (!updatedTeams[0]?.members?.length)) {
                updatedTeams[0] = newTeam;
            } else {
                updatedTeams.push(newTeam);
            }
        }

        localTeams.value = updatedTeams;
        emit('update:teams', updatedTeams);
        prepareNewTeam();
    } catch (error) {
        console.error('Error saving team:', error);
        addTeamErrorMessage.value = 'Error saving team. Please try again.';
    }
};

const deleteTeam = (indexToDelete) => {
    try {
        if (localTeams.value.length <= 2) {
            addTeamErrorMessage.value = 'Cannot delete team: Minimum of 2 teams required.';
            return;
        }
        
        const teamName = localTeams.value[indexToDelete]?.teamName || 'this team';
        if (confirm(`Are you sure you want to delete "${teamName}"?`)) {
            const updatedTeams = localTeams.value.filter((_, index) => index !== indexToDelete);
            localTeams.value = updatedTeams;
            emit('update:teams', updatedTeams);

            if (editingTeamIndex.value === indexToDelete) {
                prepareNewTeam();
            } else if (editingTeamIndex.value !== null && editingTeamIndex.value > indexToDelete) {
                editingTeamIndex.value--;
            }

            if (localTeams.value.length === 0) {
                localTeams.value = [{ teamName: '', members: [] }];
                prepareNewTeam();
                emit('update:teams', localTeams.value);
            }
        }
    } catch (error) {
        console.error('Error deleting team:', error);
        addTeamErrorMessage.value = 'Error deleting team. Please try again.';
    }
};

// Add new methods for member management
const addMember = (uid) => {
    if (!currentTeam.members.includes(uid) && !isStudentAssignedElsewhere(uid, editingTeamIndex.value)) {
        currentTeam.members.push(uid);
    }
};

const removeMember = (uid) => {
    const index = currentTeam.members.indexOf(uid);
    if (index !== -1) {
        currentTeam.members.splice(index, 1);
    }
};

// Update the emitUpdate function
const emitUpdate = () => {
    emit('update:teams', localTeams.value);
};
</script>

<style scoped>
.team-member-select { min-height: 150px; max-height: 250px; }
.team-member-select option:disabled { color: #adb5bd; font-style: italic; background-color: #e9ecef; }
.alert-sm { padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); margin-bottom: var(--space-3); }
.fa-xs { font-size: 0.7em; }
.student-item:hover { background-color: rgba(0,0,0,0.05); }
.available-students-list, .selected-members-list {
    background: white;
}
.team-members {
    min-height: 2rem;
}
</style>
