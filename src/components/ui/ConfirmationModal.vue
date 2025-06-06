<!-- src/components/ui/ConfirmationModal.vue -->
<template>
  <Teleport to="body">
    <div 
        ref="modalEl"
        class="modal fade confirmation-modal" 
        :id="modalId" 
        tabindex="-1" 
        :aria-labelledby="`${modalId}Label`"
        role="dialog"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
    >
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4 shadow-lg border-0">
                <div class="modal-header border-0 pb-2">
                    <h5 class="modal-title h5 fw-semibold text-dark" :id="`${modalId}Label`">
                        <i v-if="modalIcon" :class="modalIcon" class="me-2"></i>
                        {{ title }}
                    </h5>
                    <button 
                        type="button" 
                        class="btn-close" 
                        data-bs-dismiss="modal" 
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body py-3">
                    <slot>
                        <p class="text-secondary mb-0 lh-base">{{ message }}</p>
                    </slot>
                </div>
                <div class="modal-footer border-0 pt-2 gap-2">
                    <button 
                        type="button" 
                        class="btn btn-secondary btn-sm-mobile" 
                        data-bs-dismiss="modal"
                    >
                        {{ cancelText }}
                    </button>
                    <button 
                        type="button" 
                        class="btn btn-sm-mobile"
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
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { Modal } from 'bootstrap';

const props = defineProps<{
    modalId: string;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
}>();

const emit = defineEmits<{
    (e: 'confirm'): void;
}>();

const modalEl = ref<HTMLElement | null>(null);

// Compute button class based on variant
const confirmButtonClass = computed(() => {
    const variant = props.variant || 'primary';
    return `btn-${variant}`;
});

// Compute icon based on variant
const modalIcon = computed(() => {
    switch (props.variant) {
        case 'danger': return 'fas fa-exclamation-triangle text-danger';
        case 'warning': return 'fas fa-exclamation-circle text-warning';
        case 'success': return 'fas fa-check-circle text-success';
        default: return 'fas fa-info-circle text-primary';
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

let modalInstance: Modal | null = null;

const handleConfirm = () => {
    if (modalInstance) {
        modalInstance.hide();
    }
    emit('confirm');
};

onMounted(() => {
    if (modalEl.value) {
        modalInstance = new Modal(modalEl.value, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });
        
        // Ensure modal appears on top of everything
        modalEl.value.addEventListener('shown.bs.modal', () => {
            modalEl.value?.style.setProperty('z-index', '1060', 'important');
            // Find and set backdrop z-index
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.style.setProperty('z-index', '1059', 'important');
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
    modalInstance = null;
});

// Expose show/hide methods to parent
defineExpose({
    show: () => {
        if (modalInstance) {
            modalInstance.show();
            // Force focus and z-index
            setTimeout(() => {
                if (modalEl.value) {
                    modalEl.value.style.setProperty('z-index', '1060', 'important');
                    modalEl.value.focus();
                }
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.style.setProperty('z-index', '1059', 'important');
                }
            }, 50);
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
/* Use global styles to override any scoped conflicts */
.confirmation-modal {
    z-index: 1060 !important;
}

.confirmation-modal .modal-backdrop {
    z-index: 1059 !important;
    background-color: rgba(0, 0, 0, 0.6) !important;
    opacity: 1 !important;
}

.confirmation-modal .modal-content {
    background: var(--bs-card-bg);
    border: 1px solid var(--bs-border-color);
    z-index: 1061 !important;
    position: relative;
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

/* Responsive button sizing */
@media (max-width: 576px) {
    .confirmation-modal .btn-sm-mobile {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
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
        padding: 0.5rem 1.25rem;
    }
}
</style>
