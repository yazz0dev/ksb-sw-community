// src/components/forms/TeamMemberSelect.vue
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
      <option
        v-for="student in availableStudentsForDropdown"
        :key="student.uid"
        :value="student.uid"
      >
        {{ student.name || `UID: ${student.uid.substring(0,6)}...` }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
// No need to import useUserStore if not directly used for fetching here.
// Name is passed via availableStudents prop.
import { UserData } from '@/types/student'; // Correctly import UserData

interface Props {
  selectedMembers: string[];
  availableStudents: UserData[]; // Expect UserData array
  isSubmitting: boolean;
  minMembers?: number;
  maxMembers?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minMembers: 2,
  maxMembers: 8,
  selectedMembers: () => [],
  availableStudents: () => [],
});

const emit = defineEmits(['update:members']);

const selectedMemberToAdd = ref('');

const availableStudentsForDropdown = computed(() => {
    const selectedSet = new Set(props.selectedMembers);
    return props.availableStudents.filter(student => student?.uid && !selectedSet.has(student.uid));
});

const addMember = () => {
  if (selectedMemberToAdd.value && !props.selectedMembers.includes(selectedMemberToAdd.value)) {
    const newMembers = [...props.selectedMembers, selectedMemberToAdd.value];
    if (newMembers.length <= props.maxMembers) {
      emit('update:members', newMembers);
    } else {
        console.warn(`Maximum team members (${props.maxMembers}) reached.`);
    }
  }
  selectedMemberToAdd.value = '';
};

watch(() => props.selectedMembers, (newMembers) => {
  if (newMembers.length > props.maxMembers) {
    emit('update:members', newMembers.slice(0, props.maxMembers));
  }
}, { deep: true });

watch(() => props.availableStudents, () => {
    selectedMemberToAdd.value = '';
}, { deep: true, immediate: true });

onMounted(() => {
  selectedMemberToAdd.value = '';
});
</script>

<style scoped>
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