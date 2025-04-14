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
    <!-- Selected members are typically displayed in the parent component -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

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
  // Reset dropdown after selection
  selectedMember.value = ''; 
};

watch(() => props.selectedMembers, (newMembers) => {
  if (newMembers.length > props.maxMembers) {
    emit('update:members', newMembers.slice(0, props.maxMembers));
  }
}, { deep: true });

// Reset selection on mount
onMounted(() => {
  selectedMember.value = '';
});
</script>

