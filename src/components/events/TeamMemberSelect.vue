<template>
  <div class="mb-3">
    <label class="form-label small text-secondary">
      Add Team Members
      <span class="text-danger">*</span>
      <span class="text-muted ms-1">
        ({{ selectedMembers.length }}/{{ maxMembers }} members)
      </span>
    </label>
    <select
      class="form-select"
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
        {{ nameCache[student.uid] || student.uid }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

interface Props {
  selectedMembers: string[];
  availableStudents: { uid: string }[];
  nameCache: Record<string, string>;
  isSubmitting: boolean;
  minMembers?: number;
  maxMembers?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minMembers: 2,
  maxMembers: 10
});

const emit = defineEmits(['update:members']);

const selectedMember = ref('');

const addMember = () => {
  if (selectedMember.value && !props.selectedMembers.includes(selectedMember.value)) {
    const newMembers = [...props.selectedMembers, selectedMember.value];
    if (newMembers.length <= props.maxMembers) {
      emit('update:members', newMembers);
    }
  }
  selectedMember.value = ''; // Reset selection
};

// Enforce max members limit
watch(() => props.selectedMembers, (newMembers) => {
  if (newMembers.length > props.maxMembers) {
    emit('update:members', newMembers.slice(0, props.maxMembers));
  }
}, { deep: true });

onMounted(() => {
  selectedMember.value = ''; // Reset selection on mount
});
</script>

