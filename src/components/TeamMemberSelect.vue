<template>
  <div>
    <div class="relative">
      <label class="block text-sm font-medium text-text-secondary mb-1">
        Add Team Members 
        <span class="text-error">*</span>
        <span class="text-xs text-text-disabled ml-1">({{ selectedMembers.length }}/{{ maxMembers }} members)</span>
      </label>
      <div class="flex">
        <select
          v-model="selectedMember"
          class="block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100"
          :disabled="isSubmitting || selectedMembers.length >= maxMembers"
          @change="addMember"
        >
          <option value="">Select a member...</option>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue';

const props = defineProps({
  selectedMembers: {
    type: Array as () => string[],
    required: true
  },
  availableStudents: {
    type: Array as () => { uid: string }[],
    required: true
  },
  nameCache: {
    type: Object as () => Record<string, string>,
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

const addMember = () => {
  if (selectedMember.value && !props.selectedMembers.includes(selectedMember.value)) {
    const newMembers = [...props.selectedMembers, selectedMember.value];
    if (newMembers.length <= props.maxMembers) {
      emit('update:members', newMembers);
    }
  }
  selectedMember.value = ''; // Reset selection
};

watch(() => props.selectedMembers, (newMembers) => {
  if (newMembers.length > props.maxMembers) {
    emit('update:members', newMembers.slice(0, props.maxMembers));
  }
}, { deep: true });
</script>
