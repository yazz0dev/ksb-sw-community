<template>
    <div class="content" style="margin-top: 0.5rem;">
       <h3 class="title is-4 has-text-primary mb-1">
           {{ event.eventName }} 
           <span class="has-text-weight-normal has-text-grey">({{ event.eventType }})</span>
       </h3>

       <!-- Details Section with Bulma columns -->
       <div class="columns is-multiline is-variable is-2 is-size-7 has-text-grey">
           <div class="column is-half-tablet is-full-mobile py-1">
               <strong class="has-text-weight-medium has-text-dark mr-1">Requested by:</strong> {{ nameCache[event.requester] || '(Name unavailable)' }}
           </div>
           <div class="column is-half-tablet is-full-mobile py-1">
               <strong class="has-text-weight-medium has-text-dark mr-1">Dates:</strong> {{ formatDate(event.startDate || event.desiredStartDate) }} - {{ formatDate(event.endDate || event.desiredEndDate) }}
           </div>
           <div class="column is-half-tablet is-full-mobile py-1">
               <strong class="has-text-weight-medium has-text-dark mr-1">Team Event:</strong> {{ event.isTeamEvent ? 'Yes' : 'No' }}
           </div>
           <div class="column is-half-tablet is-full-mobile py-1" v-if="showStatus && event.status">
               <strong class="has-text-weight-medium has-text-dark mr-1">Status:</strong>
               <span :class="['tag', statusColorScheme.class, 'is-rounded', 'is-light']">{{ event.status }}</span>
           </div>
       </div>

       <p v-if="event.organizers && event.organizers.length > 0" class="is-size-7 has-text-grey mt-1">
           <strong class="has-text-weight-medium has-text-dark">Co-Organizers:</strong>
           <span v-for="(orgId, idx) in event.organizers" :key="orgId">
               {{ nameCache[orgId] || '(Name unavailable)' }}{{ idx < event.organizers.length - 1 ? ', ' : '' }}
           </span>
       </p>

       <div 
         v-if="showStatus && event.status === 'Rejected' && event.rejectionReason" 
         class="notification is-danger is-light is-size-7 mt-2 p-2"
         style="border-radius: 4px; border: 1px solid var(--color-error-light);"
       >
         <span class="icon has-text-danger mr-1">
           <i class="fas fa-exclamation-triangle"></i>
         </span>
         <strong class="has-text-weight-medium">Rejection Reason:</strong> {{ event.rejectionReason }}
       </div>

       <!-- Description -->
       <div class="pt-2">
           <strong class="is-block is-size-7 has-text-weight-medium has-text-dark mb-1">Description:</strong>
           <p class="is-size-7 has-text-grey">{{ event.description }}</p> 
       </div>

       <!-- Display XP/Constraint Info -->
       <div v-if="event.xpAllocation && event.xpAllocation.length > 0" class="mt-3 pt-3" style="border-top: 1px solid var(--color-border);">
           <strong class="is-block is-size-7 has-text-weight-medium has-text-dark mb-1">Rating Criteria & XP:</strong>
           <ul class="is-size-7 has-text-grey">
               <li v-for="(alloc, index) in event.xpAllocation" :key="index" class="is-flex is-align-items-center mb-1">
                   <span class="icon has-text-warning mr-2" style="font-size: 0.8em;">
                     <i class="fas fa-star"></i> 
                   </span>
                   <span>{{ alloc.constraintLabel || 'Unnamed Criteria' }}: <span class="has-text-weight-medium">{{ alloc.points }} XP</span> <span class="is-size-7 has-text-grey">({{ formatRoleName(alloc.role) }})</span></span>
               </li>
           </ul>
       </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatRoleName } from '../utils/formatters';
// Removed Chakra UI imports

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

// Status color scheme computation using Bulma classes
const statusColorScheme = computed(() => {
  switch (props.event?.status) {
    case 'Approved':
    case 'Upcoming':
      return { class: 'is-success' };
    case 'Pending':
      return { class: 'is-warning' };
    case 'Rejected':
      return { class: 'is-danger' };
    case 'In Progress':
    case 'Ongoing':
      return { class: 'is-info' }; // Used is-info for ongoing
    case 'Completed':
    case 'Cancelled': 
      return { class: 'is-light' }; // Used is-light for completed/cancelled
    default:
      return { class: 'is-light' }; // Default fallback
  }
});

</script>

<style scoped>
/* Ensure columns have minimal padding */
.columns.is-variable.is-2 .column {
  padding-top: 0.25rem;    /* Adjust vertical padding */
  padding-bottom: 0.25rem; 
}

.py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}
.pt-2 {
  padding-top: 0.5rem;
}
.mb-1 {
  margin-bottom: 0.25rem;
}
.mt-1 {
  margin-top: 0.25rem;
}
.mt-2 {
  margin-top: 0.5rem;
}
.mt-3 {
  margin-top: 0.75rem;
}
.pt-3 {
  padding-top: 0.75rem;
}
.p-2 {
  padding: 0.5rem;
}
.mr-1 {
  margin-right: 0.25rem;
}
.mr-2 {
  margin-right: 0.5rem;
}

/* Ensure list has no default styling */
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
