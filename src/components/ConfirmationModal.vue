<!-- src/components/ConfirmationModal.vue -->
<template>
    <div 
        class="modal fade" 
        :id="modalId" 
        tabindex="-1" 
        :aria-labelledby="`${modalId}Label`"
        role="dialog"
    >
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" :id="`${modalId}Label`">{{ title }}</h5>
                    <button 
                        type="button" 
                        class="btn-close" 
                        data-bs-dismiss="modal" 
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    <slot>{{ message }}</slot>
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
    variant?: 'danger' | 'warning' | 'primary';
}>();

const emit = defineEmits<{
    (e: 'confirm'): void;
}>();

// Compute button class based on variant
const confirmButtonClass = computed(() => {
    const variant = props.variant || 'primary';
    return `btn-${variant}`;
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
