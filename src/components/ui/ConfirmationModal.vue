<!-- src/components/ui/ConfirmationModal.vue -->
<template>
  <Teleport to="body">
    <div 
        ref="modalEl"
        class="modal fade confirmation-modal" 
        :class="`variant-${variant}`"
        :id="modalId" 
        tabindex="-1" 
        :aria-labelledby="`${modalId}Label`"
        role="dialog"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        aria-hidden="true"
    >
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" :id="`${modalId}Label`">
                        <i v-if="modalIcon" :class="modalIcon"></i>
                        {{ title }}
                    </h5>
                    <button 
                        type="button" 
                        class="btn-close" 
                        data-bs-dismiss="modal" 
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    <slot>
                        <p class="mb-0">{{ message }}</p>
                    </slot>
                </div>
                <div class="modal-footer">
                    <button 
                        type="button" 
                        class="btn btn-secondary" 
                        data-bs-dismiss="modal"
                    >
                        {{ cancelText }}
                    </button>
                    <button 
                        type="button" 
                        class="btn"
                        :class="confirmButtonClass"
                        @click="handleConfirm"
                    >
                        <i v-if="confirmIcon" :class="confirmIcon" class="me-1"></i>
                        {{ confirmText }}
                    </button>
                </div>
            </div>
        </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Modal } from 'bootstrap';

interface Props {
  modalId: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger'
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const modalEl = ref<HTMLElement | null>(null);
let modalInstance: Modal | null = null;

// Compute button class based on variant
const confirmButtonClass = computed(() => {
    const variant = props.variant || 'primary';
    return `btn-${variant}`;
});

// Compute icon based on variant
const modalIcon = computed(() => {
    switch (props.variant) {
        case 'danger': return 'fas fa-exclamation-triangle';
        case 'warning': return 'fas fa-exclamation-circle';
        case 'success': return 'fas fa-check-circle';
        case 'info': return 'fas fa-info-circle';
        default: return 'fas fa-info-circle';
    }
});

const confirmIcon = computed(() => {
    switch (props.variant) {
        case 'danger': return 'fas fa-trash';
        case 'warning': return 'fas fa-exclamation-triangle';
        case 'success': return 'fas fa-check';
        default: return 'fas fa-check';
    }
});

// Default values
const confirmText = props.confirmText || 'Confirm';
const cancelText = props.cancelText || 'Cancel';

const handleConfirm = () => {
    if (modalInstance) {
        modalInstance.hide();
    }
    emit('confirm');
};

const handleCancel = () => {
    emit('cancel');
};

onMounted(() => {
    if (modalEl.value) {
        modalInstance = new Modal(modalEl.value, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });
        
        // Fix aria-hidden accessibility issue
        modalEl.value.addEventListener('shown.bs.modal', () => {
            if (modalEl.value) {
                modalEl.value.removeAttribute('aria-hidden');
            }
        });
        
        modalEl.value.addEventListener('hidden.bs.modal', () => {
            if (modalEl.value) {
                modalEl.value.setAttribute('aria-hidden', 'true');
            }
        });
        
        // Additional event to handle show start
        modalEl.value.addEventListener('show.bs.modal', () => {
            if (modalEl.value) {
                modalEl.value.removeAttribute('aria-hidden');
            }
        });
        
    } else {
        console.error(`[${props.modalId}] Could not find modal element to initialize.`);
    }
});

onUnmounted(() => {
    if (modalInstance) {
        modalInstance.dispose();
    }
});

// Expose show/hide methods to parent
defineExpose({
    show: () => {
        if (modalInstance) {
            modalInstance.show();
        } else {
            console.error(`[${props.modalId}] show() called, but modal instance is not initialized.`);
        }
    },
    hide: () => {
        if (modalInstance) {
            modalInstance.hide();
        } else {
            console.error(`[${props.modalId}] hide() called, but modal instance is not initialized.`);
        }
    }
});
</script>

<style>
/* Styles specific to .confirmation-modal structure, not general modal overrides */

.confirmation-modal .modal-content {
    background-color: var(--bs-body-bg);
    border: 1px solid var(--bs-border-color-translucent);
    /* z-index and position are handled by Bootstrap/global SCSS */
}

.confirmation-modal .btn-close {
    font-size: 1.1rem;
    opacity: 0.6;
    transition: opacity 0.2s ease;
}

.confirmation-modal .btn-close:hover {
    opacity: 1;
}

.confirmation-modal .modal-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
}

/* Responsive modal footer layout */
@media (max-width: 576px) {
    .confirmation-modal .btn-sm-mobile {
        font-size: 0.875rem;
    }
    
    .confirmation-modal .modal-footer {
        flex-direction: column-reverse;
        gap: 0.5rem !important;
    }
    
    .confirmation-modal .modal-footer .btn {
        width: 100%;
    }
}

@media (min-width: 577px) {
    .confirmation-modal .btn-sm-mobile {
        font-size: 0.9rem;
    }
}
</style>
