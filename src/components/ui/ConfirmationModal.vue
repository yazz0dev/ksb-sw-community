<!-- src/components/ui/ConfirmationModal.vue -->
<template>
    <div 
        class="modal fade" 
        :id="modalId" 
        tabindex="-1" 
        :aria-labelledby="`${modalId}Label`"
        role="dialog"
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
                        class="btn-close btn-close-lg" 
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
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';

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

let modalInstance: any = null;

const handleConfirm = () => {
    if (modalInstance) {
        modalInstance.hide();
    }
    emit('confirm');
};

onMounted(() => {
    // Initialize Bootstrap modal if Bootstrap is available
    const Modal: any = window.bootstrap && window.bootstrap.Modal;
    if (Modal) {
        const modalEl = document.getElementById(props.modalId);
        if (modalEl) {
            modalInstance = new Modal(modalEl, {
                backdrop: 'static',
                keyboard: false
            });

            // Handle modal cleanup when hidden
            modalEl.addEventListener('hidden.bs.modal', () => {
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
            });
        }
    }
});

onUnmounted(() => {
    if (modalInstance && typeof modalInstance.dispose === 'function') {
        modalInstance.dispose();
    }
});

// Expose show/hide methods to parent
defineExpose({
    show: () => modalInstance?.show(),
    hide: () => modalInstance?.hide()
});
</script>

<style scoped>
.modal-content {
    background: var(--bs-card-bg);
    border: 1px solid var(--bs-border-color);
}

.btn-close-lg {
    font-size: 1.1rem;
    opacity: 0.6;
    transition: opacity 0.2s ease;
}

.btn-close-lg:hover {
    opacity: 1;
}

.modal-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
}

/* Responsive button sizing */
@media (max-width: 576px) {
    .btn-sm-mobile {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
    }
    
    .modal-footer {
        flex-direction: column-reverse;
        gap: 0.5rem !important;
    }
    
    .modal-footer .btn {
        width: 100%;
    }
}

@media (min-width: 577px) {
    .btn-sm-mobile {
        font-size: 0.9rem;
        padding: 0.5rem 1.25rem;
    }
}
</style>
