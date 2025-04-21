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
               <strong class="fw-medium text-dark me-1">Dates:</strong> {{ formatISTDate(event.details.date.start) }} - {{ formatISTDate(event.details.date.end) }}
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
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { formatISTDate } from '@/utils/dateTime';

const props = defineProps<{
  event: Event;
  nameCache: Record<string, string>;
  showStatus: boolean;
}>();

interface ColorScheme {
  class: string;
}

const statusColorScheme = computed(() => ({
  class: getEventStatusBadgeClass(props.event?.status)
}));
</script>

<style scoped>
.fs-7 {
    font-size: 0.8rem !important;
}
</style>
