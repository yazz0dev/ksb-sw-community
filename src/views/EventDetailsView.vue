// src/views/EventDetails.vue
<template>
  <div class="event-details-view section-spacing px-2 px-md-3 event-details-bg">
    <SkeletonProvider
      :loading="loading"
      :skeleton-component="EventDetailsSkeleton"
    >
      <!-- Error Display -->
      <div v-if="initialFetchError" class="container-lg">
        <div class="alert alert-danger d-flex align-items-start" role="alert">
          <i class="fas fa-exclamation-triangle me-3 h4 text-danger"></i>
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
            @leave="showLeaveModal"
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
                    <span class="h5 mb-0 text-gradient-primary">Teams ({{ event.teams?.length || 0 }})</span>
                  </div>
                  <div class="row g-3">
                    <div class="col-12" :class="{ 'col-lg-6': teams.length > 1 }">
                      <TeamList
                        :teams="teams.slice(0, Math.ceil(teams.length / 2))"
                        :event-id="props.id"
                        :votingOpen="event.votingOpen"
                        :organizerNamesLoading="organizerNamesLoading"
                        :currentUserUid="currentUserId"
                        :getName="getUserNameFromCache"
                        class="team-list-box p-0 animate-scale-in card-hover-lift"
                      />
                    </div>
                    <div v-if="teams.length > 1" class="col-12 col-lg-6">
                      <TeamList
                        :teams="teams.slice(Math.ceil(teams.length / 2))"
                        :event-id="props.id"
                        :votingOpen="event.votingOpen"
                        :organizerNamesLoading="organizerNamesLoading"
                        :currentUserUid="currentUserId"
                        :getName="getUserNameFromCache"
                        class="team-list-box p-0 animate-scale-in card-hover-lift"
                        style="animation-delay: 0.1s;"
                      />
                    </div>
                  </div>
                </div>
                <!-- Participant List (Individual/Competition) -->
                <div v-else class="mb-3 mb-md-4">
                  <div class="section-header mb-3">
                    <i class="fas fa-user-friends text-primary me-2"></i>
                    <span class="h5 mb-0 text-gradient-primary">Participants ({{ event.details.coreParticipants?.length || 0 }})</span>
                  </div>
                  <div class="row g-3">
                    <div class="col-12" :class="{ 'col-lg-6': (event.details.coreParticipants?.length || 0) > 8 }">
                      <EventParticipantList
                        :participants="participantsFirstHalf"
                        :loading="loading"
                        :currentUserId="currentUserId"
                        :show-header="false"
                        :getName="getUserNameFromCache"
                        class="animate-scale-in card-hover-lift"
                      />
                    </div>
                    <div v-if="(event.details.coreParticipants?.length || 0) > 8" class="col-12 col-lg-6">
                      <EventParticipantList
                        :participants="participantsSecondHalf"
                        :loading="loading"
                        :currentUserId="currentUserId"
                        :show-header="false"
                        :getName="getUserNameFromCache"
                        class="animate-scale-in card-hover-lift"
                        style="animation-delay: 0.1s;"
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
                  class="mb-4"
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

    <!-- Leave Event Confirmation Modal -->
    <ConfirmationModal
      ref="leaveEventModalRef"
      modal-id="leaveEventModal"
      title="Leave Event"
      message="Are you sure you want to leave this event? You can rejoin later if the event is still accepting participants."
      confirm-text="Leave Event"
      cancel-text="Stay"
      variant="warning"
      @confirm="handleLeave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

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
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue';

// Type Imports
import { EventStatus, type Event, type Team, EventFormat } from '@/types/event';
import { type EnrichedStudentData } from '@/types/student';
import type { EventHeaderProps } from '@/components/events/EventDetailsHeader.vue';

// Define an extension of Event that includes id
interface EventWithId extends Event {
  id: string;
}

// Import utility functions
import {
  isEventOrganizer,
  canUserSubmitToEvent,
} from '@/utils/permissionHelpers';

// --- Local Types & Interfaces ---
interface FeedbackState {
	message: string;
	type: 'success' | 'error';
}

// --- Props ---
interface Props {
  id: string;
}
const props = defineProps<Props>();

// --- Composables ---
const studentStore = useProfileStore();
const eventStore = useEventStore();

// --- Refs and Reactive State ---
const loading = ref<boolean>(true);
const event = ref<EventWithId | null>(null);
const teams = ref<Team[]>([]);
const initialFetchError = ref<string>('');
const nameCache = ref<Map<string, string>>(new Map());
const organizerNamesLoading = ref<boolean>(false);
const isJoining = ref(false);
const isLeaving = ref(false);
const globalFeedback = ref<FeedbackState>({ message: '', type: 'success' });
const actionInProgress = ref<boolean>(false);
const leaveEventModalRef = ref<InstanceType<typeof ConfirmationModal> | null>(null);

// --- Computed Properties ---
const currentUserId = computed<string | null>(() => studentStore.studentId);
const currentUser = computed<EnrichedStudentData | null>(() => studentStore.currentStudent);

const nameCacheRecord = computed(() => Object.fromEntries(nameCache.value));
const isTeamEvent = computed<boolean>(() => {
  if (!event.value) return false;
  
  // For MultiEvent, check if any phase is Team format
  if (event.value.details.format === EventFormat.MultiEvent) {
    return event.value.details.phases?.some(phase => phase.format === EventFormat.Team) || false;
  }
  
  return event.value.details.format === EventFormat.Team;
});

const localIsCurrentUserOrganizer = computed<boolean>(() =>
  event.value && currentUser.value ? isEventOrganizer(event.value, currentUser.value.uid) : false
);

const localIsCurrentUserParticipant = computed<boolean>(() => {
  if (!event.value || !currentUser.value) return false;
  
  const currentUserId = currentUser.value.uid;
  
  // For MultiEvent, check participants across all phases
  if (event.value.details.format === EventFormat.MultiEvent && event.value.details.phases) {
    return event.value.details.phases.some(phase => {
      if (phase.format === EventFormat.Team && phase.teams) {
        return phase.teams.some(team => 
          team.members && team.members.includes(currentUserId)
        );
      } else if (phase.format === EventFormat.Individual && phase.coreParticipants) {
        return phase.coreParticipants.includes(currentUserId);
      }
      return false;
    });
  }
  
  // For Team events, check if user is in any team
  if (event.value.details.format === EventFormat.Team && event.value.teams) {
    return event.value.teams.some(team => 
      team.members && team.members.includes(currentUserId)
    );
  }
  
  // For Individual events, check coreParticipants
  return (event.value.details.coreParticipants || []).includes(currentUserId);
});

const allAssociatedUserIds = computed<string[]>(() => {
    if (!event.value) return [];
    const userIds = new Set<string>();
    
    // Add requester and organizers
    if (event.value.requestedBy) userIds.add(event.value.requestedBy);
    (event.value.details.organizers || []).forEach(id => { if (id) userIds.add(id); });
    
    // Handle MultiEvent format
    if (event.value.details.format === EventFormat.MultiEvent && event.value.details.phases) {
      event.value.details.phases.forEach(phase => {
        if (phase.format === EventFormat.Team && phase.teams) {
          phase.teams.forEach(team => {
            (team.members || []).forEach(id => { if (id) userIds.add(id); });
          });
        } else if (phase.format === EventFormat.Individual && phase.coreParticipants) {
          phase.coreParticipants.forEach(id => { if (id) userIds.add(id); });
        }
      });
    } else {
      // Handle regular Team/Individual formats
      if (isTeamEvent.value) {
          (event.value.teams || []).forEach(team => { (team.members || []).forEach(id => { if (id) userIds.add(id); }); });
      } else {
          (event.value.details.coreParticipants || []).forEach(id => { if (id) userIds.add(id); });
      }
    }
    
    // Add submission authors and organizer raters
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
  event.value && currentUser.value ? canUserSubmitToEvent(event.value, currentUser.value as any) : false
);

const canRateOrganizer = computed(() => {
  if (!event.value || !currentUser.value) return false;
  return localIsCurrentUserParticipant.value &&
         !localIsCurrentUserOrganizer.value &&
         (event.value.status === EventStatus.Completed || event.value.status === EventStatus.Closed);
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

// Update computed properties for participant lists
const participantsFirstHalf = computed(() => {
  const participants = event.value?.details.coreParticipants ?? [];
  return participants.slice(0, Math.ceil(participants.length / 2));
});

const participantsSecondHalf = computed(() => {
  const participants = event.value?.details.coreParticipants ?? [];
  return participants.slice(Math.ceil(participants.length / 2));
});

// --- Methods ---
function setGlobalFeedback(message: string, type: 'success' | 'error' = 'success', duration: number = 5000): void {
  globalFeedback.value = { message, type };
  if (duration > 0) {
    setTimeout(() => {
      globalFeedback.value = { message: '', type: 'success' };
    }, duration);
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
      // Use fetchEventDetails which has the correct permission logic for single events.
      const fetchedEvent = await eventStore.fetchEventDetails(props.id);

      if (!fetchedEvent) {
        // fetchEventDetails will have already set a notification, but we can set a local error too.
        throw new Error('Event not found or you do not have permission to view it.');
      }

      // The store now holds the definitive state in `viewedEventDetails`.
      // We can use it to populate our local ref.
      event.value = { 
        ...fetchedEvent,
        id: props.id  // Ensure id is set
      } as EventWithId;
      teams.value = (isTeamEvent.value && Array.isArray(fetchedEvent.teams)) ? [...fetchedEvent.teams] : [];

      // fetchUserNames should still be called.
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

const showLeaveModal = (): void => {
  leaveEventModalRef.value?.show();
};

const handleLeave = async (): Promise<void> => {
    if (!event.value || !currentUserId.value || isLeaving.value || actionInProgress.value) return;

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

const mapEventToHeaderProps = (evt: EventWithId): EventHeaderProps => {
  const convertToTimestamp = (dateVal: any): Timestamp | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Timestamp) return dateVal;
    // Check if it's a plain object that looks like a Firestore Timestamp
    if (typeof dateVal === 'object' && dateVal !== null &&
        typeof dateVal.seconds === 'number' && typeof dateVal.nanoseconds === 'number') {
      return new Timestamp(dateVal.seconds, dateVal.nanoseconds);
    }
    // If it's already a JS Date object, this path won't be hit by typical Firestore data.
    // If it's a string, formatISTDate might handle it, but EventHeaderProps expects Timestamp.
    // For robustness, one might add string/Date parsing here if necessary,
    // but the primary goal is to handle Firestore's plain object representation.
    console.warn('Date value received by mapEventToHeaderProps is not a Timestamp or a plain Firestore Timestamp object:', dateVal);
    return null; // Or handle other types if necessary and if formatISTDate supports them
  };

  return {
    id: evt.id,
    status: evt.status,
    title: evt.details.eventName || 'Event',
    closed: evt.status === EventStatus.Completed || evt.status === EventStatus.Cancelled || evt.status === EventStatus.Closed,
    teams: evt.teams || undefined,
    participants: evt.details.coreParticipants || undefined,
    votingOpen: evt.votingOpen || false,
    details: {
        format: evt.details.format,
        date: {
            start: convertToTimestamp(evt.details.date?.start),
            end: convertToTimestamp(evt.details.date?.end)
        },
        description: evt.details.description,
        eventName: evt.details.eventName || undefined,
        type: evt.details.type || undefined,
        organizers: evt.details.organizers || undefined,
        prize: evt.details.prize || undefined,
        rules: evt.details.rules || undefined,
        isCompetition: evt.details.isCompetition || false,
        phases: evt.details.phases || undefined
    }
  };
};

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

<style lang="scss" scoped>
/* Event Details Background & Layout */
.event-details-bg {
  background: linear-gradient(135deg, 
    var(--bs-light) 0%, 
    var(--bs-primary-bg-subtle) 50%, 
    rgba(var(--bs-primary-rgb), 0.08) 100%);
  min-height: calc(100vh - var(--navbar-height-mobile));
  padding-top: 1rem;
  padding-bottom: 4rem;
  width: 100%;
  overflow-x: hidden;
  position: relative;
}

.event-details-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(180deg, 
    rgba(var(--bs-primary-rgb), 0.03) 0%, 
    transparent 100%);
  pointer-events: none;
  z-index: 0;
}

@media (min-width: 992px) {
  .event-details-bg {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}

.event-details-view { 
  width: 100%;
  margin: 0;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .event-details-view {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Enhanced Section Headers */
.section-header { 
  background: rgba(var(--bs-white-rgb), 0.9); // Kept for distinct section header appearance
  backdrop-filter: blur(10px);
  border-radius: var(--bs-border-radius-lg);
  padding: 1rem 1.25rem;
  border: 1px solid rgba(var(--bs-primary-rgb), 0.1);
  box-shadow: 0 2px 10px rgba(var(--bs-dark-rgb), 0.05);
  display: flex; 
  align-items: center; 
  font-size: 1.1rem; 
  font-weight: 600; 
  gap: 0.75rem; 
  color: var(--bs-body-color); 
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

.section-header:hover {
  box-shadow: 0 4px 15px rgba(var(--bs-dark-rgb), 0.08);
  transform: translateY(-1px);
}

.section-header i {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--bs-primary-rgb), 0.1);
  border-radius: 50%;
  font-size: 0.875rem;
}

/* Simplified Card Styling for .team-list-box and other general cards in this view */
/* Note: The very generic .card selector was removed to avoid unintended global effects.
   If other cards in this view need this styling, they should get a specific class or be targeted more precisely.
*/
.team-list-box { 
  background-color: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius-lg); 
  box-shadow: var(--bs-box-shadow-sm);
  overflow: hidden; 
  /* transition for hover effect is now part of card-hover-lift in _animations.scss */
  position: relative;
  z-index: 2; // Ensure it's above background elements
}

/* .team-list-box:hover is now handled by .card-hover-lift in _animations.scss */

/* Participant List Enhancements - Styles for .participant-card and .participant-item are now in ParticipantList.vue */
/* Removed local .participant-card and .participant-item styles */

/* Sidebar Enhancements - Kept as is, assuming these are desired for sidebar distinctiveness */
.sidebar-card {
  background: rgba(var(--bs-white-rgb), 0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(var(--bs-primary-rgb), 0.06);
  border-radius: var(--bs-border-radius-xl);
  box-shadow: 
    0 6px 25px rgba(var(--bs-dark-rgb), 0.06),
    0 2px 6px rgba(var(--bs-dark-rgb), 0.04);
  position: relative;
  z-index: 2;
}

.sidebar-card .card-header {
  background: linear-gradient(135deg, 
    rgba(var(--bs-primary-rgb), 0.05) 0%, 
    rgba(var(--bs-primary-rgb), 0.02) 100%);
  border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.08);
  border-radius: var(--bs-border-radius-xl) var(--bs-border-radius-xl) 0 0;
}

.sidebar-card .card-title {
  color: var(--bs-primary);
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0;
}

/* Animation Classes */
.animate-fade-in { 
  animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; 
}

@keyframes fadeIn { 
  from { 
    opacity: 0; 
    transform: translateY(15px); 
  } 
  to { 
    opacity: 1; 
    transform: translateY(0); 
  } 
}

/* Feedback Transitions */
.fade-pop-enter-active { 
  animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); 
}

.fade-pop-leave-active { 
  animation: fadeOut 0.3s ease forwards; 
}

@keyframes fadeOut { 
  from { 
    opacity: 1; 
    transform: translateY(0);
  } 
  to { 
    opacity: 0; 
    transform: translateY(-10px);
  } 
}

/* Sticky Sidebar */
.sticky-lg-top { 
  position: sticky; 
  top: 80px; 
  z-index: 5; 
}

@media (max-width: 767.98px) { 
  .sticky-lg-top { 
    position: static !important; 
  } 
}

/* Enhanced Alert Styling */
.alert-sm { 
  padding: 0.75rem 1rem; 
  font-size: 0.875rem;
  border: none;
  border-radius: var(--bs-border-radius-lg);
  backdrop-filter: blur(10px);
  box-shadow: var(--bs-box-shadow-sm);
  position: relative;
  z-index: 3;
}

.alert-success {
  background: linear-gradient(135deg, 
    rgba(var(--bs-success-rgb), 0.1) 0%, 
    rgba(var(--bs-success-rgb), 0.05) 100%);
  border-left: 4px solid var(--bs-success);
}

.alert-danger {
  background: linear-gradient(135deg, 
    rgba(var(--bs-danger-rgb), 0.1) 0%, 
    rgba(var(--bs-danger-rgb), 0.05) 100%);
  border-left: 4px solid var(--bs-danger);
}

.btn-close {
  font-size: 0.75rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.btn-close:hover {
  opacity: 1;
}

.card-header {
  background: linear-gradient(135deg, 
    rgba(var(--bs-primary-rgb), 0.05) 0%, 
    rgba(var(--bs-primary-rgb), 0.02) 100%);
  border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.08);
}

/* Mobile Responsive Improvements */
@media (max-width: 991.98px) {
  .sidebar-card {
    margin-top: 2rem;
  }
}

@media (max-width: 575.98px) {
  .section-header {
    padding: 0.75rem 1rem;
    font-size: 1rem;
    gap: 0.5rem;
  }
  
  .section-header i {
    width: 20px;
    height: 20px;
    font-size: 0.75rem;
  }
  
  .team-list-box, .card {
    margin-bottom: 1rem;
  }
  
  .row.g-3 {
    --bs-gutter-x: 0.75rem;
    --bs-gutter-y: 0.75rem;
  }
  
  .participant-card {
    padding: 0.75rem;
  }
  
  .event-details-view {
    padding-left: 0.25rem;
    padding-right: 0.25rem;
  }
}

/* Loading States */
.loading-placeholder {
  background: linear-gradient(90deg, 
    rgba(var(--bs-light-rgb), 0.8) 25%, 
    rgba(var(--bs-light-rgb), 0.4) 50%, 
    rgba(var(--bs-light-rgb), 0.8) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--bs-border-radius);
  height: 1rem;
  margin-bottom: 0.5rem;
}

.text-display {
  font-size: 4rem;
  opacity: 0.3;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>