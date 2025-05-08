<template>
  <div class="mb-3">
    <label class="form-label small text-secondary">
      Add Team Members
      <span class="text-danger">*</span>
      <span class="text-muted ms-1">
        ({{ selectedMembers.length }}/{{ maxMembers }} selected)
      </span>
    </label>
    <select
      class="form-select form-select-sm" 
      v-model="selectedMemberToAdd"
      :disabled="isSubmitting || selectedMembers.length >= maxMembers"
      @change="addMember"
    >
      <option value="" disabled selected>Select a student to add...</option>
      <!-- FIX: Iterate over availableStudents which now includes name -->
      <option
        v-for="student in availableStudentsForDropdown"
        :key="student.uid"
        :value="student.uid"
      >
        <!-- Display name directly from student object -->
        {{ console.log('[TMS Dropdown] Student:', JSON.stringify(student)), '' }} {{ student.name || `UID: ${student.uid.substring(0,6)}...` }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
// FIX: Import UserData type
import { UserData } from '@/types/user';

interface Props {
  selectedMembers: string[];
  // FIX: Expect UserData array
  availableStudents: UserData[];
  isSubmitting: boolean;
  minMembers?: number;
  maxMembers?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minMembers: 2,
  maxMembers: 8,
  selectedMembers: () => [], // Ensure default is a new array instance
  availableStudents: () => [], // Ensure default is a new array instance
});

const emit = defineEmits(['update:members']);

const userStore = useUserStore();

const selectedMemberToAdd = ref(''); // Renamed to avoid confusion

// Filter available students for the dropdown (exclude already selected)
const availableStudentsForDropdown = computed(() => {
    // Log the raw props.availableStudents received by TeamMemberSelect
    if (props.availableStudents.length > 0) {
        console.log('[TMS availableStudentsForDropdown] props.availableStudents[0]:', JSON.stringify(props.availableStudents[0]));
    } else {
        console.log('[TMS availableStudentsForDropdown] props.availableStudents is empty.');
    }
    const selectedSet = new Set(props.selectedMembers);
    return props.availableStudents.filter(student => !selectedSet.has(student.uid));
});

const addMember = () => {
  if (selectedMemberToAdd.value && !props.selectedMembers.includes(selectedMemberToAdd.value)) {
    const newMembers = [...props.selectedMembers, selectedMemberToAdd.value];
    if (newMembers.length <= props.maxMembers) {
      emit('update:members', newMembers);
    } else {
        // Optionally notify user they reached the max limit
        console.warn(`Maximum team members (${props.maxMembers}) reached.`);
    }
  }
  selectedMemberToAdd.value = ''; // Reset selection
};

// Enforce max members limit (e.g., if prop changes externally)
watch(() => props.selectedMembers, (newMembers) => {
  if (newMembers.length > props.maxMembers) {
    // If somehow the list exceeds max, truncate it
    emit('update:members', newMembers.slice(0, props.maxMembers));
  }
}, { deep: true });

// Reset selection on mount or when available students change significantly
watch(() => props.availableStudents, (newVal) => {
    console.log('[TMS Watcher] props.availableStudents changed. Length:', newVal?.length ?? 0);
    if (newVal && newVal.length > 0) {
        console.log('[TMS Watcher] First student in new props.availableStudents:', JSON.stringify(newVal[0]));
    }
    selectedMemberToAdd.value = '';
}, { deep: true, immediate: true });

onMounted(() => {
  selectedMemberToAdd.value = ''; // Reset selection on mount
});
</script>

<style scoped>
/* Add styles if needed, e.g., for the optional selected members display */
.badge .btn-close-sm {
  padding: 0.2em 0.35em;
  width: 0.7em;
  height: 0.7em;
  filter: brightness(0) saturate(100%) invert(68%) sepia(11%) saturate(538%) hue-rotate(176deg) brightness(90%) contrast(89%);
}
.badge .btn-close-sm:hover {
   filter: brightness(0) saturate(100%) invert(18%) sepia(88%) saturate(4792%) hue-rotate(348deg) brightness(96%) contrast(95%);
}
</style>