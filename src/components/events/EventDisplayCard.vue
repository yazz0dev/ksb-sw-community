<template>
  <div class="event-display-card p-3 border rounded bg-light-subtle mb-3"> <!-- Added padding and bg -->
     <h5 class="h5 text-primary mb-2"> <!-- Changed h4 to h5 -->
         {{ event.details.eventName }}
         <span class="fw-normal text-secondary small">({{ event.details.type }})</span>
     </h5>

     <!-- Details Section -->
     <div class="row g-1 fs-7 text-secondary mb-2"> <!-- Use fs-7 and mb-2 -->
         <div class="col-md-6 col-12 py-1 d-flex align-items-center">
             <i class="fas fa-user-edit fa-fw me-2 text-muted"></i>
             <strong class="fw-medium text-dark me-1">Requested by:</strong> {{ userStore.getCachedUserName(event.requestedBy) || '(Name unavailable)' }}
         </div>
         <div class="col-md-6 col-12 py-1 d-flex align-items-center">
              <i class="fas fa-calendar-alt fa-fw me-2 text-muted"></i>
             <strong class="fw-medium text-dark me-1">Dates:</strong> {{ formatISTDate(event.details.date.start) }} - {{ formatISTDate(event.details.date.end) }}
         </div>
         <div class="col-md-6 col-12 py-1 d-flex align-items-center">
             <i class="fas fa-users fa-fw me-2 text-muted"></i>
             <strong class="fw-medium text-dark me-1">Format:</strong> {{ event.details.format }}
         </div>
         <!-- Prize for Competition -->
         <div v-if="event.details.format === 'Competition' && event.details.prize" class="col-md-6 col-12 py-1 d-flex align-items-center">
              <i class="fas fa-trophy fa-fw me-2 text-warning"></i>
             <strong class="fw-medium text-dark me-1">Prize:</strong> {{ event.details.prize }}
         </div>
         <!-- Status -->
         <div class="col-md-6 col-12 py-1 d-flex align-items-center" v-if="showStatus && event.status">
             <i class="fas fa-info-circle fa-fw me-2 text-muted"></i>
             <strong class="fw-medium text-dark me-1">Status:</strong>
             <span :class="['badge rounded-pill', statusColorScheme.class]">{{ event.status }}</span>
         </div>
     </div>

     <!-- Co-Organizers -->
     <p v-if="event.details.organizers && event.details.organizers.length > 0" class="fs-7 text-secondary mt-1 mb-2 d-flex align-items-start"> <!-- Use mb-2 -->
         <i class="fas fa-user-shield fa-fw me-2 text-muted mt-1"></i>
         <div>
              <strong class="fw-medium text-dark">Co-Organizers:</strong>
              <span v-for="(orgId, idx) in event.details.organizers" :key="orgId">
                  {{ userStore.getCachedUserName(orgId) || '(Name unavailable)' }}{{ idx < event.details.organizers.length - 1 ? ', ' : '' }}
              </span>
          </div>
     </p>

     <!-- Rejection Reason -->
     <div
       v-if="showStatus && event.status === 'Rejected' && event.rejectionReason"
       class="alert alert-danger alert-sm border-danger-subtle mt-2 p-2 d-flex align-items-center"
       role="alert"
     >
       <i class="fas fa-exclamation-triangle fa-fw me-2"></i>
       <div>
         <strong class="fw-medium">Rejection Reason:</strong> {{ event.rejectionReason }}
       </div>
     </div>

     <!-- Description -->
     <div class="pt-2 mt-2 border-top"> <!-- Added border-top -->
         <strong class="d-block fs-7 fw-medium text-dark mb-1">Description:</strong>
         <p class="fs-7 text-secondary mb-0 description-text">{{ event.details.description }}</p>
     </div>

     <!-- XP/Constraint Info -->
     <div v-if="event.criteria && event.criteria.length > 0" class="mt-3 pt-3 border-top">
         <strong class="d-block fs-7 fw-medium text-dark mb-2">Rating Criteria & XP:</strong> <!-- Increased mb -->
         <ul class="list-unstyled fs-7 text-secondary mb-0">
             <li v-for="(alloc, index) in event.criteria" :key="index" class="d-flex align-items-center mb-1">
                 <span class="text-warning me-2" style="font-size: 0.8em;">
                   <i class="fas fa-star fa-fw"></i>
                 </span>
                 <!-- Use imported formatRoleName -->
                 <span>{{ alloc.constraintLabel || 'Unnamed Criteria' }}: <span class="fw-medium">{{ alloc.points }} XP</span> <span class="text-muted ms-1">({{ formatRoleName(alloc.role || '') }})</span></span>
             </li>
         </ul>
     </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { useStudentProfileStore } from '@/stores/studentProfileStore';
import type { StudentProfileGetters } from '@/types/storeStudent'; // Import StudentProfileGetters
import { formatRoleName } from '@/utils/formatters'; // Import formatRoleName
import { Event, EventFormat } from '@/types/event'; // Import EventFormat
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { formatISTDate } from '@/utils/dateTime';

const props = defineProps({
event: {
  type: Object as PropType<Event>,
  required: true,
},
showStatus: {
  type: Boolean,
  default: false,
},
});

const userStore = useStudentProfileStore() as (ReturnType<typeof useStudentProfileStore> & StudentProfileGetters); // Apply type assertion

interface ColorScheme {
class: string;
}

const statusColorScheme = computed<ColorScheme>(() => ({
class: getEventStatusBadgeClass(props.event?.status)
}));

// Make EventFormat available in template
defineExpose({ EventFormat });

</script>

<style scoped>
.fs-7 {
  font-size: 0.85rem !important; /* Slightly larger small text */
}
.alert-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8em;
}
.description-text {
  line-height: 1.6; /* Improve readability */
  white-space: pre-wrap; /* Respect line breaks in description */
}
.event-display-card {
  transition: box-shadow 0.2s ease-in-out;
}
.event-display-card:hover {
  box-shadow: var(--bs-box-shadow-sm);
}
</style>