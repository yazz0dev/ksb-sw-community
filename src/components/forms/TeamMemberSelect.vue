<template>
  <div class="mb-2"> <!-- Reduced bottom margin -->
    <label :for="selectId" class="form-label small text-secondary">
      Add Team Members <span class="text-danger">*</span>
    </label>
    <select
      :id="selectId"
      class="form-select form-select-sm"
      v-model="selectedMember"
      :disabled="isSubmitting || selectedMembers.length >= maxMembers"
      @change="addMember"
    >
      <option value="" disabled selected>Select a member to add...</option>
      <option
        v-for="student in availableStudents"
        :key="student.uid"
        :value="student.uid"
        :disabled="selectedMembers.includes(student.uid)"
      >
        <!-- Use nameCache for display -->
        {{ nameCache[student.uid] || student.uid }}
      </option>
    </select>
    <p v-if="selectedMembers.length >= maxMembers" class="form-text text-warning mt-1">
      Maximum number of members ({{ maxMembers }}) reached for this team.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, PropType } from 'vue';

interface Student {
    uid: string;
    // name?: string; // Name is primarily derived from nameCache now
}

const props = defineProps({
  selectedMembers: {
    type: Array as PropType<string[]>,
    required: true
  },
  availableStudents: {
    type: Array as PropType<Student[]>,
    required: true
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    required: true
  },
  isSubmitting: {
    type: Boolean,
    default: false
  },
  minMembers: {
    type: Number,
    default: 2
  },
  maxMembers: {
    type: Number,
    default: 10
  }
});

const emit = defineEmits(['update:members']);

const selectedMember = ref('');
// Generate a unique ID for the select element for accessibility
const selectId = computed(() => `team-member-select-${Math.random().toString(36).substring(2, 9)}`);

const addMember = () => {
  if (selectedMember.value && !props.selectedMembers.includes(selectedMember.value)) {
    const newMembers = [...props.selectedMembers, selectedMember.value];
    if (newMembers.length <= props.maxMembers) {
      emit('update:members', newMembers);
    } else {
        // Optionally show a message if max is exceeded on attempt to add
        console.warn(`Cannot add member, maximum limit of ${props.maxMembers} reached.`);
    }
  }
  selectedMember.value = ''; // Reset selection dropdown
};

// Watcher to enforce max members limit (e.g., if prop changes unexpectedly)
watch(() => props.selectedMembers, (newMembers) => {
  if (newMembers.length > props.maxMembers) {
    // This shouldn't happen if the addMember logic is correct, but acts as a safeguard
    emit('update:members', newMembers.slice(0, props.maxMembers));
  }
}, { deep: true });

onMounted(() => {
  selectedMember.value = ''; // Ensure reset on mount
});
</script>

<style scoped>
.form-label.small {
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
    color: var(--bs-secondary);
}
.form-text {
    font-size: 0.8em;
}
</style>