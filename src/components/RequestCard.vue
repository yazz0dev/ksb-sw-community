<template>
    <div class="bg-white shadow overflow-hidden sm:rounded-lg p-4 sm:p-6 border border-gray-200">
        <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <!-- Use EventDisplayCard for the main content -->
            <EventDisplayCard :event="event" :nameCache="nameCache" />
            
            <!-- Action Buttons remain here -->
            <div class="flex space-x-2 items-start flex-shrink-0 mt-2 md:mt-0">
                 <button @click="onApprove" 
                         class="inline-flex items-center justify-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                         :disabled="isProcessing">
                     <!-- Approve Button Content -->
                     <svg v-if="isProcessing && processingAction === 'approve'" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     <i v-else class="fas fa-check h-3 w-3"></i>
                     <span class="ml-1 hidden sm:inline">Approve</span>
                 </button>
                 <button @click="onReject" 
                         class="inline-flex items-center justify-center rounded-md bg-yellow-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-yellow-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                         :disabled="isProcessing">
                     <!-- Reject Button Content -->
                     <svg v-if="isProcessing && processingAction === 'reject'" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     <i v-else class="fas fa-times h-3 w-3"></i>
                     <span class="ml-1 hidden sm:inline">Reject</span>
                 </button>
                 <button @click="onDelete" 
                         class="inline-flex items-center justify-center rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                         :disabled="isProcessing">
                      <!-- Delete Button Content -->
                     <svg v-if="isProcessing && processingAction === 'delete'" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     <i v-else class="fas fa-trash h-3 w-3"></i>
                     <span class="ml-1 hidden sm:inline">Delete</span>
                 </button>
             </div>
        </div>
        <!-- Conflict Warning -->
        <div v-if="conflictWarning" class="mt-2 rounded-md bg-yellow-50 p-2 text-xs text-yellow-700 border border-yellow-200">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            Warning: Date conflict with "{{ conflictWarning }}"
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
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