<template>
  <form @submit.prevent="handleSubmit" class="mb-5">
    <!-- Event Details Card -->
    <div class="card shadow-sm mb-4">
      <div class="card-body p-4 p-lg-5">
        <h3 class="h4 mb-4">Event Details</h3>

        <div class="mb-3">
          <label class="form-label">Event Format <span class="text-danger">*</span></label>
          <div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="eventFormat" id="formatIndividual" value="Individual" v-model="formData.details.format" @change="handleFormatChange" :disabled="isSubmitting">
              <label class="form-check-label" for="formatIndividual">Individual</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="eventFormat" id="formatTeam" value="Team" v-model="formData.details.format" @change="handleFormatChange" :disabled="isSubmitting">
              <label class="form-check-label" for="formatTeam">Team</label>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <label for="eventName" class="form-label">Event Name <span class="text-danger">*</span></label>
          <input
            id="eventName"
            class="form-control"
            type="text"
            v-model="formData.details.eventName"
            :disabled="isSubmitting"
            placeholder="Enter event name"
            required
          />
        </div>

        <div class="mb-3">
          <label for="eventType" class="form-label">Event Type <span class="text-danger">*</span></label>
           <div class="input-group">
              <span class="input-group-text"><i class="fas fa-tag"></i></span>
              <select
                id="eventType"
                class="form-select"
                v-model="formData.details.type"
                :disabled="isSubmitting"
                @change="handleEventTypeChange"
                required
              >
                <option value="" disabled>Select Type</option>
                <option
                    v-for="type in availableEventTypes"
                    :key="type"
                    :value="type"
                >{{ type }}</option>
              </select>
           </div>
        </div>

        <div class="mb-3">
          <label for="eventDescription" class="form-label">Description <span class="text-danger">*</span></label>
          <textarea
            id="eventDescription"
            class="form-control"
            rows="4"
            v-model="formData.details.description"
            :disabled="isSubmitting"
            placeholder="Enter event description (supports Markdown)"
            required
          ></textarea>
           <small class="form-text text-muted">You can use Markdown for formatting.</small>
        </div>

        <!-- Add toggle for project submission -->
        <div class="mb-3">
          <div class="form-check form-switch">
            <input
              class="form-check-input"
              type="checkbox"
              id="allowProjectSubmission"
              v-model="formData.details.allowProjectSubmission"
              :disabled="isSubmitting"
            />
            <label class="form-check-label" for="allowProjectSubmission">
              Allow Project Submission
            </label>
          </div>
          <small class="form-text text-muted">
            If enabled, participants will be able to submit projects for this event.
          </small>
        </div>

        <!-- Team Configuration Section (Conditional) -->
        <template v-if="formData.details.format === 'Team'">
          <hr class="my-4">
          <h4 class="h5 mb-4">Team Configuration</h4>
          <!-- Only render component when students are loaded -->
          <ManageTeamsComponent
              v-if="availableStudents.length > 0"
              :initial-teams="(formData.teams ?? []).map(t => ({ teamName: t.teamName, members: t.members, teamLead: t.teamLead || '' }))"
              :students="availableStudents"
              :name-cache="nameCache"
              :is-submitting="isSubmitting"
              :can-auto-generate="true"
              :event-id="eventId || ''"
              @update:teams="updateTeams"
              @error="(msg: string) => emit('error', msg)"
          />
          <div v-else class="text-center text-muted small py-3">
             <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
             Loading student list...
          </div>
        </template>
      </div>
    </div>

    <!-- Event Schedule Card -->
    <div class="card shadow-sm mb-4">
      <div class="card-body p-4 p-lg-5">
        <h3 class="h4 mb-4">Event Schedule</h3>
        <div class="row g-3">
          <div class="col-md-6">
            <div class="mb-3">
              <label :for="dateFields.startField" class="form-label">{{ dateFields.startLabel }} <span class="text-danger">*</span></label>
              <DatePicker
                  :uid="dateFields.startField"
                  v-model="formData.details.date.start"
                  :enable-time-picker="false"
                  :disabled="isSubmitting"
                  @update:model-value="checkNextAvailableDate"
                  model-type="yyyy-MM-dd"
                  :min-date="new Date()"
                  :input-class-name="!isDateAvailable ? 'form-control is-invalid' : 'form-control'"
                  :auto-apply="true"
                  :teleport="true"
                  :clearable="false"
                  placeholder="Select start date"
                  required
                />
               <div v-if="formData.details.date.start && !isDateAvailable" class="invalid-feedback d-block">
                 <i class="fas fa-exclamation-circle me-1"></i> Date conflict detected
               </div>
               <div v-else-if="formData.details.date.start && isDateAvailable" class="valid-feedback d-block">
                 <i class="fas fa-check-circle me-1"></i> Date available
               </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label :for="dateFields.endField" class="form-label">{{ dateFields.endLabel }} <span class="text-danger">*</span></label>
               <DatePicker
                  :uid="dateFields.endField"
                  v-model="formData.details.date.end"
                  :enable-time-picker="false"
                  :disabled="isSubmitting || !formData.details.date.start"
                  @update:model-value="checkNextAvailableDate"
                  model-type="yyyy-MM-dd"
                  :min-date="formData.details.date.start ? new Date(formData.details.date.start) : new Date()"
                  :input-class-name="!formData.details.date.start ? 'form-control is-invalid' : 'form-control'"
                  :auto-apply="true"
                  :teleport="true"
                  :clearable="false"
                  placeholder="Select end date"
                  required
                />
              <small v-if="!formData.details.date.start" class="form-text text-muted">Select start date first</small>
            </div>
          </div>
        </div>

        <div v-if="!isDateAvailable && nextAvailableDate" class="alert alert-warning mt-4 d-flex align-items-center">
           <div class="flex-shrink-0 me-3">
              <i class="fas fa-exclamation-triangle fa-2x"></i>
           </div>
           <div class="flex-grow-1">
              <h6 class="alert-heading mb-1">Date Conflict Detected</h6>
              <p class="small mb-3">The selected dates conflict with another event. Next available start date is <strong class="fw-semibold">{{ formatDate(nextAvailableDate) }}</strong>.</p>
              <button
                type="button"
                class="btn btn-sm btn-link text-decoration-none p-0 d-inline-flex align-items-center"
                @click="useNextAvailableDate"
                :disabled="isSubmitting"
              >
                 <i class="fas fa-calendar-check me-1"></i>
                 <span>Use Next Available Date</span>
              </button>
           </div>
        </div>
      </div>
    </div>

     <!-- Rating Criteria Card -->
    <div class="card shadow-sm mb-4">
      <div class="card-body p-4 p-lg-5">
        <h3 class="h4 mb-3">Rating Criteria</h3>
        <p class="small text-secondary mb-4">Define criteria for rating participants. Total XP cannot exceed 50.</p>
        
        <div v-for="(criterion, index) in formData.criteria" :key="criterion.constraintIndex ?? index" class="mb-4 p-3 bg-light-subtle border rounded">
            <div class="row g-3 align-items-end"> 
                <div class="col-md-5">
                    <label :for="`criteria-label-${index}`" class="form-label form-label-sm">Criteria Label</label>
                    <input :id="`criteria-label-${index}`" class="form-control form-control-sm" type="text" v-model="criterion.constraintLabel" :disabled="isSubmitting" placeholder="e.g., Code Quality">
                </div>
                <div class="col-md-4">
                    <label :for="`criteria-points-${index}`" class="form-label form-label-sm">XP Points ({{ criterion.points }})</label>
                    <input
                       :id="`criteria-points-${index}`"
                       class="form-range"
                       type="range"
                       v-model.number="criterion.points"
                       :disabled="isSubmitting"
                       min="1"
                       :max="getCriterionMax(index)"
                       @input="onCriterionPointsInput(index)"
                    >
                    <small class="form-text text-muted">Max: {{ getCriterionMax(index) }} XP</small>
                </div>
                 <div class="col-md-3 d-flex align-items-end gap-2">
                     <div class="flex-grow-1">
                       <label :for="`criteria-role-${index}`" class="form-label form-label-sm">Applies To</label>
                       <select :id="`criteria-role-${index}`" class="form-select form-select-sm" v-model="criterion.role" :disabled="isSubmitting">
                           <option value="" disabled>Select Role</option>
                           <option
                               v-for="role in assignableXpRoles"
                               :key="role"
                               :value="role"
                           >{{ role }}</option>
                       </select>
                     </div>
                     <button type="button" class="btn btn-sm btn-outline-danger align-self-end" @click="removeCriterion(index)" :disabled="formData.criteria.length === 1 || isSubmitting">
                        <i class="fas fa-minus"></i>
                     </button>
                 </div>
            </div>
        </div>
        
        <div class="d-flex justify-content-between align-items-center">
             <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center" @click="addCriterion" :disabled="isSubmitting || formData.criteria.length >= 4">
                 <i class="fas fa-plus me-1"></i>
                 <span>Add Criteria</span>
             </button>
             <p class="small fw-medium mb-0" :class="{ 'text-danger': totalXP > 50, 'text-success': totalXP > 0 && totalXP <= 50 }">
                 Total XP: {{ totalXP }} / 50
             </p>
        </div>
        <p v-if="totalXP > 50" class="form-text text-danger mt-2">Total XP cannot exceed 50.</p>
      </div>
    </div>

    <!-- Co-organizers Card -->
     <div class="card shadow-sm mb-4">
        <div class="card-body p-4 p-lg-5">
          <h3 class="h4 mb-3">Co-organizers (Optional)</h3>
          <div class="mb-3 dropdown">
              <label for="coOrganizerSearch" class="form-label form-label-sm">Add Co-organizers</label>
              <div class="input-group input-group-sm">
                 <span class="input-group-text"><i class="fas fa-search"></i></span>
                  <input
                      id="coOrganizerSearch"
                      class="form-control"
                      type="text"
                      v-model="coOrganizerSearch"
                      @input="searchUsers"
                      @focus="showCoOrganizerDropdown = true"
                      @blur="handleCoOrganizerBlur"
                      placeholder="Search by name..."
                      :disabled="isSubmitting"
                      aria-haspopup="listbox"
                      :aria-expanded="showCoOrganizerDropdown && filteredUsers.length > 0"
                  >
              </div>
              <ul class="dropdown-menu w-100" :class="{ 'show': showCoOrganizerDropdown && filteredUsers.length > 0 }">
                  <li v-for="user in filteredUsers" :key="user.uid">
                      <a
                          href="#"
                          class="dropdown-item small"
                          @mousedown.prevent="addOrganizer(user.uid)"
                       >
                          {{ user.name }} <span class="text-muted">{{ user.email }}</span>
                      </a>
                  </li>
                   <li v-if="coOrganizerSearch && filteredUsers.length === 0"><span class="dropdown-item-text small text-muted fst-italic">No users found</span></li>
              </ul>
          </div>

          <!-- Selected Co-organizers -->
          <div v-if="formData.details.organizers.length > 0" class="mt-3">
              <h6 class="small fw-bold mb-2">Selected Co-organizers:</h6>
              <div class="d-flex flex-wrap gap-2">
                  <span
                      v-for="orgId in formData.details.organizers"
                      :key="orgId"
                      class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis d-inline-flex align-items-center"
                  >
                      {{ nameCache[orgId] || orgId }}
                      <button
                          type="button"
                          class="btn-close btn-close-sm ms-1"
                          @click="removeOrganizer(orgId)"
                          :disabled="isSubmitting"
                          aria-label="Remove Co-organizer"
                      ></button>
                  </span>
              </div>
          </div>
        </div>
     </div>

      <!-- Submit Button -->
      <div class="text-end">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting || totalXP > 50 || !isFormValid">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isSubmitting ? 'Submitting...' : eventId ? 'Update Event' : 'Submit Request' }}
          </button>
      </div>

  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted } from 'vue';
// Fix: Use computed so currentUserUid is always up-to-date
const currentUserUid = computed(() => store.getters['user/userId']);
import { useStore } from 'vuex';
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';
// Use event.ts for all event-related types/enums
import { Event, EventStatus, EventFormat, Team, EventCriteria } from '@/types/event';
import TeamMemberSelect from './TeamMemberSelect.vue';
import ManageTeamsComponent from '@/components/events/ManageTeamsComponent.vue';

// Use EventFormData from @/types/event for consistency
import { EventFormData } from '@/types/event';

type FormData = EventFormData;


// Interfaces (consider moving to a types file)
export interface Student {
  uid: string;
  name: string;
}

export interface NameCache {
  [key: string]: string;
}

// Define roles for XP allocation (excluding Organizer potentially)
const assignableXpRoles = ['developer', 'presenter', 'designer', 'problemSolver'] as const; // Use const assertion
type AssignableXpRole = typeof assignableXpRoles[number];

// Props definition using defineProps macro
const props = defineProps<{
  initialData?: EventFormData | null;
  isSubmitting?: boolean;
  isRequestForm?: boolean;
  eventId?: string | null;
}>();

// Define event types based on format 
const individualEventTypes = [
    'Topic Presentation',
    'Discussion session',
    'Hands-on Presentation',
    'Quiz',
    'Program logic solver',
    'Google Search',
    'Typing competition',
    'Algorithm writing',
];
const teamEventTypes = [
    'Debate',
    'Hackathon',
    'Ideathon',
    'Debug competition',
    'Design Competition',
    'Testing',
    'Treasure hunt',
    'Open Source',
    'Tech Business plan',
];

// Default values for props if not provided (handled slightly differently in <script setup>)
const availableEventTypes = computed(() => {
    // Return different lists based on the current form state
    return formData.value.details.format === 'Team' ? teamEventTypes : individualEventTypes;
});
const isSubmitting = computed(() => props.isSubmitting ?? false);
const isRequestForm = computed(() => true); // Always treat as request form
const eventId = computed(() => props.eventId ?? null);

// Emits definition using defineEmits macro
const emit = defineEmits<{ 
  (e: 'submit', payload: EventFormData): void
  (e: 'error', message: string): void
}>();

// *** NEW: Computed property for available students based on Vuex state ***
const availableStudents = computed<Student[]>(() => {
  const students = store.state.user.studentList || [];
  return students
    .map((s: any) => ({
      uid: s.uid,
      name: s.name || s.email || s.uid
    }));
});

const store = useStore();
const formData = ref<EventFormData>(initializeFormData());
const nameCache = ref<NameCache>({});
const allUsers = ref<{ uid: string; name: string; email: string }[]>([]);
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);
const nextAvailableDate = ref<Date | null>(null);
const isDateAvailable = ref(true); // Assume available initially

const stringToDate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  try {
    const dt = DateTime.fromISO(dateString);
    if (!dt.isValid) return null;
    return dt.toJSDate();
  } catch (e) {
    return null;
  }
};

const dateFields = computed(() => ({
    startLabel: 'Event Start Date', 
    endLabel: 'Event End Date', 
    startField: 'startDate', 
    endField: 'endDate'
}));

// Add type for totalXP computed
const totalXP = computed((): number => {
  return formData.value.criteria.reduce((sum: number, criterion: EventCriteria) => 
    sum + (Number(criterion.points) || 0), 0);
});

// Computed property to validate the form
const isFormValid = computed(() => {
  // Validate required event details
  const details = formData.value.details;
  if (!details.format || !details.eventName || !details.type || !details.description) return false;
  // Validate dates
  if (!details.date || !details.date.start || !details.date.end) return false;
  // Check date availability
  if (!isDateAvailable.value) return false;
  // At least one criteria, and total XP must not exceed 50
  if (!formData.value.criteria || formData.value.criteria.length === 0 || totalXP.value > 50) return false;
  // For team format, check teams
  if (details.format === 'Team') {
    // At least 2 teams
    if (!Array.isArray(formData.value.teams) || formData.value.teams.length < 2) return false;
    // Each team must have a name, at least minMembers, and a team lead
    for (const team of formData.value.teams) {
      if (!team.teamName || !Array.isArray(team.members) || team.members.length < 2 || !team.teamLead) return false;
    }
  }
  return true;
});

function initializeFormData(): EventFormData {
  const defaults: FormData = {
    details: {
      eventName: '', 
      format: EventFormat.Individual, 
      type: '',
      description: '',
      date: {
        start: null,
        end: null
      },
      organizers: [],
      allowProjectSubmission: false // Default to false
    },
    teams: [],
    criteria: [], 
    status: EventStatus.Pending // Use imported enum
  };

  // Ensure at least 2 teams if defaulting to team format
  if ((props.initialData && props.initialData.details && props.initialData.details.format === 'Team') || defaults.details.format === 'Team') {
    if (!Array.isArray(defaults.teams) || defaults.teams.length < 2) {
      defaults.teams = [
        { teamName: 'Team 1', members: [], teamLead: '' },
        { teamName: 'Team 2', members: [], teamLead: '' }
      ];
    }
  }

  // Add a default criterion if creating new form
  if (!props.initialData && defaults.criteria.length === 0) {
    defaults.criteria.push({
      constraintIndex: 0,
      constraintLabel: 'Default Criteria',
      points: 10,
      role: 'developer',
      criteriaSelections: {}
    });
  }

  if (props.initialData) {
    const initial = { ...props.initialData };
    // Convert Timestamps to YYYY-MM-DD strings if they exist
    const formatTimestamp = (ts: any) => {
      if (ts instanceof Timestamp) {
        return DateTime.fromJSDate(ts.toDate()).toISODate();
      }
      if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts)) {
         return ts; // Already in correct format
      }
      if (ts instanceof Date) {
          return DateTime.fromJSDate(ts).toISODate();
      }
      return null;
    };

    if (initial.details?.date) {
      initial.details.date.start = formatTimestamp(initial.details.date.start);
      initial.details.date.end = formatTimestamp(initial.details.date.end);
    }

    // Remove top-level eventName if present
    if ('eventName' in initial) {
      delete (initial as any).eventName;
    }

    // Always ensure description is present in details
    if (!initial.details.description) {
      initial.details.description = '';
    }

    // Ensure allowProjectSubmission is present (default true)
    if (typeof initial.details.allowProjectSubmission !== 'boolean') {
      initial.details.allowProjectSubmission = true;
    }

    return { ...defaults, ...initial };
  }
  return defaults;
}

const filteredUsers = computed(() => {
  if (!coOrganizerSearch.value) return [];
  const searchLower = coOrganizerSearch.value.toLowerCase();
  const all = store.state.user.allUsers || [];
  if (!Array.isArray(all)) return [];

  // Exclude current user (requester) and already-selected organizers
  return all.filter((user: any) => {
    if (!user || !user.uid) return false;
    if (currentUserUid.value && user.uid === currentUserUid.value) return false;
    if (formData.value.details.organizers.includes(user.uid)) return false;
    const nameMatch = user.name?.toLowerCase().includes(searchLower);
    const emailMatch = user.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  });
});

const fetchInitialData = async () => {
  // Ensure refs are arrays initially and reset them
  allUsers.value = [];

  try {
    // Fetch students unconditionally, as the user might switch to team format.
    // The computed property 'availableStudents' will react to the store update.
    await store.dispatch('user/fetchAllStudents');

    // Fetch all users for co-organizer dropdown
    await store.dispatch('user/fetchAllUsers');
    // Safety Check: Use correct state property 'allUsers'
    if (Array.isArray(store.state.user.allUsers)) {
        // Ensure we have the correct structure before assigning
        allUsers.value = store.state.user.allUsers.map((u: any) => ({
            uid: u.uid,
            name: u.name,
            email: u.email
        }));
    } else {
        console.warn('store.state.user.allUsers is not an array after fetchAllUsers');
        allUsers.value = []; // Ensure it remains an empty array on failure
    }

    // Update name cache (check if allUsers.value is an array first)
    if (Array.isArray(allUsers.value)) {
        allUsers.value.forEach(user => {
            if (user.uid && user.name) {
                nameCache.value[user.uid] = user.name;
            }
        });
    }
     // Also populate cache from students (check if availableStudents.value is an array)
     if (Array.isArray(availableStudents.value)) {
         availableStudents.value.forEach(student => {
             if (student.uid && student.name) {
                 nameCache.value[student.uid] = student.name;
             }
         });
    }

  } catch (error) {
    console.error("Error fetching initial form data:", error);
    // Ensure refs are reset on error too
    allUsers.value = [];
    emit('error', 'Failed to load necessary data for the form.');
  }
};

onMounted(() => {
    formData.value = initializeFormData(); // Re-initialize on mount
    fetchInitialData();
    checkNextAvailableDate(); // Initial check if dates are pre-filled
    // Try to get UID from user module or log for debug
    // No assignment needed for currentUserUid; it is a computed property
});

// Re-initialize form when initialData changes (e.g., switching between create/edit)
watch(() => props.initialData, () => {
    formData.value = initializeFormData();
    checkNextAvailableDate(); // Re-check dates
}, { deep: true });

const handleFormatChange = () => {
  if (formData.value.details.format === 'Individual') {
    formData.value.teams = []; // Clear teams for individual format
  } else {
    // Always ensure at least 2 teams for team format
    if (!Array.isArray(formData.value.teams) || formData.value.teams.length < 2) {
      formData.value.teams = [
        { teamName: 'Team 1', members: [], teamLead: '' },
        { teamName: 'Team 2', members: [], teamLead: '' }
      ];
    }
    // Fetch students if switching to team event and they aren't loaded
    if (availableStudents.value.length === 0) {
      fetchInitialData();
    }
  }
  // Reset event type if the current one is not valid for the new format
  if (!availableEventTypes.value.includes(formData.value.details.type || '')) {
    formData.value.details.type = '';
  }
};

const handleEventTypeChange = () => {
    // If specific logic is needed when event type changes
};

// Fix team mapping type
const updateTeams = (newTeams: { name: string; members: string[]; teamLead?: string }[]): void => {
  formData.value.teams = newTeams.map((t, idx) => {
    // Try to preserve teamLead if still present in members, otherwise null it
    let teamLead = t.teamLead;
    if (teamLead && Array.isArray(t.members) && !t.members.includes(teamLead)) {
      teamLead = '';
    }
    return {
      teamName: t.name,
      members: Array.isArray(t.members) ? [...t.members] : [],
      teamLead: teamLead || ''
    };
  });
};

const addCriterion = (): void => {
  if (formData.value.criteria.length >= 4) return;
  // Calculate remaining XP to allocate
  const remainingXP = 50 - totalXP.value;
  formData.value.criteria.push({
    constraintIndex: Date.now() + Math.random(),
    constraintLabel: '',
    points: Math.max(1, Math.min(5, remainingXP)),
    role: 'developer',
    criteriaSelections: {}
  });
};

const removeCriterion = (index: number): void => {
  if (formData.value.criteria.length <= 1) return;
  formData.value.criteria.splice(index, 1);
};

function getCriterionMax(index: number): number {
  // The max for this criterion is 50 - sum of all other criteria (min 1)
  const otherTotal = formData.value.criteria.reduce((sum, c, i) => i === index ? sum : sum + (Number(c.points) || 0), 0);
  return Math.max(1, 50 - otherTotal);
}

function onCriterionPointsInput(index: number) {
  // Cap the slider if user tries to exceed the allowed max
  const max = getCriterionMax(index);
  if (formData.value.criteria[index].points > max) {
    formData.value.criteria[index].points = max;
  }
  // If totalXP > 50, forcibly reduce this criterion
  if (totalXP.value > 50) {
    formData.value.criteria[index].points -= (totalXP.value - 50);
    if (formData.value.criteria[index].points < 1) formData.value.criteria[index].points = 1;
  }
}


 const addOrganizer = (userId: string) => {
  if (!formData.value.details.organizers.includes(userId)) {
    formData.value.details.organizers.push(userId);
  }
  coOrganizerSearch.value = '';
  showCoOrganizerDropdown.value = false;
};

const removeOrganizer = (userId: string) => {
  formData.value.details.organizers = formData.value.details.organizers.filter(id => id !== userId);
};

 const searchUsers = () => {
  showCoOrganizerDropdown.value = coOrganizerSearch.value.length > 0;
  // Implement debouncing if fetching users dynamically instead of from pre-fetched list
};

const handleSubmit = (): void => {
  if (totalXP.value > 50) {
    emit('error', 'Total XP allocated cannot exceed 50.');
    return;
  }

  // Validate dates are present
  if (!formData.value.details.date.start || !formData.value.details.date.end) {
    emit('error', `Both ${dateFields.value.startLabel} and ${dateFields.value.endLabel} are required.`);
    return;
  }

  // Create a deep copy to avoid mutating the form state
  const dataToSubmit = JSON.parse(JSON.stringify(formData.value));

  // Convert the dates to Timestamps before submitting
  if (dataToSubmit.details.date.start) {
    const startDate = new Date(dataToSubmit.details.date.start);
    dataToSubmit.details.date.start = Timestamp.fromDate(startDate);
  }

  if (dataToSubmit.details.date.end) {
    const endDate = new Date(dataToSubmit.details.date.end);
    dataToSubmit.details.date.end = Timestamp.fromDate(endDate);
  }

  dataToSubmit.status = EventStatus.Pending;
  dataToSubmit.requestedBy = store.getters['user/userId'];

  // Ensure allowProjectSubmission is always present (default true)
  if (typeof dataToSubmit.details.allowProjectSubmission !== 'boolean') {
    dataToSubmit.details.allowProjectSubmission = true;
  }

  // Remove top-level eventName if present
  if ('eventName' in dataToSubmit) {
    delete (dataToSubmit as any).eventName;
  }

  // --- Ensure 30 non-admin students are included for individual format event requests ---
  if (
    dataToSubmit.details.format === EventFormat.Individual &&
    (!Array.isArray(dataToSubmit.participants) || dataToSubmit.participants.length === 0)
  ) {
    // Use availableStudents computed property 
    const students = (store.state.user.studentList || [])
    dataToSubmit.participants = students.map((s: any) => s.uid);
  }

  emit('submit', dataToSubmit);
};

 const checkNextAvailableDate = async () => {
    // Directly use the keys
    const startDateString = formData.value.details.date.start;
    const endDateString = formData.value.details.date.end;

    if (!startDateString || !endDateString) {
        isDateAvailable.value = true; // Assume available if dates incomplete
        nextAvailableDate.value = null;
        return;
    }

    try {
         // Fix 3: More explicit type checking before datetime operations
         if (typeof startDateString !== 'string' || typeof endDateString !== 'string') {
             // If dates are not valid strings, treat as unavailable or handle appropriately
             isDateAvailable.value = true; // Or false depending on  behavior for invalid input
             nextAvailableDate.value = null;
             console.warn("Attempted date availability check with invalid date strings.");
             return;
         }

         // Now TypeScript knows these are strings
         const startDate = DateTime.fromISO(startDateString).toJSDate();
         const endDate = DateTime.fromISO(endDateString).toJSDate();

         if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
             throw new Error("Invalid date format for availability check.");
         }

         // Dispatch the correct action name: 'events/checkDateConflict'
         const result = await store.dispatch('events/checkDateConflict', {
            startDate: startDate,
            endDate: endDate,
            excludeEventId: eventId.value // Use computed prop default
         });

         // Use result.hasConflict and invert its value for isDateAvailable
        isDateAvailable.value = !result.hasConflict;

        // Handle the next available date (ensure it's Date or null)
        nextAvailableDate.value = result.nextAvailableDate instanceof Timestamp
            ? result.nextAvailableDate.toDate()
            : (result.nextAvailableDate instanceof Date ? result.nextAvailableDate : null);

    } catch (error) {
        console.error('Error checking date availability:', error);
        isDateAvailable.value = true; // Assume available on error
        nextAvailableDate.value = null;
        emit('error', 'Could not verify date availability.');
    }
};

const useNextAvailableDate = () => {
    if (nextAvailableDate.value) {
         // Directly use the keys
         const currentEndDateString = formData.value.details.date.end;
         const currentStartDateString = formData.value.details.date.start;

         if (!currentStartDateString || !currentEndDateString) return; // Should not happen if button is visible

         try {
             // Fix: Ensure dates are strings before parsing
             if (typeof currentStartDateString !== 'string' || typeof currentEndDateString !== 'string') {
                 emit('error', 'Current date values are invalid.');
                 return;
             }
             const currentStart = DateTime.fromISO(currentStartDateString);
             const currentEnd = DateTime.fromISO(currentEndDateString);

             if (!currentStart.isValid || !currentEnd.isValid) {
                 throw new Error("Current dates are invalid.")
             }

             const duration = currentEnd.diff(currentStart);
             const nextStart = DateTime.fromJSDate(nextAvailableDate.value);
             const nextEnd = nextStart.plus(duration);

             const nextStartDateISO: string | null = nextStart.isValid ? nextStart.toISODate() : null;
             const nextEndDateISO: string | null = nextEnd.isValid ? nextEnd.toISODate() : null;

            // Directly assign to the correct properties
            formData.value.details.date.start = nextStartDateISO;
            formData.value.details.date.end = nextEndDateISO;

            // Re-check availability after setting new dates
           checkNextAvailableDate();
         } catch(error) {
            console.error("Error calculating next available date: ", error);
            emit('error', 'Failed to calculate suggested dates.');
         }
    }
};

 const formatDate = (date: Date | Timestamp | string | null | undefined): string => { // Accept string too
    if (!date) return '';
    let dateTime: DateTime | null = null; // Renamed variable to avoid redeclaration
    if (date instanceof Timestamp) dateTime = DateTime.fromJSDate(date.toDate());
    else if (date instanceof Date) dateTime = DateTime.fromJSDate(date);
    else if (typeof date === 'string') dateTime = DateTime.fromISO(date); // Handle ISO string input
    
    return dateTime && dateTime.isValid ? dateTime.toLocaleString(DateTime.DATE_MED) : ''; // Check validity
};

const handleCoOrganizerBlur = () => {
  // Use standard global setTimeout
  setTimeout(() => {
    showCoOrganizerDropdown.value = false;
  }, 150);
};

</script>


<style scoped>
/* Add styles for DatePicker validation states if needed */
 :deep(.dp__input_invalid) { border-color: var(--bs-danger); } 
 :deep(.dp__input_valid) { border-color: var(--bs-success); } 

/* Ensure dropdown menu displays correctly */
.dropdown-menu.show {
    display: block;
}

/* Style selected co-organizer badges */
.badge .btn-close {
    padding: 0.25em 0.4em;
}
</style>
