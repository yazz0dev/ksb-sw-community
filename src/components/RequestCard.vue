<template>
    <div class="bg-surface shadow overflow-hidden sm:rounded-lg p-4 sm:p-6 border border-border">
        <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <!-- Use EventDisplayCard for the main content -->
            <EventDisplayCard :event="event" :nameCache="nameCache" />
            
            <!-- Action buttons with consistent styling -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                <button 
                    @click="onApprove" 
                    :disabled="isProcessing"
                    class="px-4 py-2 bg-success text-white rounded-md hover:bg-success-dark focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Approve
                </button>
                <button 
                    @click="onReject" 
                    :disabled="isProcessing"
                    class="px-4 py-2 bg-error text-white rounded-md hover:bg-error-dark focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Reject
                </button>
                <button 
                    @click="onDelete" 
                    :disabled="isProcessing"
                    class="px-4 py-2 bg-error text-white rounded-md hover:bg-error-dark focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Delete
                </button>
            </div>
        </div>
        <!-- Conflict Warning -->
        <div v-if="conflictWarning" class="mt-2 rounded-md bg-warning-extraLight p-2 text-xs text-warning-text border border-warning-light">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            Warning: Date conflict with "{{ conflictWarning }}"
        </div>
    </div>
</template>

<script setup>
import EventDisplayCard from './EventDisplayCard.vue'; // Import the new display card

const props = defineProps({
    event: { type: Object, required: true },
    nameCache: { type: Object, required: true },
    conflictWarning: { type: String, default: null },
    isProcessing: { type: Boolean, required: true },
    processingAction: { type: String, default: '' }
});

const emit = defineEmits(['approve', 'reject', 'delete']);

// Button click handlers that emit events
const onApprove = () => emit('approve', props.event.id);
const onReject = () => emit('reject', props.event.id);
const onDelete = () => emit('delete', props.event.id);

</script>

<style scoped>
/* Add any specific styles for the card if needed */
</style> 