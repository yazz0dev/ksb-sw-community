<template>
  <CBox>
    <CFormControl>
      <CFormLabel fontSize="sm" fontWeight="medium" color="text-secondary">
        Add Team Members
        <CText as="span" color="error">*</CText>
        <CText as="span" fontSize="xs" color="text-disabled" ml="1">
          ({{ selectedMembers.length }}/{{ maxMembers }} members)
        </CText>
      </CFormLabel>
      <CFlex>
        <CSelect
          v-model="selectedMember"
          w="full"
          :isDisabled="isSubmitting || selectedMembers.length >= maxMembers"
          @change="addMember"
          placeholder="Select a member..."
        >
          <option
            v-for="student in availableStudents"
            :key="student.uid"
            :value="student.uid"
            :disabled="selectedMembers.includes(student.uid)"
          >
            {{ nameCache[student.uid] || student.uid }}
          </option>
        </CSelect>
      </CFlex>
    </CFormControl>
  </CBox>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Box as CBox,
  Flex as CFlex,
  FormControl as CFormControl,
  FormLabel as CFormLabel,
  Select as CSelect,
  Text as CText
} from '@chakra-ui/vue-next';

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
