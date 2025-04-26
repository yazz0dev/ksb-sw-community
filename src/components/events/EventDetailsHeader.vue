<template>
  <div class="event-details-header bg-light border rounded shadow-sm overflow-hidden">
    <div class="p-4 p-md-5">
      <!-- Header Content -->
      <div class="row g-4 align-items-start">
        <!-- Left Column: Details -->
        <div class="col-md">
          <div class="d-flex gap-2 mb-2 flex-wrap">
            <span :class="['badge rounded-pill fs-6', statusTagClass]">{{ event?.status }}</span>
            <span v-if="event?.closed" class="badge rounded-pill bg-light text-dark fs-6">Archived</span>
          </div>

          <h1 class="display-5 text-primary mb-2">
            {{ event?.details?.eventName || 'Untitled Event' }}
          </h1>

          <!-- Add Organizers Section -->
          <div v-if="event?.details?.organizers?.length" class="d-flex align-items-center mb-3">
            <span class="text-secondary me-2"><i class="fas fa-user-shield"></i></span>
            <div class="text-secondary">
              Organized by: 
              <span v-for="(orgId, idx) in event.details.organizers" :key="orgId">
                <router-link 
                  :to="{ name: 'PublicProfile', params: { userId: orgId }}"
                  class="text-decoration-none text-primary"
                >
                  {{ formatOrganizerName(orgId) }}
                </router-link>
                <span v-if="idx < event.details.organizers.length - 1">, </span>
              </span>
            </div>
          </div>

          <div class="d-flex flex-wrap mb-4 gap-4">
            <div class="d-flex align-items-center">
              <span class="text-secondary me-2"><i class="fas fa-calendar"></i></span>
              <small class="text-secondary">
                {{ formatISTDate(event?.details?.date?.start ?? null, 'dd MMM yyyy') }} - {{ formatISTDate(event?.details?.date?.end ?? null, 'dd MMM yyyy') }}
              </small>
            </div>
            <div class="d-flex align-items-center">
              <span class="text-secondary me-2"><i class="fas fa-users"></i></span>
              <small class="text-secondary">
                {{ totalParticipants }} participant{{ totalParticipants === 1 ? '' : 's' }}
              </small>
            </div>
          </div>

          <!-- Rendered Description -->
          <div class="rendered-description small" v-html="renderedDescriptionHtml"></div>

        </div>

        <!-- Right Column: Action Buttons -->
        <div class="col-md-auto">
          <div class="d-flex flex-column gap-2" style="min-width: 180px;">
            <button
              v-if="canJoin"
              class="btn btn-primary w-100 d-flex align-items-center justify-content-center"
              :disabled="isJoining"
              @click="$emit('join')"
            >
              <span v-if="isJoining" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <i v-else class="fas fa-plus me-2"></i>
              <span>Join Event</span>
            </button>

            <button
              v-if="canLeave"
              class="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center"
              :disabled="isLeaving"
              @click="$emit('leave')"
            >
              <span v-if="isLeaving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <i v-else class="fas fa-times me-2"></i>
              <span>Leave Event</span>
            </button>

            <button
              v-if="canEdit && event?.id"
              class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
              @click="$router.push(`/event/${event.id}/edit`)"
            >
               <i class="fas fa-edit me-2"></i>
              <span>Edit Event</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineAsyncComponent, computed } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Timestamp } from 'firebase/firestore';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { formatISTDate } from '@/utils/dateTime';

interface Event {
  id: string;
  status: string;
  title: string;
  details: {
    eventName?: string; 
    date: {
        start: Timestamp | null;
        end: Timestamp | null;
    };
    format: string;
    description: string; 
    organizers?: string[];
  };
  closed?: boolean;
  teams?: { members: string[] }[];
  participants?: string[];
}

const props = defineProps<{
  event: Event | null;
  canJoin: boolean;
  canLeave: boolean;
  canEdit: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  nameCache?: Record<string, string> | Map<string, string>; // Add this prop
}>();

const emit = defineEmits<{
  (e: 'join'): void;
  (e: 'leave'): void;
}>();

const router = useRouter();

const renderedDescriptionHtml = ref('');

async function renderDescription(description: string | undefined) {
  if (!description) {
    renderedDescriptionHtml.value = '';
    return;
  }
  try {
    // Dynamically import when needed
    const { marked } = await import('marked');
    const DOMPurify = (await import('dompurify')).default; // Use .default for default exports

    marked.setOptions({ breaks: true, gfm: true });
    const rawHtml: string = await marked.parse(description); // marked.parse might be async now
    renderedDescriptionHtml.value = DOMPurify.sanitize(rawHtml);
  } catch (error) {
    console.error('Error rendering markdown description:', error);
    renderedDescriptionHtml.value = '<p class="text-danger">Error rendering description.</p>';
  }
}

watch(() => props.event?.details?.description, (newDesc) => {
     renderDescription(newDesc);
}, { immediate: true });

const statusTagClass = computed((): string => getEventStatusBadgeClass(props.event?.status));

const totalParticipants = computed(() => {
  if (!props.event) return 0;
  if (props.event.details?.format === 'Team' && Array.isArray(props.event.teams)) {
    const memberSet = new Set<string>();
    props.event.teams.forEach(team => {
      (team.members || []).forEach(m => m && memberSet.add(m));
    });
    return memberSet.size;
  } else if (Array.isArray(props.event.participants)) {
    return props.event.participants.length;
  }
  return 0;
});

// Add name formatting helper
const formatOrganizerName = (uid: string): string => {
  if (!uid) return 'Unknown';
  
  let name: string | undefined | null = null;
  
  if (props.nameCache instanceof Map) {
    name = props.nameCache.get(uid);
  } else if (props.nameCache && typeof props.nameCache === 'object') {
    name = props.nameCache[uid];
  }
  
  return name || 'Member';
};
</script>

<style scoped>
/* Minor style adjustments if needed for rendered HTML */
.rendered-description :deep(p:last-child) {
  margin-bottom: 0; /* Remove extra margin from last paragraph */
}
.rendered-description :deep(ul) {
  padding-left: 1.5rem; /* Adjust list padding if needed */
  margin-top: 0.5rem;
}

/* Ensure buttons maintain consistent height with spinner */
.btn {
  min-height: 38px; /* Adjust based on Bootstrap's default btn height */
}
</style>
