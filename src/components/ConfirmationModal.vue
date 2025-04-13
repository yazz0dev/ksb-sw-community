<!-- src/components/ConfirmationModal.vue -->
<template>
  <div class="modal" :class="{ 'is-active': visible }">
    <div class="modal-background" @click="closeModal"></div>
    <div class="modal-card" style="background-color: var(--color-surface); border-radius: 6px; max-width: 480px;">
      <header class="modal-card-head" style="background-color: var(--color-surface); border-bottom: 1px solid var(--color-border);">
        <p class="modal-card-title is-size-6 has-text-weight-medium" style="color: var(--color-text-primary);">
          {{ title }}
        </p>
        <button class="delete" aria-label="close" @click="closeModal" style="background-color: transparent;"></button>
      </header>
      <section class="modal-card-body py-6">
        <div class="media is-align-items-flex-start">
          <div class="media-left">
            <span 
              class="icon is-large has-text-danger is-flex is-align-items-center is-justify-content-center"
              style="height: 2.5rem; width: 2.5rem; border-radius: 50%; background-color: var(--color-error-light);"
            >
              <i class="fas fa-exclamation-triangle fa-lg" style="color: var(--color-error-dark);"></i>
            </span>
          </div>
          <div class="media-content">
            <p class="is-size-7" style="color: var(--color-text-secondary);">
              {{ message }}
            </p>
          </div>
        </div>
      </section>
      <footer 
        class="modal-card-foot is-justify-content-flex-end"
        style="background-color: var(--color-background); border-top: 1px solid var(--color-border); border-bottom-left-radius: 6px; border-bottom-right-radius: 6px;"
      >
        <button 
          class="button is-small is-outlined mr-2"
          @click="cancelAction"
          ref="cancelButtonRef"
          style="border-color: var(--color-border); color: var(--color-text-secondary);"
        >
          {{ cancelText }}
        </button>
        <button 
          class="button is-danger is-small"
          @click="confirmAction"
          style="background-color: var(--color-error); color: var(--color-error-text);"
        >
          {{ confirmText }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  visible: Boolean,
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

const emit = defineEmits(['confirm', 'cancel', 'close']);

const cancelButtonRef = ref(null);

const confirmAction = () => {
  emit('confirm');
  closeModal(); // Close modal after confirming
};

const cancelAction = () => {
  emit('cancel');
  closeModal(); // Close modal after cancelling
};

const closeModal = () => {
  emit('close');
};

// Add keyboard listener for Escape key
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// Watch for visibility change to focus the cancel button
watch(() => props.visible, (newValue) => {
  if (newValue) {
    // Use nextTick to ensure the element is in the DOM
    nextTick(() => {
      cancelButtonRef.value?.focus();
    });
  }
});
</script>

<style scoped>
.modal-card {
  overflow: hidden; /* Prevent content bleed */
}

.modal-card-foot.is-justify-content-flex-end {
  justify-content: flex-end;
}

/* Adjust button hover styles if needed */
.button.is-outlined:hover {
  background-color: var(--color-neutral-light);
}
.button.is-danger:hover {
  background-color: var(--color-error-dark);
}
</style>
