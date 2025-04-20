<template>
    <div class="event-display-card" style="margin-top: 0.5rem;">
       <h4 class="h4 text-primary mb-1">
           {{ event.details.eventName }} 
           <span class="fw-normal text-secondary">({{ event.details.type }})</span>
       </h4>

       <!-- Details Section with Bootstrap grid -->
       <div class="row g-1 fs-7 text-secondary">
           <div class="col-md-6 col-12 py-1">
               <strong class="fw-medium text-dark me-1">Requested by:</strong> {{ nameCache[event.requestedBy] || '(Name unavailable)' }}
           </div>
           <div class="col-md-6 col-12 py-1">
               <strong class="fw-medium text-dark me-1">Dates:</strong> {{ formatDate(event.details.date.start) }} - {{ formatDate(event.details.date.end) }}
           </div>
           <div class="col-md-6 col-12 py-1">
               <strong class="fw-medium text-dark me-1">Team Event:</strong> {{ event.details.format === 'Team' ? 'Yes' : 'No' }}
           </div>
           <div class="col-md-6 col-12 py-1" v-if="showStatus && event.status">
               <strong class="fw-medium text-dark me-1">Status:</strong>
               <span :class="['badge rounded-pill', statusColorScheme.class]">{{ event.status }}</span>
           </div>
       </div>

       <p v-if="event.details.organizers && event.details.organizers.length > 0" class="fs-7 text-secondary mt-1 mb-0">
           <strong class="fw-medium text-dark">Co-Organizers:</strong>
           <span v-for="(orgId, idx) in event.details.organizers" :key="orgId">
               {{ nameCache[orgId] || '(Name unavailable)' }}{{ idx < event.details.organizers.length - 1 ? ', ' : '' }}
           </span>
       </p>

       <div 
         v-if="showStatus && event.status === 'Rejected' && event.rejectionReason" 
         class="alert alert-light text-danger border-danger-subtle fs-7 mt-2 p-2 d-flex align-items-center"
         style="border-radius: var(--bs-border-radius-sm);"
         role="alert"
       >
         <span class="me-1">
           <i class="fas fa-exclamation-triangle"></i>
         </span>
         <div>
           <strong class="fw-medium">Rejection Reason:</strong> {{ event.rejectionReason }}
         </div>
       </div>

       <!-- Description -->
       <div class="pt-2">
           <strong class="d-block fs-7 fw-medium text-dark mb-1">Description:</strong>
           <p class="fs-7 text-secondary mb-0">{{ event.details.description }}</p> 
       </div>

       <!-- Display XP/Constraint Info -->
       <div v-if="event.criteria && event.criteria.length > 0" class="mt-3 pt-3" style="border-top: 1px solid var(--bs-border-color);">
           <strong class="d-block fs-7 fw-medium text-dark mb-1">Rating Criteria & XP:</strong>
           <ul class="list-unstyled fs-7 text-secondary mb-0">
               <li v-for="(alloc, index) in event.criteria" :key="index" class="d-flex align-items-center mb-1">
                   <span class="text-warning me-2" style="font-size: 0.8em;">
                     <i class="fas fa-star"></i> 
                   </span>
                   <span>{{ alloc.constraintLabel || 'Unnamed Criteria' }}: <span class="fw-medium">{{ alloc.points }} XP</span> <span class="fs-7 text-secondary">({{ formatRoleName(alloc.role || '') }})</span></span>
               </li>
           </ul>
       </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatRoleName } from '../../utils/formatters';
import { EventStatus, Event } from '@/types/event';

const props = defineProps<{
  event: Event;
  nameCache: Record<string, string>;
  showStatus: boolean;
}>();

function formatDate(dateInput: { toDate?: () => Date } | Date | string | null | undefined): string {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (typeof dateInput === 'object' && dateInput !== null && typeof (dateInput as any).toDate === 'function') {
    date = (dateInput as any).toDate();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput as string);
  }
  if (isNaN(date.getTime())) return 'Invalid Date';
  try {
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  } catch (error) { 
    return 'Formatting Error'; 
  }
}

interface ColorScheme {
  class: string;
}

const statusColorScheme = computed<ColorScheme>(() => {
  switch (props.event?.status) {
    case EventStatus.Approved:
      return { class: 'bg-success-subtle text-success-emphasis' };
    case EventStatus.Pending:
      return { class: 'bg-warning-subtle text-warning-emphasis' };
    case EventStatus.Rejected:
      return { class: 'bg-danger-subtle text-danger-emphasis' };
    case EventStatus.InProgress:
      return { class: 'bg-info-subtle text-info-emphasis' };
    case EventStatus.Completed:
    case EventStatus.Cancelled:
      return { class: 'bg-light text-dark' };
    default:
      return { class: 'bg-secondary-subtle text-secondary-emphasis' };
  }
});
</script>

<style scoped>
.fs-7 {
    font-size: 0.8rem !important;
}
</style>
