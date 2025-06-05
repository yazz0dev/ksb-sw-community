// src/views/EventDetails.vue
<template>
  <div class="event-details-view px-2 px-md-3 event-details-bg">
    <SkeletonProvider
      :loading="loading"
      :skeleton-component="EventDetailsSkeleton"
    >
      <!-- Error Display -->
      <div v-if="initialFetchError" class="container-lg mt-3 mt-md-4">
        <div class="alert alert-danger d-flex align-items-start" role="alert">
          <i class="fas fa-exclamation-triangle me-3 fs-4 text-danger"></i>
          <div>
            <h5 class="alert-heading mb-2">Failed to Load Event</h5>
            <p class="mb-0">{{ initialFetchError }}</p>
          </div>
        </div>
      </div>

      <!-- Event Content (Render only if event data is loaded successfully) -->
      <template v-if="event && !initialFetchError">
        <div class="container-lg">
          <!-- Event Header -->
          <EventDetailsHeader
            :event="mapEventToHeaderProps(event)"
            :canJoin="canJoin"
            :canLeave="canLeave"
            :isJoining="isJoining"
            :isLeaving="isLeaving"
            :name-cache="nameCacheRecord"
            @join="handleJoin"
            @leave="handleLeave"
            class="animate-fade-in"
          />

          <!-- Feedback Message -->
          <transition name="fade-pop">
            <div v-if="globalFeedback.message"
              class="alert alert-sm mt-2 mt-md-3 mb-3 mb-md-4 d-flex align-items-center animate-fade-in"
              :class="globalFeedback.type === 'success' ? 'alert-success' : 'alert-danger'"
              role="alert"
            >
              <i class="fas me-2" :class="globalFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'"></i>
              <div>{{ globalFeedback.message }}</div>
              <button type="button" class="btn-close ms-auto" @click="clearGlobalFeedback" aria-label="Close"></button>
            </div>
          </transition>

          <div class="row g-3 g-md-4 mt-0">
            <!-- Main Content Column -->
            <div class="col-12 col-lg-8">
              <!-- Event Management Controls -->
              <div v-if="localIsCurrentUserOrganizer" class="mb-3 mb-md-4">
                <EventManageControls
                  :event="event"
                  class="mb-0 animate-fade-in"
                  @update="fetchData"
                  :key="`manage-controls-${event.id}-${event.status}-${String(event.votingOpen)}`"
                />
              </div>

              <!-- XP/Criteria Section -->
              <EventCriteriaDisplay 
                v-if="event.criteria?.length" 
                :criteria="event.criteria" 
                class="mb-3 mb-md-4"
              />

              <!-- Teams/Participants Section -->
              <div class="mb-3 mb-md-4">
                <!-- Team List -->
                <div v-if="isTeamEvent" class="mb-3 mb-md-4">
                  <div class="section-header mb-3">
                    <i class="fas fa-users text-primary me-2"></i>
                    <span class="h5 mb-0 text-primary">Teams ({{ event.teams?.length || 0 }})</span>
                  </div>
                  <div class="row g-3">
                    <div class="col-12" :class="{ 'col-lg-6': teams.length > 2 }">
                      <TeamList
                        :teams="teams.slice(0, Math.ceil(teams.length / 2))"
                        :event-id="props.id"
                        :votingOpen="event.votingOpen"
                        :organizerNamesLoading="organizerNamesLoading"
                        :currentUserUid="currentUserId"
                        class="card team-list-box p-0 shadow-sm animate-fade-in"
                      />
                    </div>
                    <div v-if="teams.length > 2" class="col-12 col-lg-6">
                      <TeamList
                        :teams="teams.slice(Math.ceil(teams.length / 2))"
                        :event-id="props.id"
                        :votingOpen="event.votingOpen"
                        :organizerNamesLoading="organizerNamesLoading"
                        :currentUserUid="currentUserId"
                        class="card team-list-box p-0 shadow-sm animate-fade-in"
                      />
                    </div>
                  </div>
                </div>
                <!-- Participant List (Individual/Competition) -->
                <div v-else class="mb-3 mb-md-4">
                  <div class="section-header mb-3">
                    <i class="fas fa-user-friends text-primary me-2"></i>
                    <span class="h5 mb-0 text-primary">Participants ({{ event.participants?.length || 0 }})</span>
                  </div>
                  <div class="row g-3">
                    <div class="col-12" :class="{ 'col-lg-6': (event.participants?.length || 0) > 8 }">
                      <EventParticipantList
                        :participants="participantsFirstHalf"
                        :loading="loading"
                        :currentUserId="currentUserId"
                        :show-header="false"
                      />
                    </div>
                    <div v-if="(event.participants?.length || 0) > 8" class="col-12 col-lg-6">
                      <EventParticipantList
                        :participants="participantsSecondHalf"
                        :loading="loading"
                        :currentUserId="currentUserId"
                        :show-header="false"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sidebar Column: Submissions & Voting -->
            <div class="col-12 col-lg-4">
              <div class="sticky-lg-top" style="top: 80px;">
                <!-- Submission Section -->
                <EventSubmissionsSection
                  v-if="event.details.allowProjectSubmission !== false"
                  :event="event"
                  :teams="teams"
                  :loading="loading"
                  :getUserName="getUserNameFromCache"
                  :canSubmitProject="canSubmitProject"
                  @submission-success="handleSubmissionSuccess"
                  class="mb-4"
                />

                <!-- Voting/Winner Selection Section  -->
                <VotingCard
                  :event="event"
                  :currentUser="currentUser"
                  :loading="loading"
                />

                <!-- Organizer Rating Form -->
                <OrganizerRatingForm
                  v-if="canRateOrganizer"
                  :event-id="event.id"
                  :current-user-id="currentUser?.uid ?? ''"
                  :existing-ratings="organizerRatingsAsArray"
                  class="mb-4"
                />
              </div>
            </div>
          </div>
        </div>
      </template> <!-- End v-if="event && !initialFetchError" -->
    </SkeletonProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useEvents } from '@/composables/useEvents';
import { useNotificationStore } from '@/stores/notificationStore';
import { useEventStore } from '@/stores/eventStore';

// Component Imports
import EventCriteriaDisplay from '@/components/events/EventCriteriaDisplay.vue';
import EventParticipantList from '@/components/events/ParticipantList.vue';
import EventSubmissionsSection from '@/components/events/EventSubmissionsSection.vue';
import OrganizerRatingForm from '@/components/events/OrganizerRatingForm.vue';
import TeamList from '@/components/events/TeamList.vue';
import EventManageControls from '@/components/events/EventManageControls.vue';
import EventDetailsSkeleton from '@/skeletons/EventDetailsSkeleton.vue';
import SkeletonProvider from '@/skeletons/SkeletonProvider.vue';
import EventDetailsHeader from '@/components/events/EventDetailsHeader.vue';
import VotingCard from '@/components/events/VotingCard.vue';

// Type Imports
import { EventStatus, type Event, type Team, EventFormat } from '@/types/event';
import { type EnrichedStudentData } from '@/types/student';

// Import utility functions
import {
  isEventOrganizer,
  isEventParticipant,
  canUserSubmitToEvent,
} from '@/utils/permissionHelpers';

// --- Local Types & Interfaces ---
interface FeedbackState {
	message: string;
	type: 'success' | 'error';
}

interface EventHeaderProps {
  id: string;
  status: string;
  title: string;
  details: {
    format: EventFormat;
    date: { start: any; end: any; };
    description: string;
    organizers?: string[];
    prize?: string;
    eventName?: string;
    type?: string;
    rules?: string;
  };
  closed?: boolean;
  teams?: Team[];
  participants?: string[];
}

// --- Props ---
interface Props {
  id: string;
}
const props = defineProps<Props>();

// --- Composables ---
const studentStore = useProfileStore();
const { fetchEventById } = useEvents(); // Remove submitProject from destructuring
const eventStore = useEventStore();

// --- Refs and Reactive State ---
const loading = ref<boolean>(true);
const event = ref<Event | null>(null);
const teams = ref<Team[]>([]);
const initialFetchError = ref<string>('');
const nameCache = ref<Map<string, string>>(new Map());
const organizerNamesLoading = ref<boolean>(false);
const isJoining = ref(false);
const isLeaving = ref(false);
const globalFeedback = ref<FeedbackState>({ message: '', type: 'success' });
const actionInProgress = ref<boolean>(false);

// --- Computed Properties ---
const currentUserId = computed<string | null>(() => studentStore.studentId);
const currentUser = computed<EnrichedStudentData | null>(() => studentStore.currentStudent);

const nameCacheRecord = computed(() => Object.fromEntries(nameCache.value));
const isTeamEvent = computed<boolean>(() => event.value?.details.format === EventFormat.Team);

const localIsCurrentUserOrganizer = computed<boolean>(() =>
  event.value && currentUser.value ? isEventOrganizer(event.value, currentUser.value.uid) : false
);

const localIsCurrentUserParticipant = computed<boolean>(() =>
  event.value && currentUser.value ? isEventParticipant(event.value, currentUser.value.uid) : false
);

const allAssociatedUserIds = computed<string[]>(() => {
    if (!event.value) return [];
    const userIds = new Set<string>();
    if (event.value.requestedBy) userIds.add(event.value.requestedBy);
    (event.value.details.organizers || []).forEach(id => { if (id) userIds.add(id); });
    if (isTeamEvent.value) {
        (event.value.teams || []).forEach(team => { (team.members || []).forEach(id => { if (id) userIds.add(id); }); });
    } else {
        (event.value.participants || []).forEach(id => { if (id) userIds.add(id); });
    }
    (event.value.submissions || []).forEach(sub => { if (sub.submittedBy) userIds.add(sub.submittedBy); });
    Object.keys(event.value.organizerRatings || {}).forEach(userId => { if (userId) userIds.add(userId); });

    return Array.from(userIds).filter(Boolean);
});

const canJoin = computed(() => {
  if (!event.value || !currentUser.value) return false;
  if (localIsCurrentUserOrganizer.value || localIsCurrentUserParticipant.value) return false;
  return [EventStatus.Approved, EventStatus.InProgress].includes(event.value.status as EventStatus);
});

const canLeave = computed(() => {
  if (!event.value || !currentUser.value) return false;
  if (localIsCurrentUserOrganizer.value) return false;
  return localIsCurrentUserParticipant.value && [EventStatus.Approved, EventStatus.InProgress].includes(event.value.status as EventStatus);
});

const canSubmitProject = computed(() =>
  event.value && currentUser.value ? canUserSubmitToEvent(event.value, currentUser.value) : false
);

const canRateOrganizer = computed(() => {
  if (!event.value || !currentUser.value) return false;
  return localIsCurrentUserParticipant.value &&
         !localIsCurrentUserOrganizer.value &&
         event.value.status === EventStatus.Completed;
});

// Convert organizerRatings map to an array for the form component
const organizerRatingsAsArray = computed(() => {
  if (!event.value?.organizerRatings) return [];
  // The ratings are now a map, not an array. We convert it for the prop.
  return Object.entries(event.value.organizerRatings).map(([userId, rating]) => ({
    ...rating,
    userId: userId,
  }));
});

// Add computed properties for splitting participants
const participantsFirstHalf = computed(() => {
  const participants = event.value?.participants ?? [];
  return participants.slice(0, Math.ceil(participants.length / 2));
});

const participantsSecondHalf = computed(() => {
  const participants = event.value?.participants ?? [];
  return participants.slice(Math.ceil(participants.length / 2));
});

// --- Methods ---
function setGlobalFeedback(message: string, type: 'success' | 'error' = 'success', duration: number = 5000): void {
  globalFeedback.value = { message, type };
  if (duration > 0) {
    setTimeout(clearGlobalFeedback, duration);
  }
}
function clearGlobalFeedback(): void {
  globalFeedback.value = { message: '', type: 'success' };
}

const getUserNameFromCache = (userId: string): string => {
  return nameCache.value.get(userId) || `User (${userId.substring(0, 5)}...)`;
};

async function fetchUserNames(userIds: string[]): Promise<void> {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    const uniqueIdsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));
    if (uniqueIdsToFetch.length === 0) return;

    organizerNamesLoading.value = true;
    try {
        const names: Record<string, string> = await studentStore.fetchUserNamesBatch(uniqueIdsToFetch);
        uniqueIdsToFetch.forEach(id => {
            nameCache.value.set(id, names[id] || `User (${id.substring(0, 5)}...)`);
        });
    } catch (error: any) {
        console.error("Error fetching user names:", error);
        uniqueIdsToFetch.forEach(id => {
            if (!nameCache.value.has(id)) nameCache.value.set(id, `Error Loading Name`);
        });
    } finally {
        organizerNamesLoading.value = false;
    }
}

async function fetchData(): Promise<void> {
  loading.value = true;
  initialFetchError.value = '';
  event.value = null;
  teams.value = [];

  try {
    if (props.id) {
      const fetchedEvent = await fetchEventById(props.id);
      if (!fetchedEvent) {
        throw new Error('Event not found or you do not have permission to view it.');
      }
      event.value = { ...fetchedEvent };
      teams.value = (isTeamEvent.value && Array.isArray(fetchedEvent.teams)) ? [...fetchedEvent.teams] : [];

      await fetchUserNames(allAssociatedUserIds.value);
    }
  } catch (error: any) {
    console.error('Failed to load event details:', error);
    initialFetchError.value = error.message || 'Failed to load event data. Please try again.';
    event.value = null;
    teams.value = [];
  } finally {
    loading.value = false;
  }
}

const handleSubmissionSuccess = (): void => {
  setGlobalFeedback('Project submitted successfully!', 'success');
  fetchData(); // Refresh data to show new submission
};

const handleJoin = async (): Promise<void> => {
    if (!event.value || !currentUserId.value || isJoining.value || actionInProgress.value) return;
    isJoining.value = true;
    actionInProgress.value = true;
    try {
        await eventStore.joinEvent(props.id);
        setGlobalFeedback('Successfully joined the event!', 'success');
        await fetchData();
    } catch (error: any) {
        setGlobalFeedback(`Failed to join event: ${error.message}`, 'error');
    } finally {
        isJoining.value = false;
        actionInProgress.value = false;
    }
};

const handleLeave = async (): Promise<void> => {
    if (!event.value || !currentUserId.value || isLeaving.value || actionInProgress.value) return;
    if (!window.confirm('Are you sure you want to leave this event?')) return;

    isLeaving.value = true;
    actionInProgress.value = true;
    try {
        await eventStore.leaveEvent(props.id);
        setGlobalFeedback('Successfully left the event.', 'success');
        await fetchData();
    } catch (error: any) {
        setGlobalFeedback(`Failed to leave event: ${error.message}`, 'error');
    } finally {
        isLeaving.value = false;
        actionInProgress.value = false;
    }
};

const mapEventToHeaderProps = (evt: Event): EventHeaderProps => ({
    id: evt.id,
    status: evt.status,
    title: evt.details.eventName || evt.details.type || 'Event',
    closed: evt.status === EventStatus.Completed || evt.status === EventStatus.Cancelled,
    teams: evt.teams,
    participants: evt.participants,
    details: {
        eventName: evt.details.eventName,
        type: evt.details.type,
        format: evt.details.format,
        date: { start: evt.details.date.start, end: evt.details.date.end },
        description: evt.details.description,
        organizers: evt.details.organizers,
        prize: evt.details.prize,
        rules: evt.details.rules,
    }
});

// --- Lifecycle Hooks ---
onMounted(() => {
  fetchData();
});

onBeforeUnmount(() => {
});

watch(() => props.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchData();
  }
});

defineExpose({ handleJoin, handleLeave });

</script>

<style scoped>
.event-details-bg {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: calc(100vh - 56px);
  padding-top: 1rem;
  padding-bottom: 4rem;
  width: 100%;
  overflow-x: hidden;
}

.event-details-view { 
  width: 100%;
  margin: 0;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

@media (min-width: 768px) {
  .event-details-view {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (max-width: 767.98px) { 
  .sticky-lg-top { 
    position: static; 
  } 
}
.submit-fab { 
  position: sticky; 
  top: 80px; 
  float: right; 
  z-index: 10; 
}
.submit-fab-mobile {
  position: fixed;
  bottom: calc(64px + 1rem);
  right: 1rem;
  z-index: 1045;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: var(--bs-box-shadow-lg);
}
@media (min-width: 768px) { 
  .submit-fab-mobile { 
    display: none !important; 
  } 
}
@media (max-width: 767.98px) { 
  .submit-fab { 
    display: none !important; 
  } 
}
.section-header { 
  display: flex; 
  align-items: center; 
  font-size: 1.1rem; 
  font-weight: 600; 
  gap: 0.6rem; 
  color: var(--bs-body-color); 
  margin-bottom: 1rem; 
}
.team-list-box, .card { 
  border-radius: var(--bs-border-radius-lg); 
  border: 1px solid var(--bs-border-color-translucent); 
  box-shadow: var(--bs-box-shadow-sm); 
  overflow: hidden; 
  background-color: var(--bs-card-bg); 
}
.animate-fade-in { 
  animation: fadeIn 0.5s ease-out forwards; 
}
@keyframes fadeIn { 
  from { 
    opacity: 0; 
    transform: translateY(10px); 
  } 
  to { 
    opacity: 1; 
    transform: translateY(0); 
  } 
}
.fade-pop-enter-active { 
  animation: fadeIn .5s ease; 
}
.fade-pop-leave-active { 
  animation: fadeOut .3s ease forwards; 
}
@keyframes fadeOut { 
  from { 
    opacity: 1; 
  } 
  to { 
    opacity: 0; 
  } 
}
.modal.fade .modal-dialog { 
  transition: transform .3s ease-out; 
  transform: translateY(-25px); 
}
.modal.show .modal-dialog { 
  transform: none; 
}
.modal-content { 
  border-radius: var(--bs-border-radius-lg); 
  border: none; 
}
.sticky-lg-top { 
  position: sticky; 
  top: 80px; 
  z-index: 5; 
}
.alert-sm { 
  padding: 0.5rem 0.75rem; 
  font-size: 0.875em; 
}
.btn-close {
  font-size: 0.75rem;
}
.card-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
}
</style>