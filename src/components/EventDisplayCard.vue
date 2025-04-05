<template>
    <!-- Increased spacing, using theme colors -->
    <div class="min-w-0 flex-1 space-y-2">
       <h3 class="text-xl font-semibold text-text-primary mb-1">{{ event.eventName }} <span class="font-normal text-text-secondary">({{ event.eventType }})</span></h3>

       <!-- Details Section with improved layout -->
       <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-text-secondary">
           <p><strong class="font-medium text-text-primary mr-1">Requested by:</strong> {{ nameCache[event.requester] || '(Name unavailable)' }}</p>
           <p><strong class="font-medium text-text-primary mr-1">Dates:</strong> {{ formatDate(event.startDate || event.desiredStartDate) }} - {{ formatDate(event.endDate || event.desiredEndDate) }}</p>
           <p><strong class="font-medium text-text-primary mr-1">Team Event:</strong> {{ event.isTeamEvent ? 'Yes' : 'No' }}</p>
           <p v-if="showStatus && event.status">
               <strong class="font-medium text-text-primary mr-1">Status:</strong>
               <span :class="statusClass">{{ event.status }}</span>
           </p>
       </div>

       <p v-if="event.organizers && event.organizers.length > 0" class="text-sm text-text-secondary">
           <strong class="font-medium text-text-primary">Co-Organizers:</strong>
           <span v-for="(orgId, idx) in event.organizers" :key="orgId">
               {{ nameCache[orgId] || '(Name unavailable)' }}{{ idx < event.organizers.length - 1 ? ', ' : '' }}
           </span>
       </p>

       <p v-if="showStatus && event.status === 'Rejected' && event.rejectionReason" class="text-sm text-error-text mt-1 bg-error-extraLight p-2 rounded-md border border-error-light">
           <strong class="font-medium">Rejection Reason:</strong> {{ event.rejectionReason }}
       </p>

       <!-- Description -->
       <div class="pt-2">
           <strong class="block text-sm font-medium text-text-primary mb-1">Description:</strong>
           <p class="text-sm text-text-secondary prose prose-sm max-w-none">{{ event.description }}</p> <!-- Using prose for potential markdown -->
       </div>

       <!-- Display XP/Constraint Info with better styling -->
       <div v-if="event.xpAllocation && event.xpAllocation.length > 0" class="mt-3 pt-3 border-t border-border">
           <strong class="block text-sm font-medium text-text-primary mb-1">Rating Criteria & XP:</strong>
           <ul class="space-y-1 text-sm text-text-secondary">
               <li v-for="(alloc, index) in event.xpAllocation" :key="index" class="flex items-center">
                   <i class="fas fa-star text-yellow-400 mr-2 text-xs"></i> <!-- Keep specific yellow for star icon -->
                   <span>{{ alloc.constraintLabel || 'Unnamed Criteria' }}: <span class="font-medium">{{ alloc.points }} XP</span> <span class="text-xs text-text-secondary">({{ formatRoleName(alloc.role) }})</span></span>
               </li>
           </ul>
       </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
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

// Status class computation - using theme state colors
const statusClass = computed(() => {
    const baseClasses = 'font-medium px-2 py-0.5 rounded-full text-xs';
    switch (props.event?.status) {
        case 'Approved': return `${baseClasses} text-success-text bg-success-light`;
        case 'Pending': return `${baseClasses} text-warning-text bg-warning-light`;
        case 'Rejected': return `${baseClasses} text-error-text bg-error-light`;
        default: return `${baseClasses} text-info-text bg-info-light`;
    }
});

</script>
