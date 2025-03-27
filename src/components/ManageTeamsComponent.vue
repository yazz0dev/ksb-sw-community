// src/components/ManageTeamsComponent.vue
<template>
    <div>
        <div v-if="addTeamErrorMessage" class="alert alert-danger alert-sm" role="alert">{{ addTeamErrorMessage }}</div>

        <!-- Existing Teams Display -->
        <div class="mb-4">
            <h5 class="mb-2">Current Teams ({{ localTeams.length }})</h5>
            <div v-if="localTeams.length === 0" class="alert alert-light alert-sm py-2 px-3">No teams defined yet. Add one below.</div>
            <div v-else>
                 <div v-for="(team, index) in sortedTeams" :key="team.name" class="card card-body mb-2 shadow-sm position-relative py-2 px-3">
                    <h6 class="card-title mb-1">{{ team.name }}</h6>
                    <div v-if="team.members && team.members.length > 0" class="d-flex flex-wrap gap-1">
                        <span v-for="memberId in team.members" :key="memberId" class="badge bg-light text-dark border small">
                            {{ nameCache[memberId] || 'Anonymous User' }}
                        </span>
                    </div>
                     <p v-else class="text-muted small mb-0">No members assigned.</p>
                     <button @click="deleteTeam(index)" type="button" class="btn btn-outline-danger btn-sm position-absolute top-0 end-0 m-1 p-1 lh-1" title="Delete Team" :disabled="isSubmitting">
                         <i class="fas fa-trash fa-xs"></i>
                     </button>
                </div>
            </div>
        </div>
        <hr class="my-3">

        <!-- Add/Edit Team Section -->
        <div>
            <h5 class="mb-3">{{ editingTeamIndex === null ? 'Add New Team' : 'Edit Team: ' + localTeams[editingTeamIndex].name }}</h5>
             <div class="team-definition-block border rounded p-3 mb-3 bg-white">
                <div class="mb-3">
                    <label :for="'teamNameInput' + (editingTeamIndex ?? 'New')" class="form-label fw-semibold">Team Name <span class="text-danger">*</span></label>
                    <input
                        type="text"
                        :id="'teamNameInput' + (editingTeamIndex ?? 'New')"
                        v-model="currentTeam.name"
                        required
                        class="form-control form-control-sm"
                        :disabled="isSubmitting"
                        placeholder="Enter unique team name"
                    />
                </div>
                <div>
                    <label class="form-label">Assign Members ({{ currentTeam.members.length }}):</label>
                    <input type="text" v-model="studentSearch" placeholder="Search students..." class="form-control form-control-sm mb-2">
                    <select
                        multiple
                        class="form-select form-select-sm team-member-select"
                        size="6"
                        v-model="currentTeam.members"
                        :disabled="isSubmitting"
                    >
                        <option
                            v-for="student in filteredStudents"
                            :key="student.uid"
                            :value="student.uid"
                            :disabled="isStudentAssignedElsewhere(student.uid, editingTeamIndex)"
                        >
                            {{ nameCache[student.uid] || 'Anonymous User' }}
                             <span v-if="isStudentAssignedElsewhere(student.uid, editingTeamIndex)" class="text-muted small">
                                 (in Team {{ getTeamAssignmentName(student.uid) }})
                             </span>
                        </option>
                    </select>
                     <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple. Students in another team are disabled.</small>
                </div>
                 <div class="mt-3 d-flex justify-content-end gap-2">
                      <button type="button" v-if="editingTeamIndex !== null" @click="cancelEdit" class="btn btn-sm btn-secondary" :disabled="isSubmitting">Cancel Edit</button>
                      <button type="button" @click="saveTeam" class="btn btn-sm btn-success" :disabled="isSubmitting || !currentTeam.name.trim() || currentTeam.members.length === 0">
                          {{ editingTeamIndex === null ? 'Add This Team' : 'Save Changes' }}
                     </button>
                 </div>
             </div>
             <button type="button" @click="prepareNewTeam" v-if="editingTeamIndex !== null" class="btn btn-sm btn-outline-primary" :disabled="isSubmitting">
                 <i class="fas fa-plus me-1"></i> Add Another New Team
             </button>
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

const emit = defineEmits(['update:teams']);

// Local state for managing teams within the component
const localTeams = ref([]);
const editingTeamIndex = ref(null); // null for adding new, index for editing
const currentTeam = reactive({ name: '', members: [] });
const studentSearch = ref('');
const addTeamErrorMessage = ref('');

// Initialize local teams based on prop
onMounted(() => {
     localTeams.value = JSON.parse(JSON.stringify(props.initialTeams || [{ name: '', members: [] }]));
     if (localTeams.value.length === 0) {
         localTeams.value.push({ name: '', members: [] });
     }
     // Start by editing the first team if it exists, otherwise prepare new
     if (localTeams.value.length > 0 && localTeams.value[0].name) {
         editTeam(0);
     } else {
         prepareNewTeam();
     }
});

// Watch for external changes to initialTeams (less common for modal use)
watch(() => props.initialTeams, (newVal) => {
     localTeams.value = JSON.parse(JSON.stringify(newVal || [{ name: '', members: [] }]));
     if (editingTeamIndex.value === null && localTeams.value.length === 0) {
          localTeams.value.push({ name: '', members: [] });
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
     return [...localTeams.value].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
});

// --- Helper Methods ---
const isStudentAssignedElsewhere = (studentUid, currentEditIndex) => {
    return localTeams.value.some((team, index) => index !== currentEditIndex && team.members.includes(studentUid));
};

const getTeamAssignmentName = (studentUid) => {
    const team = localTeams.value.find(t => t.members.includes(studentUid));
    return team ? team.name : '';
};

// --- Actions ---
const prepareNewTeam = () => {
    editingTeamIndex.value = null;
    currentTeam.name = '';
    currentTeam.members = [];
    studentSearch.value = '';
    addTeamErrorMessage.value = '';
};

const editTeam = (index) => {
    if (index >= 0 && index < localTeams.value.length) {
        editingTeamIndex.value = index;
        const teamToEdit = localTeams.value[index];
        currentTeam.name = teamToEdit.name;
        currentTeam.members = [...teamToEdit.members]; // Copy members
        studentSearch.value = '';
        addTeamErrorMessage.value = '';
    }
};

const cancelEdit = () => {
    // If was editing, revert. If was adding new, just reset.
    prepareNewTeam();
};

const saveTeam = () => {
    addTeamErrorMessage.value = '';
    const teamNameTrimmed = currentTeam.name.trim();

    // Validation
    if (!teamNameTrimmed) { addTeamErrorMessage.value = 'Team name is required.'; return; }
    if (currentTeam.members.length === 0) { addTeamErrorMessage.value = 'Team must have at least one member.'; return; }

    const isNameDuplicate = localTeams.value.some((team, index) =>
        index !== editingTeamIndex.value && team.name.trim().toLowerCase() === teamNameTrimmed.toLowerCase()
    );
    if (isNameDuplicate) { addTeamErrorMessage.value = `Team name "${teamNameTrimmed}" already exists.`; return; }

    const updatedTeams = JSON.parse(JSON.stringify(localTeams.value)); // Deep copy

    if (editingTeamIndex.value !== null) {
        // Update existing team
        updatedTeams[editingTeamIndex.value] = { name: teamNameTrimmed, members: [...currentTeam.members] };
    } else {
        // Add new team
         // Check if we were editing the 'placeholder' first team
         if (updatedTeams.length === 1 && !updatedTeams[0].name && updatedTeams[0].members.length === 0) {
              updatedTeams[0] = { name: teamNameTrimmed, members: [...currentTeam.members] }; // Replace placeholder
         } else {
              updatedTeams.push({ name: teamNameTrimmed, members: [...currentTeam.members] });
         }
    }

    localTeams.value = updatedTeams; // Update local state
    emit('update:teams', updatedTeams); // Emit change to parent
    prepareNewTeam(); // Reset form for next potential addition
};

const deleteTeam = (indexToDelete) => {
    if (confirm(`Are you sure you want to delete team "${localTeams.value[indexToDelete].name}"?`)) {
        const updatedTeams = localTeams.value.filter((_, index) => index !== indexToDelete);
        localTeams.value = updatedTeams;
        emit('update:teams', updatedTeams);

        // If the deleted team was being edited, reset the form
        if (editingTeamIndex.value === indexToDelete) {
            prepareNewTeam();
        } else if (editingTeamIndex.value !== null && editingTeamIndex.value > indexToDelete) {
             // Adjust editing index if it was after the deleted team
             editingTeamIndex.value--;
        }
         // Ensure there's always at least one (potentially empty) team object if needed by parent logic
         if (localTeams.value.length === 0) {
              localTeams.value.push({ name: '', members: [] });
              prepareNewTeam();
              emit('update:teams', localTeams.value); // Emit the cleared state
         }
    }
};
</script>

<style scoped>
.team-member-select { min-height: 150px; max-height: 250px; }
.team-member-select option:disabled { color: #adb5bd; font-style: italic; background-color: #e9ecef; }
.alert-sm { padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); margin-bottom: var(--space-3); }
.fa-xs { font-size: 0.7em; }
</style>
