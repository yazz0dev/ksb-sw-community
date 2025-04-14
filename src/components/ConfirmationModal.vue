<!-- src/components/ConfirmationModal.vue -->
<template>
  <Teleport to="body">
    <div 
      class="modal fade" 
      :class="{ 'show d-block': visible }" 
      tabindex="-1" 
      :aria-labelledby="modalId + 'Label'" 
      :aria-hidden="!visible"
      role="dialog"
      @click.self="closeModal" 
    >
      <div class="modal-dialog modal-dialog-centered" style="max-width: 480px;">
        <div class="modal-content" style="background-color: var(--bs-body-bg); border-radius: var(--bs-border-radius);">
          <div class="modal-header" style="border-bottom: 1px solid var(--bs-border-color);">
            <h6 class="modal-title fs-6 fw-medium" :id="modalId + 'Label'" style="color: var(--bs-body-color);">
              {{ title }}
            </h6>
            <button type="button" class="btn-close" aria-label="Close" @click="closeModal"></button>
          </div>
          <div class="modal-body py-4">
            <div class="d-flex align-items-start">
              <div class="flex-shrink-0 me-3">
                <span 
                  class="icon-wrapper d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger-emphasis rounded-circle"
                  style="height: 2.5rem; width: 2.5rem;"
                >
                  <i class="fas fa-exclamation-triangle fa-lg"></i>
                </span>
              </div>
              <div class="flex-grow-1">
                <p class="small" style="color: var(--bs-secondary-color);">
                  {{ message }}
                </p>
              </div>
            </div>
          </div>
          <div 
            class="modal-footer justify-content-end"
            style="background-color: var(--bs-tertiary-bg); border-top: 1px solid var(--bs-border-color); border-bottom-left-radius: var(--bs-border-radius); border-bottom-right-radius: var(--bs-border-radius);"
          >
            <button 
              type="button"
              class="btn btn-sm btn-outline-secondary me-2"
              @click="cancelAction"
              ref="cancelButtonRef"
            >
              {{ cancelText }}
            </button>
            <button 
              type="button"
              class="btn btn-sm btn-danger"
              @click="confirmAction"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Backdrop -->
    <div v-if="visible" class="modal-backdrop fade show"></div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel'
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
}>();

const cancelButtonRef = ref<HTMLButtonElement | null>(null);
const modalId = computed(() => `confirmationModal-${Math.random().toString(36).substring(2, 9)}`);

const confirmAction = (): void => {
  emit('confirm');
  closeModal();
};

const cancelAction = (): void => {
  emit('cancel');
  closeModal();
};

const closeModal = (): void => {
  emit('close');
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (props.visible && event.key === 'Escape') {
    closeModal();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

watch(() => props.visible, (newValue: boolean) => {
  if (newValue) {
    nextTick(() => {
      cancelButtonRef.value?.focus();
    });
  }
});
</script>

<style scoped>
/* Ensure modal shows correctly */
.modal.show {
  display: block;
}

</style>
