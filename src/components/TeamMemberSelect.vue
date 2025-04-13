<template>
  <div class="field">
    <label class="label is-small has-text-grey">
      Add Team Members
      <span class="has-text-danger">*</span>
      <span class="is-size-7 has-text-grey-light ml-1">
        ({{ selectedMembers.length }}/{{ maxMembers }} members)
      </span>
    </label>
    <div class="control is-expanded">
      <div class="select is-fullwidth">
        <select
          v-model="selectedMember"
          :disabled="isSubmitting || selectedMembers.length >= maxMembers"
          @change="addMember"
        >
          <option value="" disabled selected>Select a member...</option>
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
  selectedMember.value = '';
};

watch(() => props.selectedMembers, (newMembers) => {
  if (newMembers.length > props.maxMembers) {
    emit('update:members', newMembers.slice(0, props.maxMembers));
  }
}, { deep: true });

onMounted(() => {
  selectedMember.value = '';
});
</script>

<style scoped>
select:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
