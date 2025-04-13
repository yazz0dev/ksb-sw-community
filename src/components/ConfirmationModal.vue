<!-- src/components/ConfirmationModal.vue -->
<template>
  <CModal :is-open="visible" @close="$emit('close')" :initial-focus-ref="cancelButtonRef" is-centered>
    <CModalOverlay />
    <CModalContent bg="var(--color-surface)" borderRadius="lg" mx="4">
      <CModalHeader 
        fontSize="lg" 
        fontWeight="medium" 
        color="var(--color-text-primary)" 
        borderBottomWidth="1px" 
        borderColor="var(--color-border)"
        pb="4"
      >
        {{ title }}
      </CModalHeader>
      <CModalCloseButton color="var(--color-text-secondary)" />
      <CModalBody py="6">
        <CFlex align="start">
          <CBox 
            d="flex" 
            alignItems="center" 
            justifyContent="center" 
            h="10" 
            w="10" 
            borderRadius="full" 
            bg="var(--color-error-light)" 
            mr="4" 
            flexShrink="0"
          >
            <CIcon name="fa-exclamation-triangle" color="var(--color-error-dark)" fontSize="lg" />
          </CBox>
          <CText fontSize="sm" color="var(--color-text-secondary)">
            {{ message }}
          </CText>
        </CFlex>
      </CModalBody>

      <CModalFooter 
        borderTopWidth="1px" 
        borderColor="var(--color-border)" 
        bg="var(--color-background)" 
        borderBottomRadius="lg"
      >
        <CButton 
          @click="$emit('cancel')" 
          ref="cancelButtonRef" 
          variant="outline" 
          borderColor="var(--color-border)" 
          color="var(--color-text-secondary)" 
          :_hover="{ bg: 'var(--color-neutral-light)' }"
          size="sm"
          mr="3"
        >
          {{ cancelText }}
        </CButton>
        <CButton 
          @click="$emit('confirm')" 
          colorScheme="red" 
          bg="var(--color-error)" 
          color="var(--color-error-text)" 
          :_hover="{ bg: 'var(--color-error-dark)' }"
          size="sm"
        >
          {{ confirmText }}
        </CButton>
      </CModalFooter>
    </CModalContent>
  </CModal>
</template>

<script setup>
import { ref } from 'vue';
import {
  CModal,
  CModalOverlay,
  CModalContent,
  CModalHeader,
  CModalFooter,
  CModalBody,
  CModalCloseButton,
  CButton,
  CIcon,
  CText,
  CFlex,
  CBox,
} from '@chakra-ui/vue-next';

defineProps({
  visible: Boolean, // Renamed from isOpen to match original prop name
  title: String,
  message: String,
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  }
});

defineEmits(['confirm', 'cancel', 'close']);

const cancelButtonRef = ref(); // Ref for initial focus
</script>
