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
          <!-- Mobile Back Button - Updated with new styling -->
          <div class="mobile-back-button d-block d-md-none mb-3">
            <button 
              class="btn btn-back btn-sm d-flex align-items-center"
              @click="goBack"
              aria-label="Go back"
            >
              <i class="fas fa-arrow-left me-2"></i>
              <span>Back</span>
            </button>
          </div>

          <!-- Event Header -->
          <EventDetailsHeader
            :event="event"
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
                  :key="`manage-controls-${event.id}-${event.status}-${String(event.votingOpen)}-${event.xpAwardingStatus}`"
                />
              </div>

              <!-- XP Awarding Progress Section -->
              <div v-if="localIsCurrentUserOrganizer && event.status === EventStatus.Completed && (event.xpAwardingStatus || event.xpAwardedAt)"
                   class="xp-awarding-progress-section section-card shadow-sm rounded-4 p-3 p-md-4 mb-3 mb-md-4 animate-fade-in">
                <h4 class="h5 mb-3 text-dark">
                  <i class="fas fa-award text-primary me-2"></i>XP Awarding Status
                </h4>
                <div v-if="event.xpAwardingStatus === 'in_progress'" class="alert alert-info d-flex align-items-center">
                  <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                  <span>XP awarding is currently in progress...</span>
                </div>
                <div v-else-if="event.xpAwardingStatus === 'completed' && event.xpAwardedAt" class="alert alert-success">
                  <i class="fas fa-check-circle me-2"></i>
                  XP successfully awarded on {{ formatTimestamp(event.xpAwardedAt) }}.
                </div>
                <div v-else-if="event.xpAwardingStatus === 'failed' && event.xpAwardError" class="alert alert-danger">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  XP awarding failed: {{ event.xpAwardError }}
                </div>
                <div v-else-if="event.xpAwardingStatus === 'pending' || !event.xpAwardingStatus" class="alert alert-secondary">
                   <i class="fas fa-hourglass-half me-2"></i>
                  XP awarding is pending. Click "Award XP" in Manage Controls.
                </div>
                 <div v-else class="alert alert-secondary">
                   <i class="fas fa-info-circle me-2"></i>
                  XP Awarding Status: {{ event.xpAwardingStatus || 'Not yet started' }}.
                </div>
              </div>

              <!-- XP/Criteria Section (Only for non-MultiEvent) -->
              <EventCriteriaDisplay 
                v-if="event.details.format !== EventFormat.MultiEvent && event.criteria && event.criteria.length > 0"
                :criteria="event.criteria" 
                :event-format="event.details.format"
                :is-competition="event.details.isCompetition ?? false"
                class="mb-3 mb-md-4"
              />

              <!-- Teams/Participants Section (Only for non-MultiEvent) -->
              <div v-if="event.details.format !== EventFormat.MultiEvent" class="mb-3 mb-md-4">
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
                <!-- Participant List (Individual) -->
                <div v-else-if="shouldShowParticipantLists" class="mb-3 mb-md-4">
                  <div class="section-header mb-3">
                    <i class="fas fa-user-friends text-primary me-2"></i>
                    <span class="h5 mb-0 text-gradient-primary">Participants ({{ allParticipantsForDisplay.length }})</span>
                  </div>
                  <div class="row g-3">
                    <div class="col-12" :class="{ 'col-lg-6': allParticipantsForDisplay.length > 8 }">
                      <EventParticipantList
                        :core-participants="allParticipantsForDisplay.length > 8 ? participantsFirstHalf : allParticipantsForDisplay"
                        :loading="loading"
                        :currentUserId="currentUserId"
                        :show-header="false"
                        :getName="getUserNameFromCache"
                        class="animate-scale-in card-hover-lift"
                      />
                    </div>
                    <div v-if="allParticipantsForDisplay.length > 8" class="col-12 col-lg-6">
                      <EventParticipantList
                        :core-participants="participantsSecondHalf"
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

              <!-- NEW: Phases Section (Only for MultiEvent) -->
              <div v-if="event.details.format === EventFormat.MultiEvent && event.details.phases && event.details.phases.length > 0" class="phases-section mb-3 mb-md-4">
                <div class="section-header mb-3">
                  <i class="fas fa-layer-group text-primary me-2"></i>
                  <span class="h5 mb-0 text-gradient-primary">Event Phases</span>
                </div>
                <div v-for="(phase, index) in event.details.phases" :key="phase.id || index" class="mb-3">
                  <PhaseDisplayCard
                    :phase="phase"
                    :phaseNumber="index + 1"
                    :nameCache="nameCacheRecord"
                    :event-id="event.id"
                    :overall-event-status="event.status"
                  />
                </div>
              </div>
            </div>

            <!-- Sidebar Column: Submissions & Voting (Overall event submissions might be hidden for MultiEvent based on allowProjectSubmission) -->
            <div class="col-12 col-lg-4">
              <div class="sticky-lg-top" style="top: 80px;">
                <!-- Submission Section -->
                <EventSubmissionsSection
                  v-if="event.details.format !== EventFormat.MultiEvent && event.details.allowProjectSubmission !== false"
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
import { DateTime } from 'luxon';
import type { Timestamp } from 'firebase/firestore';

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
import PhaseDisplayCard from '@/components/events/PhaseDisplayCard.vue'; // Import new component

// Type Imports
import { EventStatus, type Event, type Team, EventFormat } from '@/types/event';
import { type EnrichedStudentData } from '@/types/student';

interface EventWithId extends Event {
  id: string;
}

import {
  isEventOrganizer,
  canUserSubmitToEvent,
} from '@/utils/permissionHelpers';

interface FeedbackState {
	message: string;
	type: 'success' | 'error';
}

interface Props {
  id: string;
}
const props = defineProps<Props>();

const formatTimestamp = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp) return 'N/A';
  // Ensure timestamp has toDate method before calling it
  if (timestamp && typeof (timestamp as any).toDate === 'function') {
    return DateTime.fromJSDate((timestamp as Timestamp).toDate()).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
  }
  // If it's already a Date object or a string, try to parse directly
  const dt = DateTime.fromJSDate(timestamp as any); // Or DateTime.fromISO if it could be string
  if (dt.isValid) {
    return dt.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
  }
  return 'Invalid Date';
};

const studentStore = useProfileStore();
const eventStore = useEventStore();

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

const currentUserId = computed<string | null>(() => studentStore.studentId);
const currentUser = computed<EnrichedStudentData | null>(() => studentStore.currentStudent);

const nameCacheRecord = computed(() => Object.fromEntries(nameCache.value));

// Updated: isTeamEvent should only reflect the overall event format
const isTeamEvent = computed<boolean>(() => {
  return event.value?.details.format === EventFormat.Team;
});

const localIsCurrentUserOrganizer = computed<boolean>(() =>
  event.value && currentUser.value ? isEventOrganizer(event.value, currentUser.value.uid) : false
);

const localIsCurrentUserParticipant = computed<boolean>(() => {
  if (!event.value || !currentUser.value) return false;
  
  const currentUId = currentUser.value.uid;
  
  if (event.value.details.format === EventFormat.MultiEvent && event.value.details.phases) {
    return event.value.details.phases.some(phase => {
      if (phase.format === EventFormat.Team && phase.teams) {
        return phase.teams.some(team => team.members && team.members.includes(currentUId));
      } else if (phase.format === EventFormat.Individual && phase.coreParticipants) {
        return phase.coreParticipants.includes(currentUId);
      } else if (phase.format === EventFormat.Individual && phase.participants) { // Also check general participants for individual phases
        return phase.participants.includes(currentUId);
      }
      return false;
    });
  }
  
  if (event.value.details.format === EventFormat.Team && event.value.teams) {
    return event.value.teams.some(team => team.members && team.members.includes(currentUId));
  }
  
  // For overall Individual events, check coreParticipants.
  // General participants array at root level is for broader association, not specific competitive participation.
  return (event.value.details.coreParticipants || []).includes(currentUId);
});

const allAssociatedUserIds = computed<string[]>(() => {
    if (!event.value) return [];
    const userIds = new Set<string>();
    
    if (event.value.requestedBy) userIds.add(event.value.requestedBy);
    (event.value.details.organizers || []).forEach(id => { if (id) userIds.add(id); });
    
    if (event.value.details.format === EventFormat.MultiEvent && event.value.details.phases) {
      event.value.details.phases.forEach(phase => {
        (phase.participants || []).forEach(id => { if (id) userIds.add(id); });
        (phase.coreParticipants || []).forEach(id => { if (id) userIds.add(id); });
        if (phase.teams) {
          phase.teams.forEach(team => {
            (team.members || []).forEach(id => { if (id) userIds.add(id); });
          });
        }
      });
    } else {
      if (event.value.details.format === EventFormat.Team) {
          (event.value.teams || []).forEach(team => { (team.members || []).forEach(id => { if (id) userIds.add(id); }); });
      } else { // Individual
          (event.value.details.coreParticipants || []).forEach(id => { if (id) userIds.add(id); });
      }
      (event.value.participants || []).forEach(id => { if (id) userIds.add(id);}); // Also include root participants
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
  event.value && currentUser.value ? canUserSubmitToEvent(event.value, currentUser.value as any) : false
);

const canRateOrganizer = computed(() => {
  if (!event.value || !currentUser.value) return false;
  return localIsCurrentUserParticipant.value &&
         !localIsCurrentUserOrganizer.value &&
         (event.value.status === EventStatus.Completed || event.value.status === EventStatus.Closed);
});

const organizerRatingsAsArray = computed(() => {
  if (!event.value?.organizerRatings) return [];
  return Object.entries(event.value.organizerRatings).map(([userId, rating]) => ({
    ...rating,
    userId: userId,
  }));
});

const participantsFirstHalf = computed(() => {
  const participants = (event.value?.details.format === EventFormat.Individual) ? (event.value.details.coreParticipants ?? []) : [];
  return participants.slice(0, Math.ceil(participants.length / 2));
});

const participantsSecondHalf = computed(() => {
  const participants = (event.value?.details.format === EventFormat.Individual) ? (event.value.details.coreParticipants ?? []) : [];
  return participants.slice(Math.ceil(participants.length / 2));
});

// Updated: shouldShowParticipantLists should only reflect the overall Individual event format
const allParticipantsForDisplay = computed(() => {
  if (event.value?.details.format === EventFormat.Individual) {
    return event.value.details.coreParticipants ?? [];
  }
  return [];
});

const shouldShowParticipantLists = computed(() => {
  if (!event.value) return false;
  return event.value.details.format === EventFormat.Individual && (event.value.details.coreParticipants?.length ?? 0) > 0;
});


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
      const fetchedEvent = await eventStore.fetchEventDetails(props.id);
      if (!fetchedEvent) {
        throw new Error('Event not found or you do not have permission to view it.');
      }
      event.value = { ...fetchedEvent, id: props.id } as EventWithId;
      if (event.value.details.format === EventFormat.Team && Array.isArray(fetchedEvent.teams)) {
        teams.value = [...fetchedEvent.teams];
      } else {
        teams.value = [];
      }
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
  fetchData();
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

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = '/';
  }
}
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
  background: rgba(var(--bs-white-rgb), 0.9);
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

.team-list-box { 
  background-color: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius-lg); 
  box-shadow: var(--bs-box-shadow-sm);
  overflow: hidden; 
  position: relative;
  z-index: 2;
}

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

.card-header { /* This is a general .card-header, ensure it's not conflicting with more specific ones if any */
  background: linear-gradient(135deg, 
    rgba(var(--bs-primary-rgb), 0.05) 0%, 
    rgba(var(--bs-primary-rgb), 0.02) 100%);
  border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.08);
}

@media (max-width: 991.98px) {
  .sidebar-card {
    margin-top: 2rem;
  }
}

@media (max-width: 575.98px) {
  .mobile-back-button .btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
}

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

.mobile-back-button {
  position: relative;
  z-index: 3;
  
  .btn {
    font-weight: 500;
  }
}

@media (max-width: 767.98px) {
  .event-details-view {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  
  .mobile-back-button {
    margin-bottom: 1rem;
    
    .btn {
      font-weight: 500;
    }
  }
}
</style>