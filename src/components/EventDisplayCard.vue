<template>
    <!-- Increased spacing, using theme colors -->
    <div class="min-w-0 flex-1 space-y-2">
       <h3 class="text-xl font-semibold text-gray-800 mb-1">{{ event.eventName }} <span class="font-normal text-gray-500">({{ event.eventType }})</span></h3>

       <!-- Details Section with improved layout -->
       <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
           <p><strong class="font-medium text-gray-700 mr-1">Requested by:</strong> {{ nameCache[event.requester] || '(Name unavailable)' }}</p>
           <p><strong class="font-medium text-gray-700 mr-1">Dates:</strong> {{ formatDate(event.startDate || event.desiredStartDate) }} - {{ formatDate(event.endDate || event.desiredEndDate) }}</p>
           <p><strong class="font-medium text-gray-700 mr-1">Team Event:</strong> {{ event.isTeamEvent ? 'Yes' : 'No' }}</p>
           <p v-if="showStatus && event.status">
               <strong class="font-medium text-gray-700 mr-1">Status:</strong>
               <span :class="statusClass">{{ event.status }}</span>
           </p>
       </div>

       <p v-if="event.organizers && event.organizers.length > 0" class="text-sm text-gray-600">
           <strong class="font-medium text-gray-700">Co-Organizers:</strong>
           <span v-for="(orgId, idx) in event.organizers" :key="orgId">
               {{ nameCache[orgId] || '(Name unavailable)' }}{{ idx < event.organizers.length - 1 ? ', ' : '' }}
           </span>
       </p>

       <p v-if="showStatus && event.status === 'Rejected' && event.rejectionReason" class="text-sm text-red-700 mt-1 bg-red-50 p-2 rounded-md border border-red-100">
           <strong class="font-medium">Rejection Reason:</strong> {{ event.rejectionReason }}
       </p>

       <!-- Description -->
       <div class="pt-2">
           <strong class="block text-sm font-medium text-gray-700 mb-1">Description:</strong>
           <p class="text-sm text-gray-600 prose prose-sm max-w-none">{{ event.description }}</p> <!-- Using prose for potential markdown -->
       </div>

       <!-- Display XP/Constraint Info with better styling -->
       <div v-if="event.xpAllocation && event.xpAllocation.length > 0" class="mt-3 pt-3 border-t border-secondary">
           <strong class="block text-sm font-medium text-gray-700 mb-1">Rating Criteria & XP:</strong>
           <ul class="space-y-1 text-sm text-gray-600">
               <li v-for="(alloc, index) in event.xpAllocation" :key="index" class="flex items-center">
                   <i class="fas fa-star text-yellow-400 mr-2 text-xs"></i>
                   <span>{{ alloc.constraintLabel || 'Unnamed Criteria' }}: <span class="font-medium">{{ alloc.points }} XP</span> <span class="text-xs text-gray-500">({{ formatRoleName(alloc.role) }})</span></span>
               </li>
           </ul>
       </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { defineProps } from 'vue';
import { formatRoleName } from '../utils/formatters';

const props = defineProps({
    event: { type: Object, required: true },
    nameCache: { type: Object, required: true },
    showStatus: { type: Boolean, default: false } // Prop to control status visibility
});

// Robust Date Formatting
const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    let date;
    if (typeof dateInput.toDate === 'function') date = dateInput.toDate();
    else if (dateInput instanceof Date) date = dateInput;
    else date = new Date(dateInput);

    if (isNaN(date.getTime())) return 'Invalid Date';
    try {
        return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    } catch (error) { return 'Formatting Error'; }
};

// Status class computation - using Tailwind colors directly
const statusClass = computed(() => {
    switch (props.event?.status) {
        case 'Approved': return 'font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-xs';
        case 'Pending': return 'font-medium text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-xs';
        case 'Ongoing': return 'font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full text-xs';
        case 'Rejected': return 'font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-xs';
        case 'Completed': return 'font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full text-xs'; // Adjusted Completed style
        default: return 'font-medium text-gray-500';
    }
});

</script>

<style scoped>
/* Using prose class handles most description formatting */
</style> 