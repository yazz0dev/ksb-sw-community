// src/views/EventDetails.vue
<template>
    <div class="container mt-4 mb-5">
        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">Loading Event Details...</span>
            </div>
            <p class="mt-2 text-muted">Loading Event Details...</p>
        </div>
        <div v-else-if="event && typeof event.isTeamEvent === 'boolean'">
            <!-- Back Button -->
            <div class="mb-4">
                <button class="btn btn-outline-secondary btn-sm" @click="$router.back()" :disabled="actionInProgress">
                    <i class="fas fa-arrow-left me-1"></i> Back
                </button>
            </div>

            <!-- Global Action Feedback -->
            <div v-if="globalFeedback.message" :class="['alert', globalFeedback.type === 'error' ? 'alert-danger' : 'alert-success', 'alert-dismissible', 'fade', 'show']" role="alert">
                 <i :class="['fas', globalFeedback.type === 'error' ? 'fa-times-circle' : 'fa-check-circle', 'me-2']"></i>
                {{ globalFeedback.message }}
                <button type="button" class="btn-close" @click="clearGlobalFeedback" aria-label="Close"></button>
            </div>

            <!-- Event Header Card -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center flex-wrap">
                    <h2 class="mb-0 me-3 h4">{{ event.eventName }}</h2>
                    <span :class="['badge', statusBadgeClass, 'mt-1 mt-md-0', 'fs-6']">
                        <i :class="statusIconClass + ' me-1'"></i> {{ event.status }}
                    </span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong><i class="fas fa-tag me-1 text-muted"></i> Type:</strong> {{ event.eventType }}</p>
                            <p><strong><i class="far fa-calendar-alt me-1 text-muted"></i> Dates:</strong> {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}</p>
                             <p v-if="event.status === 'Pending' || event.status === 'Rejected'">
                                 <strong><i class="far fa-calendar-check me-1 text-muted"></i> Desired Dates:</strong> {{ formatDate(event.desiredStartDate) }} - {{ formatDate(event.desiredEndDate) }}
                             </p>
                            <p v-if="typeof event.isTeamEvent === 'boolean'">
                                <strong><i :class="event.isTeamEvent ? 'fas fa-users' : 'fas fa-user' + ' me-1 text-muted'"></i> Format:</strong> {{ event.isTeamEvent ? 'Team Event' : 'Individual Event' }}
                            </p>
                            <p v-if="event.status === 'Completed' || event.ratingsOpen">
                                <strong><i class="fas fa-star-half-alt me-1 text-muted"></i> Ratings:</strong>
                        <span :class="['badge', event.ratingsOpen ? 'bg-success' : 'bg-secondary']">
                                    <i :class="['fas', event.ratingsOpen ? 'fa-lock-open' : 'fa-lock', 'me-1']"></i>
                            {{ event.ratingsOpen ? 'Open' : 'Closed' }}
                        </span>
                    </p>
                        </div>
                        <div class="col-md-6">
                            <p><strong><i class="fas fa-info-circle me-1 text-muted"></i> Description:</strong></p>
                            <p style="white-space: pre-wrap;">{{ event.description || 'No description provided.' }}</p>
                            <p>
                                <strong><i class="fas fa-user-shield me-1 text-muted"></i> Organizer(s):</strong>
                                <span v-if="organizerNamesLoading" class="spinner-border spinner-border-sm text-muted ms-1" role="status" aria-hidden="true"></span>
                                <span v-else-if="event.organizers && event.organizers.length > 0">
                                    <template v-for="(orgId, index) in event.organizers" :key="orgId">
                                        <router-link :to="{ name: 'PublicProfile', params: { userId: orgId } }" class="text-decoration-none">
                                            {{ getUserNameFromCache(orgId) || 'Loading...' }}
                                        </router-link>
                                        <span v-if="index < event.organizers.length - 1">, </span>
                                    </template>
                                </span>
                                <span v-else>N/A</span>
                            </p>
                             <!-- Display XP Allocation -->
                            <div v-if="event.xpAllocation && event.xpAllocation.length > 0">
                                <strong><i class="fas fa-star me-1 text-muted"></i> Rating Criteria & XP:</strong>
                                <ul class="list-unstyled small ms-3 mt-1">
                                     <li v-for="(alloc, index) in sortedXpAllocation" :key="index">
                                         {{ alloc.constraintLabel }}: {{ alloc.points }} XP <span v-if="alloc.role !== 'general'" class="text-muted">({{ getRoleLabel(alloc.role) }})</span>
                                     </li>
                                </ul>
                            </div>
                        </div>
                    </div>


                    <!-- Participant/User Actions -->
                     <div v-if="isAuthenticated && !isAdmin && isRelevantUser" class="mt-3 pt-3 border-top">
                        <h5 class="mb-3">My Actions</h5>
                        <div class="d-flex flex-wrap gap-2">
                            <!-- Leave Event Button (Only if Upcoming and participant/team member) -->
                             <button v-if="event.status === 'Approved' && isParticipantOrTeamMember" @click="leaveEvent" :disabled="actionInProgress"
                                class="btn btn-outline-warning btn-sm">
                                <span v-if="actionInProgress && actionType === 'leave'" class="spinner-border spinner-border-sm me-1" role="status"></span>
                                <i v-else class="fas fa-sign-out-alt me-1"></i>
                                Leave Event
                            </button>

                            <!-- Submit Project Button (Only if In Progress, participant/team member, and not already submitted) -->
                             <button v-if="canSubmitProject" @click="showSubmissionModal = true" :disabled="actionInProgress"
                                class="btn btn-success btn-sm">
                                <i class="fas fa-upload me-1"></i> Submit Project
                            </button>
                            <!-- Submission Status Messages -->
                            <span v-if="event.status === 'In Progress' && hasSubmittedProject" class="text-success small align-self-center d-flex align-items-center">
                                <i class="fas fa-check-circle me-1"></i> Project Submitted
                            </span>
                            <span v-else-if="event.status === 'In Progress' && isParticipantOrTeamMember" class="text-muted small align-self-center">
                                (Submission opens when event is 'In Progress')
                            </span>
                             <!-- General Status Messages -->
                            <span v-if="(event.status === 'Completed' || event.status === 'Cancelled') && isParticipantOrTeamMember" class="text-muted small align-self-center">
                                (Actions no longer available for this event status)
                            </span>
                            <span v-if="event.status === 'Approved' && !isParticipantOrTeamMember" class="text-muted small align-self-center">
                                (You are not currently participating in this event)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Management Section (for Admin/Organizers) -->
            <div v-if="canManageEvent" class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0"><i class="fas fa-cogs me-2"></i>Event Management</h5>
                    <span v-if="actionInProgress" class="spinner-border spinner-border-sm text-primary" role="status"></span>
                </div>
                <div class="card-body">
                    <div class="row gy-2 gx-3 align-items-center">
                         <!-- Status Update Buttons -->
                        <div class="col-auto">
                            <div class="btn-group btn-group-sm">
                                <button v-if="event.status === 'Approved'" @click="updateStatus('In Progress')" class="btn btn-info"
                                    :disabled="!canActuallyMarkInProgress || actionInProgress"
                                    :title="canActuallyMarkInProgress ? 'Set event status to In Progress' : 'Can only mark in progress on or after start date (' + formatDate(event.startDate) + ')'">
                            <i class="fas fa-play me-1"></i> Mark In Progress
                        </button>
                                <button v-if="event.status === 'In Progress'" @click="updateStatus('Completed')" class="btn btn-success"
                                    :disabled="!canActuallyMarkCompleted || actionInProgress"
                                    :title="canActuallyMarkCompleted ? 'Set event status to Completed' : 'Can only mark completed on or after end date (' + formatDate(event.endDate) + ')'">
                            <i class="fas fa-check-circle me-1"></i> Mark Completed
                        </button>
                            </div>
                         </div>

                         <!-- Ratings Toggle & Winner Calc -->
                         <div class="col-auto" v-if="event.status === 'Completed'">
                            <div class="btn-group btn-group-sm">
                                 <button @click="toggleRatingsOpen(!event.ratingsOpen)" class="btn btn-secondary"
                                    :disabled="actionInProgress"
                                    :title="event.ratingsOpen ? 'Prevent new ratings' : 'Allow participants/organizers to rate'">
                                    <i :class="['fas', event.ratingsOpen ? 'fa-lock' : 'fa-lock-open', 'me-1']"></i>
                                    {{ event.ratingsOpen ? 'Close Ratings' : 'Open Ratings' }}
                    </button>
                                <button v-if="event.ratingsOpen && event.xpAllocation && event.xpAllocation.length > 0 && isDefinitelyTeamEvent" @click="calculateWinners" class="btn btn-outline-secondary"
                                    :disabled="actionInProgress || !hasEnoughRatings"
                                    :title="hasEnoughRatings ? 'Attempt automatic winner calculation based on average ratings (requires min 10 total ratings across teams)' : 'Requires at least 10 total ratings to calculate automatically'">
                                    <i class="fas fa-trophy me-1"></i> Calc Winners (Auto)
                    </button>
                            </div>
                         </div>

                        <!-- Edit & Copy Links -->
                        <div class="col-auto">
                             <div class="btn-group btn-group-sm">
                                <!-- Edit Button (Admins always, Organizers only if Pending/Rejected/Approved) -->
                                 <router-link v-if="isAdmin || (isCurrentUserOrganizer && ['Pending', 'Rejected', 'Approved'].includes(event.status))"
                                                :to="{ name: 'RequestEvent', query: { edit: event.id } }"
                                                class="btn btn-outline-primary"
                                                :class="{ disabled: actionInProgress }"
                                                :aria-disabled="actionInProgress"
                                                title="Edit event details">
                                     <i class="fas fa-edit me-1"></i> Edit
                                 </router-link>
                                <!-- Copy Rating Link (If Completed & Open) -->
                    <button v-if="event.status === 'Completed' && event.ratingsOpen" @click="copyRatingLink"
                                    class="btn btn-outline-info"
                                    :disabled="actionInProgress || linkCopied"
                                    :title="linkCopied ? 'Link Copied!' : 'Copy link for participants to rate'">
                                    <i :class="['fas', linkCopied ? 'fa-check' : 'fa-share-alt', 'me-1']"></i>
                                    {{ linkCopied ? 'Copied!' : 'Copy Rating Link' }}
                    </button>
                            </div>
                        </div>

                        <!-- Destructive Actions (Cancel/Delete) -->
                         <div class="col-12 col-md-auto ms-md-auto mt-2 mt-md-0"> <!-- Push to right on medium+ -->
                             <div class="btn-group btn-group-sm">
                                 <!-- Cancel Button (Only show if Approved) -->
                                 <button v-if="event.status === 'Approved'" @click="updateStatus('Cancelled')"
                                    class="btn btn-outline-warning" :disabled="actionInProgress"
                                    title="Cancel the event (cannot be undone)">
                                    <i class="fas fa-times-circle me-1"></i> Cancel Event
                                </button>
                                <!-- Delete Button (Admin or Organizer, but only if Pending/Rejected) -->
                                 <button v-if="(isAdmin || isCurrentUserOrganizer) && (event.status === 'Pending' || event.status === 'Rejected')" @click="deleteEvent" class="btn btn-outline-danger"
                                    :disabled="actionInProgress"
                                    title="Permanently delete this event request (cannot be undone)">
                                    <i class="fas fa-trash-alt me-1"></i> Delete Request
                    </button>
                            </div>
                        </div>
                    </div>

                    <!-- Admin Development Tools - Force Status (Visible only to Admins) -->
                    <div v-if="isAdmin" class="mt-4 pt-3 border-top">
                        <h6 class="text-muted mb-2"><i class="fas fa-flask me-1"></i>Admin Dev Tools: Force Status</h6>
                         <p class="small text-danger mb-3">Warning: Use with caution. Bypasses standard logic.</p>
                        <div class="d-flex flex-wrap gap-2">
                            <button @click="updateStatus('Pending')" class="btn btn-outline-secondary btn-sm" :disabled="actionInProgress || event.status === 'Pending'">Set Pending</button>
                            <button @click="updateStatus('Approved')" class="btn btn-outline-info btn-sm" :disabled="actionInProgress || event.status === 'Approved'">Set Approved</button>
                            <button @click="updateStatus('In Progress')" class="btn btn-outline-success btn-sm" :disabled="actionInProgress || event.status === 'In Progress'">Set In Progress</button>
                            <button @click="updateStatus('Completed')" class="btn btn-outline-primary btn-sm" :disabled="actionInProgress || event.status === 'Completed'">Set Completed</button>
                            <button @click="updateStatus('Cancelled')" class="btn btn-outline-warning btn-sm" :disabled="actionInProgress || event.status === 'Cancelled'">Set Cancelled</button>
                            <button @click="updateStatus('Rejected')" class="btn btn-outline-danger btn-sm" :disabled="actionInProgress || event.status === 'Rejected'">Set Rejected</button>
                        </div>
                    </div>
                    <!-- End Admin Development Tools -->

                </div>
            </div>


             <!-- Winner Display Card -->
             <div v-if="displayWinners && displayWinners.length > 0" class="card border-warning mb-4 bg-light-subtle">
                 <div class="card-body text-center">
                     <h4 class="text-warning mb-2"><i class="fas fa-award me-2"></i>Event Winner<span v-if="displayWinners.length > 1">s</span>!</h4>
                     <div v-for="winner in displayWinners" :key="winner.id || winner.name" class="lead mb-1 fw-medium">
                        <i :class="[event.isTeamEvent ? 'fas fa-users' : 'fas fa-user', 'me-2 text-muted']"></i>
                        <!-- Link winner name if it's a user -->
                        <router-link v-if="!event.isTeamEvent && winner.id" :to="{ name: 'PublicProfile', params: { userId: winner.id } }" class="text-decoration-none">
                            {{ winner.name }}
                        </router-link>
                        <span v-else>{{ winner.name }}</span> <!-- Display team name or fallback ID -->
                         <span v-if="winner.role" class="badge bg-secondary ms-2">{{ getRoleLabel(winner.role) }}</span>
                     </div>
                </div>
            </div>

            <!-- NEW: Organization Rating Section -->
            <div v-if="canRateOrganization" class="card mb-4">
                <div class="card-header">
                    <h5 class="mb-0"><i class="fas fa-poll me-2"></i>Rate Event Organization</h5>
                </div>
                <div class="card-body">
                    <p class="text-muted small mb-3">Your feedback helps organizers improve future events. How would you rate the overall organization?</p>
                    <!-- Feedback Message -->
                    <div v-if="orgRatingFeedback.message" 
                         :class="['alert', 'alert-sm', orgRatingFeedback.type === 'error' ? 'alert-danger' : 'alert-success']" 
                         role="alert">
                         {{ orgRatingFeedback.message }}
                    </div>

                    <!-- Rating Input (Radio Buttons 1-5) -->
                    <div class="mb-3 d-flex justify-content-center flex-wrap"> 
                        <div v-for="score in 5" :key="`org-rate-${score}`" class="form-check form-check-inline mx-2">
                            <input class="form-check-input" 
                                   type="radio" 
                                   :id="`orgRating${score}`" 
                                   :value="score" 
                                   v-model.number="organizationRatingScore" 
                                   :disabled="isSubmittingOrgRating">
                            <label class="form-check-label" :for="`orgRating${score}`">
                                {{ score }} <i class="fas fa-star text-warning"></i>
                            </label>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <div class="text-center">
                        <button @click="submitOrganizationRatingHandler" 
                                class="btn btn-primary btn-sm" 
                                :disabled="isSubmittingOrgRating || organizationRatingScore === null">
                            <span v-if="isSubmittingOrgRating" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            {{ isSubmittingOrgRating ? 'Submitting...' : 'Submit Organization Rating' }}
                        </button>
                    </div>
                     <p class="text-muted small mt-3 text-center">(Note: You can currently submit a rating multiple times.)</p>
                </div>
            </div>
            <!-- END NEW Section -->

            <!-- Teams Section (Display Only for Team Events - check property exists) -->
            <div v-if="isDefinitelyTeamEvent" class="mb-4">
                <h3 class="mb-3"><i class="fas fa-users me-2 text-muted"></i> Teams</h3>
                <TeamList v-if="event.teams && event.teams.length > 0" :teams="event.teams" :eventId="id"
                    :ratingsOpen="event.ratingsOpen && event.status === 'Completed'"
                    :get-user-name="getUserNameFromCache"
                    :organizer-names-loading="organizerNamesLoading"
                    :current-user-uid="currentUser?.uid"
                    :event-winners="event.winnersPerRole || (event.winners ? { default: event.winners } : {})"
                    :is-team-event="event?.isTeamEvent"
                    :current-user-has-rated-team="hasRatedAnyTeam">
                </TeamList>
                <p v-else class="alert alert-light">No teams defined for this event.</p>
            </div>

            <!-- Participants Section (Display Only for Individual Events - check property exists) -->
            <div v-else-if="!isDefinitelyTeamEvent" class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h3 class="mb-0"><i class="fas fa-user-friends me-2 text-muted"></i> Participants</h3>
                    <!-- Add Rating/Select Winners Button for Individual Events -->
                    <div v-if="event.ratingsOpen && event.status === 'Completed' && canManageEvent">
                         <button @click="goToWinnerSelection" class="btn btn-primary btn-sm" v-if="canRateEvent">
                            <i class="fas fa-trophy me-1"></i>
                             {{ alreadyRated ? 'View/Edit Ratings' : 'Rate Participants / Select Winners' }}
                        </button>
                        <span v-else-if="alreadyRated" class="text-muted small">
                             (Ratings Submitted)
                        </span>
                    </div>
                    </div>

                <div v-if="event.participants && event.participants.length > 0">
                    <ul class="list-group">
                        <li v-for="participantId in sortedParticipants" :key="participantId"
                            class="list-group-item d-flex justify-content-between align-items-center"
                            :class="{ 'list-group-item-primary': participantId === currentUser?.uid }">
                            <div class="d-flex align-items-center">
                                <i v-if="isWinner(participantId)" class="fas fa-award text-warning me-2 fa-fw" title="Winner"></i>
                                <i v-else class="fas fa-user me-2 text-muted fa-fw"></i>
                                <router-link :to="{ name: 'PublicProfile', params: { userId: participantId } }" class="text-decoration-none text-dark fw-medium">
                                    {{ getUserNameFromCache(participantId) || 'Loading...' }}
                                </router-link>
                                 <span v-if="participantId === currentUser?.uid" class="badge bg-primary rounded-pill ms-2">You</span>
                            </div>
                        </li>
                    </ul>
                </div>
                <p v-else class="alert alert-light">No participants found for this event. Students may have left or none were added.</p>
            </div>

            <!-- Display Submissions Section -->
            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="mb-0 h5"><i class="fas fa-paperclip me-2"></i> Project Submissions</h3>
                </div>
                <div class="card-body">
                    <div v-if="loadingSubmissions" class="text-center">
                        <div class="spinner-border spinner-border-sm text-muted" role="status"></div>
                         <span class="ms-2 text-muted small">Loading submissions...</span>
                    </div>
                    <div v-else-if="submissions.length === 0" class="alert alert-light mb-0 text-center">
                        <i class="fas fa-folder-open fa-2x text-muted mb-2"></i><br>
                         No projects submitted yet.
                    </div>
                    <ul v-else class="list-group list-group-flush">
                        <li v-for="(sub, index) in submissions" :key="`sub-${index}-${sub.submittedBy}`" class="list-group-item px-0 py-3">
                            <div class="d-flex justify-content-between align-items-start">
                                 <div>
                                     <h6 class="mb-1 fw-semibold">{{ sub.projectName }}</h6>
                                     <p class="mb-1 small text-muted" v-if="sub.description">{{ sub.description }}</p>
                                     <span class="text-muted small">
                                         Submitted by: {{ getSubmitterDisplayName(sub.submittedBy) }}
                                     </span>
                                </div>
                                <a :href="sub.link" target="_blank" rel="noopener noreferrer" v-if="sub.link"
                                   class="btn btn-sm btn-outline-primary ms-3 flex-shrink-0">
                                    <i class="fas fa-external-link-alt me-1"></i> View Link
                                </a>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>


            <!-- Project Submission Modal -->
            <div class="modal fade" id="submissionModal" tabindex="-1" aria-labelledby="submissionModalLabel" aria-hidden="true" ref="submissionModalRef">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="submissionModalLabel"><i class="fas fa-upload me-2"></i> Submit Project Details</h5>
                            <button type="button" class="btn-close" aria-label="Close" @click="closeSubmissionModal"></button>
                        </div>
                        <form @submit.prevent="submitProject">
                            <div class="modal-body">
                                <div v-if="submissionError" class="alert alert-danger alert-sm">{{ submissionError }}</div>
                                <div class="mb-3">
                                    <label for="projectName" class="form-label">Project Name <span class="text-danger">*</span></label>
                                    <input type="text" v-model.trim="submissionForm.projectName" id="projectName" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label for="projectLink" class="form-label">Project Link (GitHub, Demo, etc.) <span class="text-danger">*</span></label>
                                    <input type="url" v-model.trim="submissionForm.link" id="projectLink" class="form-control" required placeholder="https://...">
                                    <div class="form-text">Must be a valid URL (e.g., https://github.com/...)</div>
                                </div>
                                <div class="mb-3">
                                    <label for="projectDescription" class="form-label">Brief Description</label>
                                    <textarea v-model.trim="submissionForm.description" id="projectDescription" class="form-control" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-outline-secondary" @click="closeSubmissionModal">Cancel</button>
                                <button type="submit" class="btn btn-primary" :disabled="isSubmittingProject">
                                    <span v-if="isSubmittingProject" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    {{ isSubmittingProject ? 'Submitting...' : 'Submit Project' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

        </div>
        <div v-else-if="!loading && initialFetchError" class="alert alert-danger">
             <i class="fas fa-exclamation-triangle me-2"></i> Error loading event: {{ initialFetchError }}
        </div>
        <div v-else class="alert alert-warning text-center">
            <i class="fas fa-ghost fa-2x mb-2"></i><br>
            Event not found or you do not have permission to view it.
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '../components/TeamList.vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Modal } from 'bootstrap';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Props, Store, Router
const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();
const route = useRoute();

// --- State Refs ---
const loading = ref(true);
const event = ref(null); // Holds reactive event data from store
const initialFetchError = ref(''); // Error during initial load
const linkCopied = ref(false);
const nameCache = ref(new Map()); // Use Map for better performance
const teamNameCache = ref(new Map()); // Cache for team names by ID if needed
const organizerNamesLoading = ref(false);
const submissionModalRef = ref(null);
let submissionModalInstance = null;
const showSubmissionModal = ref(false);
const submissionForm = ref({ projectName: '', link: '', description: '' });
const submissionError = ref(''); // Specific error for submission modal
const isSubmittingProject = ref(false);
const loadingSubmissions = ref(false);
const actionInProgress = ref(false); // Generic flag for any background action
const actionType = ref(''); // To identify which action is in progress
const orgRatingFeedback = ref({ message: '', type: 'success' }); // Feedback for org rating
const organizationRatingScore = ref(null); // v-model for org rating input
const isSubmittingOrgRating = ref(false); // Loading state for org rating submission

// Global Feedback (for actions like status update, delete, etc.)
const globalFeedback = ref({ message: '', type: 'success' }); // type: 'success' or 'error'

function setGlobalFeedback(message, type = 'success', duration = 4000) {
    globalFeedback.value = { message, type };
    if (duration > 0) {
        setTimeout(clearGlobalFeedback, duration);
    }
}
function clearGlobalFeedback() {
    globalFeedback.value = { message: '', type: 'success' };
}

// Available Roles (Match RequestEvent.vue)
const availableRoles = [
    { value: 'fullstack', label: 'Full Stack Developer' },
    { value: 'presenter', label: 'Presenter' },
    { value: 'designer', label: 'Designer' },
    { value: 'problemSolver', label: 'Problem Solver' },
    { value: 'general', label: 'General' }
];

// --- Fetch User Names ---
async function fetchUserNames(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    organizerNamesLoading.value = true;
    const uniqueIds = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));
    if (uniqueIds.length === 0) {
        organizerNamesLoading.value = false;
        return;
    }

    // console.log("Fetching names for IDs:", uniqueIds);

    try {
        const chunkSize = 30; // Firestore 'in' query limit
        for (let i = 0; i < uniqueIds.length; i += chunkSize) {
            const chunk = uniqueIds.slice(i, i + chunkSize);
            // console.log(`Fetching chunk ${i / chunkSize + 1}:`, chunk);
            if (chunk.length > 0) {
                // Use the Vuex action which might handle batching or individual fetches
                const names = await store.dispatch('user/fetchUserNamesBatch', chunk); // Assuming this action exists
                // Update local cache
                chunk.forEach(id => {
                    nameCache.value.set(id, names[id] || id); // Store fetched name or ID as fallback
                });
            }
        }
    } catch (error) {
        console.error("Error fetching user names batch:", error);
        // Fallback: set IDs in cache to prevent repeated failed fetches
        uniqueIds.forEach(id => { if (!nameCache.value.has(id)) nameCache.value.set(id, id); });
    } finally {
        organizerNamesLoading.value = false;
    }
}

// --- Watch Store Getter for Event Data ---
const eventFromStore = computed(() => store.getters['events/currentEventDetails']);

watch(eventFromStore, (newEventData) => {
    // console.log("Watcher: eventFromStore updated", newEventData);
    if (newEventData && newEventData.id === props.id) {
        event.value = newEventData;

        // Collect all relevant user IDs from the new event data
        const idsToFetch = new Set();
        (newEventData.organizers || []).forEach(id => idsToFetch.add(id));
        // Add requester if not already an organizer (relevant for pending/rejected)
        if (newEventData.requester) idsToFetch.add(newEventData.requester);
        (newEventData.participants || []).forEach(id => idsToFetch.add(id));
        (newEventData.teams || []).forEach(team => (team.members || []).forEach(id => idsToFetch.add(id)));
        // Collect submitter IDs (handle both team and individual)
        if (newEventData.isTeamEvent) {
            (newEventData.teams || []).forEach(team => (team.submissions || []).forEach(s => { if (s.submittedBy) idsToFetch.add(s.submittedBy); })); // Team submissions store submitter ID
        } else {
            (newEventData.submissions || []).forEach(sub => { if (sub.submittedBy) idsToFetch.add(sub.submittedBy); }); // Individual submissions store submitter ID
        }
        (newEventData.winners || []).forEach(id => idsToFetch.add(id)); // Add legacy winners
        Object.values(newEventData.winnersPerRole || {}).flat().forEach(id => idsToFetch.add(id)); // Add role-based winners
        (newEventData.ratings || []).forEach(rating => idsToFetch.add(rating.ratedBy)); // Add raters
        (newEventData.teams || []).forEach(team => (team.ratings || []).forEach(rating => idsToFetch.add(rating.ratedBy))); // Add team raters

        fetchUserNames(Array.from(idsToFetch)); // Fetch names based on updated IDs
        loading.value = false; // Ensure loading stops
        initialFetchError.value = ''; // Clear initial error if data is now present
    } else if (!loading.value && eventFromStore.value?.id !== props.id) {
        // Handle case where store details change to a *different* event or becomes null
        // console.log("Watcher: Event in store is different or null");
        // Don't set event.value to null immediately, wait for fetchAndSetEventInitial if needed
        // or let the initial fetch handle not found cases.
        // Maybe set loading to true again if we expect a new fetch?
        // loading.value = true; // Re-enable loading if navigating between event pages
    }
}, { immediate: true, deep: true });

// --- Initial Fetch Function ---
const fetchAndSetEventInitial = async () => {
    loading.value = true;
    initialFetchError.value = '';
    clearGlobalFeedback();
    try {
        // console.log(`Initial fetch for event ID: ${props.id}`);
        const eventData = await store.dispatch('events/fetchEventDetails', props.id);
        if (!eventData) {
            // console.log(`Event ${props.id} not found during initial fetch.`);
            initialFetchError.value = `Event with ID ${props.id} not found or access denied.`;
            event.value = null; // Explicitly set to null if not found
            // No need to fetch names if event is not found
        } else {
             // Watcher will handle setting event.value and fetching names
             // console.log(`Event ${props.id} found, watcher should handle it.`);
             // If the watcher didn't trigger immediately (e.g., cached data was identical but we need fresh names)
             // We might need to manually trigger name fetching here. Check if event.value is set by watcher.
            if (!event.value || event.value.id !== props.id) {
                 event.value = eventData; // Manually set if watcher missed it
                 const userIds = new Set();
                 (eventData.organizers || []).forEach(id => userIds.add(id));
                 if (eventData.requester) userIds.add(eventData.requester);
                 (eventData.participants || []).forEach(id => userIds.add(id));
                 (eventData.teams || []).forEach(team => (team.members || []).forEach(id => userIds.add(id)));
                // Add submitters, winners, raters as in the watcher
                 if (eventData.isTeamEvent) {
                    (eventData.teams || []).forEach(team => (team.submissions || []).forEach(s => { if (s.submittedBy) userIds.add(s.submittedBy); }));
                 } else {
                     (eventData.submissions || []).forEach(sub => { if (sub.submittedBy) userIds.add(sub.submittedBy); });
                 }
                 (eventData.winners || []).forEach(id => userIds.add(id));
                 Object.values(eventData.winnersPerRole || {}).flat().forEach(id => userIds.add(id));
                 (eventData.ratings || []).forEach(rating => userIds.add(rating.ratedBy));
                 (eventData.teams || []).forEach(team => (team.ratings || []).forEach(rating => userIds.add(rating.ratedBy)));

                await fetchUserNames(Array.from(userIds));
            }
        }
    } catch (error) {
        console.error('Error fetching event:', error);
        initialFetchError.value = error.message || 'Failed to load event details.';
        event.value = null;
    } finally {
        loading.value = false;
    }
};

// --- Lifecycle Hooks ---
onMounted(async () => {
    await fetchAndSetEventInitial(); // Fetch data when component mounts
    // Modal setup
    if (submissionModalRef.value) {
        submissionModalInstance = new Modal(submissionModalRef.value);
        submissionModalRef.value.addEventListener('hidden.bs.modal', () => {
            showSubmissionModal.value = false;
            submissionForm.value = { projectName: '', link: '', description: '' };
            submissionError.value = '';
            isSubmittingProject.value = false;
        });
    }
});
onUnmounted(() => {
     submissionModalInstance?.dispose();
     store.commit('events/clearCurrentEventDetails'); // Correct mutation name
});

watch(showSubmissionModal, (newValue) => {
    if (!submissionModalInstance) { return; }
    try { if (newValue) { submissionModalInstance.show(); } else { submissionModalInstance.hide(); } }
    catch (e) { console.error("Modal show/hide error:", e); }
});
const closeSubmissionModal = () => { showSubmissionModal.value = false; };

// --- Computed Properties ---
const currentUser = computed(() => store.getters['user/getUser']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin');
const isCurrentUserOrganizer = computed(() => {
     if (!currentUser.value || !event.value || !Array.isArray(event.value.organizers)) return false;
     return event.value.organizers.includes(currentUser.value.uid);
});
const canManageEvent = computed(() => isAdmin.value || isCurrentUserOrganizer.value);

// Status Badge and Icon
const statusBadgeClass = computed(() => {
    if (!event.value) return 'bg-light text-dark';
    switch (event.value.status) {
        case 'Approved': return 'bg-info text-dark';
        case 'In Progress': return 'bg-success text-white';
        case 'Completed': return 'bg-secondary text-white';
        case 'Cancelled': return 'bg-danger text-white';
        case 'Rejected': return 'bg-danger text-white';
        case 'Pending': return 'bg-warning text-dark';
        default: return 'bg-light text-dark';
    }
});
const statusIconClass = computed(() => {
     if (!event.value) return 'fa-question-circle';
     switch (event.value.status) {
         case 'Approved': return 'fa-thumbs-up';
         case 'In Progress': return 'fa-running';
         case 'Completed': return 'fa-check-circle';
         case 'Cancelled': return 'fa-ban';
         case 'Rejected': return 'fa-times-circle';
         case 'Pending': return 'fa-hourglass-half';
         default: return 'fa-question-circle';
     }
});

const isParticipantOrTeamMember = computed(() => {
    // Add defensive checks
    if (!currentUser.value || !event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('isParticipantOrTeamMember: event or isTeamEvent invalid');
        return false;
    }
    const userId = currentUser.value.uid;
    // Check participants array for individual events
    if (!event.value.isTeamEvent) {
        return Array.isArray(event.value.participants) && event.value.participants.includes(userId);
    }
    // Check teams array for team events
    return Array.isArray(event.value.teams) && event.value.teams.some(team => Array.isArray(team.members) && team.members.includes(userId));
});

// Is the current user relevant (participant, team member, or organizer)?
const isRelevantUser = computed(() => {
     // Add event.value check
     if (!currentUser.value || !event.value) return false;
     return isParticipantOrTeamMember.value || isCurrentUserOrganizer.value;
});

const hasSubmittedProject = computed(() => {
    // Add defensive checks
    if (!currentUser.value || !event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('hasSubmittedProject: event or isTeamEvent invalid');
        return false;
    }
    // Delegate primary check to isParticipantOrTeamMember
    if (!isParticipantOrTeamMember.value) return false;

    const userId = currentUser.value.uid;

    if (event.value.isTeamEvent) {
        // Find the team the user belongs to
        const userTeam = (event.value.teams || []).find(team => team.members?.includes(userId));
        // Check if that team has any submissions (assuming team submits once)
        return userTeam?.submissions?.length > 0;
    } else {
        // Check if there's any submission by this participant ID
        // Assuming submissions array has objects like { submittedBy: 'userId', ... }
        return (event.value.submissions || []).some(sub => sub.submittedBy === userId);
    }
});

const canSubmitProject = computed(() => {
    // Must be 'In Progress', user must be a participant/member, and haven't submitted yet
    // Add event.value check
    return event.value && event.value.status === 'In Progress' && isParticipantOrTeamMember.value && !hasSubmittedProject.value;
});

const submissions = computed(() => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('submissions: event or isTeamEvent invalid');
        return [];
    }
    loadingSubmissions.value = true; // Set loading true initially
    let subs = [];
    if (event.value.isTeamEvent && Array.isArray(event.value.teams)) {
        event.value.teams.forEach(team => {
            (team.submissions || []).forEach(s => {
                // Try to find the user who submitted within the team members
                 // Assume submission object has { link, projectName, description, submittedBy: userId }
                subs.push({ ...s, submitterDisplayName: getSubmitterDisplayName(s.submittedBy, team.teamName) });
            });
        });
    } else if (!event.value.isTeamEvent && Array.isArray(event.value.submissions)) {
        // Assume submission object has { link, projectName, description, submittedBy: userId }
        subs = event.value.submissions.map(s => ({ ...s, submitterDisplayName: getSubmitterDisplayName(s.submittedBy) }));
    }
    loadingSubmissions.value = false;
    // Sort by project name
    return subs.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
});

const sortedParticipants = computed(() => {
    if (!event.value || !Array.isArray(event.value.participants)) return [];
    return [...event.value.participants].sort((a, b) => {
        const nameA = getUserNameFromCache(a) || a;
        const nameB = getUserNameFromCache(b) || b;
        return nameA.localeCompare(nameB);
    });
});

// Sort XP Allocation by index for display
const sortedXpAllocation = computed(() => {
    if (!event.value || !Array.isArray(event.value.xpAllocation)) return [];
    // Clone and sort
    return [...event.value.xpAllocation].sort((a, b) => (a.constraintIndex ?? 0) - (b.constraintIndex ?? 0));
});

const canActuallyMarkInProgress = computed(() => {
    // Add event.value check
    if (!event.value || event.value.status !== 'Approved') return false;
    if (!event.value.startDate || !(event.value.startDate instanceof Timestamp)) return false;
    const now = new Date();
    const startDate = event.value.startDate.toDate();
    // Compare date part only
    startDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return now >= startDate;
});

const canActuallyMarkCompleted = computed(() => {
    // Add event.value check
    if (!event.value || event.value.status !== 'In Progress') return false;
    if (!event.value.endDate || !(event.value.endDate instanceof Timestamp)) return false;
    const now = new Date();
    const endDate = event.value.endDate.toDate();
    // Compare date part only
     endDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return now >= endDate;
});

// Check if the current user has already rated (for individual events)
const alreadyRated = computed(() => {
     // Add defensive checks
     if (!currentUser.value || !event.value || typeof event.value.isTeamEvent !== 'boolean' || event.value.isTeamEvent) {
        // console.warn('alreadyRated: prerequisites not met');
        return false;
     }
     // Check specifically for a 'winner_selection' rating type by the current user
     return (event.value.ratings || []).some(r => r.ratedBy === currentUser.value.uid && r.type === 'winner_selection');
});

// Combined winners from both formats for display
const displayWinners = computed(() => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('displayWinners: event or isTeamEvent invalid');
        return [];
    }
    const winnersMap = new Map(); // Use map to handle potential duplicates/role overrides

    // Process role-based winners first
    if (event.value.winnersPerRole) {
        for (const [role, winnerIds] of Object.entries(event.value.winnersPerRole)) {
            (winnerIds || []).forEach(id => {
                // Check isTeamEvent here before accessing getUserNameFromCache
                const name = event.value.isTeamEvent ? id : (getUserNameFromCache(id) || id);
                winnersMap.set(id, { id: id, name: name, role: role === 'default' ? null : role });
            });
        }
    }

    // Process legacy winners (add if not already present with a role)
    if (Array.isArray(event.value.winners)) {
        event.value.winners.forEach(id => {
            if (!winnersMap.has(id)) {
                // Check isTeamEvent here before accessing getUserNameFromCache
                const name = event.value.isTeamEvent ? id : (getUserNameFromCache(id) || id);
                winnersMap.set(id, { id: id, name: name, role: null });
            }
        });
    }

    return Array.from(winnersMap.values());
});

// Check if the current user has rated ANY team in this event
const hasRatedAnyTeam = computed(() => {
    // Defensive checks
    if (!currentUser.value || !event.value || !event.value.isTeamEvent || !Array.isArray(event.value.teams)) {
        return false;
    }
    const userId = currentUser.value.uid;
    // Check if *any* team's ratings array includes a rating by the current user
    return event.value.teams.some(team => 
        Array.isArray(team.ratings) && team.ratings.some(rating => rating.ratedBy === userId)
    );
});

// Add computed property for safer template access
const isDefinitelyTeamEvent = computed(() => event.value?.isTeamEvent === true);

// Computed property to check if the user should see the org rating section
const canRateOrganization = computed(() => {
    // Check event status, user participation, and authentication
    return event.value?.status === 'Completed' && isAuthenticated.value && isParticipantOrTeamMember.value;
});

// --- Methods ---
const formatDate = (timestamp) => {
     if (timestamp?.seconds) {
         // Use toLocaleDateString for locale-aware formatting
         return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
     }
     return 'N/A';
};

const getUserNameFromCache = (userId) => {
     if (!userId) return null;
     return nameCache.value.get(userId) || null; // Return null if not found
};

// Helper to get display name for submitter (user or team)
const getSubmitterDisplayName = (submitterId, teamName = null) => {
     // Add defensive checks
     if (!event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('getSubmitterDisplayName: event or isTeamEvent invalid');
        return submitterId || 'Unknown'; // Fallback
     }
     if (event.value.isTeamEvent) {
         // For team events, submission might store team name or submitting user ID
         // Prioritize team name if available
         return teamName || getUserNameFromCache(submitterId) || submitterId || 'Unknown Team/User';
     }
     // For individual events, it's the user ID
     return getUserNameFromCache(submitterId) || submitterId || 'Anonymous User';
};

const getRoleLabel = (roleValue) => {
    const role = availableRoles.find(r => r.value === roleValue);
    return role ? role.label : (roleValue || 'General');
};

// --- Action Handlers with Loading/Error Feedback ---

const performAction = async (actionName, actionFn, successMessage) => {
    if (actionInProgress.value) return; // Prevent concurrent actions
    actionInProgress.value = true;
    actionType.value = actionName;
    clearGlobalFeedback();
    try {
        await actionFn();
        setGlobalFeedback(successMessage, 'success');
    } catch (error) {
        console.error(`${actionName} error:`, error);
        setGlobalFeedback(error.message || `Failed to ${actionName}.`, 'error', 0); // Keep error message visible
    } finally {
        actionInProgress.value = false;
        actionType.value = '';
    }
};

const updateStatus = async (newStatus) => {
    // Add event.value check
    if (!event.value) return;

    // Confirmation for Cancel
    if (newStatus === 'Cancelled' && !confirm(`Are you sure you want to cancel the event "${event.value.eventName}"? This action cannot be undone.`)) return;

    await performAction('update status', async () => {
        await store.dispatch('events/updateEventStatus', { eventId: props.id, newStatus });
    }, `Event status successfully updated to ${newStatus}.`);
};

const toggleRatingsOpen = async (isOpen) => {
    // Add event.value check
    if (!event.value) return;
    const actionText = isOpen ? 'open ratings' : 'close ratings';
    await performAction(actionText, async () => {
         // The action now returns a status object, check it
        const result = await store.dispatch('events/toggleRatingsOpen', { eventId: props.id, isOpen });
        if (result.status === 'error') {
             // Throw error to be caught by performAction's catch block
             throw new Error(result.message || `Failed to ${actionText}.`);
         }
         // No explicit success message needed here if UI updates reactively
    }, `Ratings successfully ${isOpen ? 'opened' : 'closed'}.`);
};

const deleteEvent = async () => {
    // Add event.value check
    if (!event.value || !canManageEvent.value) return;
    if (confirm(`PERMANENTLY DELETE the event request "${event.value.eventName}"? This cannot be undone.`)) {
        await performAction('delete event', async () => {
            await store.dispatch('events/deleteEvent', props.id);
            // Navigate away after successful deletion
             setGlobalFeedback('Event deleted successfully.', 'success', 0); // Keep message until navigation
            router.push(isAdmin.value ? '/manage-requests' : '/home');
        }, ''); // Success message handled before navigation
    }
};

const calculateWinners = async () => {
    // Add event.value check
    if (!event.value) return;
    await performAction('calculate winners', async () => {
        // Action might show its own alerts, but we catch errors here
        await store.dispatch('events/calculateWinners', props.id);
    }, 'Winner calculation initiated.'); // Or adjust message based on action's return
};

const copyRatingLink = async () => {
    // Use event ID to construct the specific rating link
     // Assuming the route is '/rating/:eventId'
     const ratingBaseUrl = `${window.location.origin}/rating/${props.id}`;
     let linkToCopy = ratingBaseUrl;

     // For team events, maybe copy the base link? Or provide instructions?
     // For individual events, the base link is fine.
     // Let's just copy the base link for now.

    clearGlobalFeedback();
    try {
        await navigator.clipboard.writeText(linkToCopy);
        linkCopied.value = true;
         setGlobalFeedback('Rating link copied to clipboard!', 'success');
        setTimeout(() => { linkCopied.value = false; }, 2500);
    } catch (err) {
        console.error('Copy failed: ', err);
         setGlobalFeedback('Failed to copy link to clipboard.', 'error');
    }
};

const submitProject = async () => {
    submissionError.value = '';
    if (!submissionForm.value.projectName || !submissionForm.value.link) {
        submissionError.value = 'Project Name and Link are required.';
        return;
    }
    // Basic URL validation
    try {
        new URL(submissionForm.value.link);
    } catch (_) {
        submissionError.value = 'Please enter a valid URL (e.g., https://...).';
        return;
    }

    isSubmittingProject.value = true;
    // No need for performAction here as feedback is inside the modal
    try {
        await store.dispatch('events/submitProjectToEvent', {
             eventId: props.id,
             submissionData: { ...submissionForm.value }
        });
        closeSubmissionModal(); // Close modal on success
        setGlobalFeedback('Project submitted successfully!', 'success'); // Show global feedback
    } catch (error) {
        console.error("Submit project error:", error);
        submissionError.value = `Submission failed: ${error.message || 'Unknown error'}`; // Show error in modal
    } finally {
        isSubmittingProject.value = false;
    }
};

const leaveEvent = async () => {
    // Add event.value check
    if (!event.value || !isParticipantOrTeamMember.value) return;
    if (confirm('Are you sure you want to leave this event? You may not be able to rejoin.')) {
        await performAction('leave event', async () => {
            await store.dispatch('events/leaveEvent', props.id);
        }, 'You have successfully left the event.');
    }
};

// Navigate to Rating Form (Individual Winner Selection)
const goToWinnerSelection = () => {
    // Add event.value check
    if (!event.value) return;
    router.push({
        name: 'RatingForm', // Ensure this matches your router definition
        params: { eventId: props.id } // Pass eventId
    });
};

// Check if a participant is a winner (handles both formats)
const isWinner = (participantId) => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean' || !participantId) {
        // console.warn('isWinner: prerequisites not met');
        return false;
    }
    // Check new format first
    if (event.value.winnersPerRole) {
        for (const winnerIds of Object.values(event.value.winnersPerRole)) {
            if (Array.isArray(winnerIds) && winnerIds.includes(participantId)) {
                return true;
            }
        }
    }
    // Check legacy format
    return Array.isArray(event.value.winners) && event.value.winners.includes(participantId);
};

// Check if enough ratings exist for automatic calculation
const hasEnoughRatings = computed(() => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('hasEnoughRatings: event or isTeamEvent invalid');
        return false;
    }
    const minRatings = 10; // Or configure elsewhere
    let totalRatings = 0;

    if (event.value.isTeamEvent && Array.isArray(event.value.teams)) {
        totalRatings = event.value.teams.reduce((sum, team) => sum + (Array.isArray(team.ratings) ? team.ratings.length : 0), 0);
    } else if (!event.value.isTeamEvent && Array.isArray(event.value.ratings)) {
        totalRatings = event.value.ratings.length;
    }
    return totalRatings >= minRatings;
});

// Can the current user rate/select winners for this event?
// For individual: Organizer can rate if open
// For team: Managed via TeamList component currently
const canRateEvent = computed(() => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean' || !event.value.ratingsOpen || event.value.status !== 'Completed') {
        // console.warn('canRateEvent: prerequisites not met');
        return false;
    }
    if (event.value.isTeamEvent) return false; // Handled in TeamList
    return canManageEvent.value; // Only managers rate individual events directly on this page
});

// Method to handle organization rating submission
const submitOrganizationRatingHandler = async () => {
    if (organizationRatingScore.value === null) {
        orgRatingFeedback.value = { message: 'Please select a rating (1-5 stars).', type: 'error' };
        return;
    }
    if (!event.value?.id) {
         orgRatingFeedback.value = { message: 'Event ID is missing.', type: 'error' };
        return;
    }

    isSubmittingOrgRating.value = true;
    orgRatingFeedback.value = { message: '', type: 'success' }; // Clear previous feedback

    try {
        await store.dispatch('events/submitOrganizationRating', {
            eventId: props.id,
            score: organizationRatingScore.value
        });
        orgRatingFeedback.value = { message: 'Organization rating submitted successfully!', type: 'success' };
        // Consider disabling the form after successful submission if desired
        // organizationRatingScore.value = null; // Optionally clear selection
    } catch (error) {
        console.error("Organization rating submission error:", error);
        orgRatingFeedback.value = { message: `Submission failed: ${error.message || 'Unknown error'}`, type: 'error' };
    } finally {
        isSubmittingOrgRating.value = false;
    }
};

</script>

<style scoped>
/* Styles rely on main.css and utilities */
.card-header .badge {
    font-size: 0.9em; /* Make header badge slightly larger */
    padding: 0.4em 0.7em;
}

/* Highlight current user in participant list */
.list-group-item-primary {
    border-left: 4px solid var(--color-primary); /* Use theme variable */
    font-weight: 500;
}


/* Ensure icons have fixed width for alignment */
.fa-fw {
    text-align: center;
    width: 1.25em;
}

/* Style winner card */
.border-warning {
    border-width: 2px !important;
}

/* Fade effect for copied message */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Add some spacing for the radio buttons */
.form-check-inline {
    margin-bottom: 0.5rem; /* Add space below radios when wrapping */
}
</style>
