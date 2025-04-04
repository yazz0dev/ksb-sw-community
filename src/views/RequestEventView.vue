<template>
    <div class="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Request New Event</h2>

        <!-- Step Navigation -->
        <nav aria-label="Progress" class="mb-8">
           <ol role="list" class="border border-gray-300 rounded-md divide-y divide-gray-300 md:flex md:divide-y-0">
                <li v-for="(step, stepIdx) in steps" :key="step.name" class="relative md:flex md:flex-1">
                    <button @click="goToStep(stepIdx + 1)" :disabled="stepIdx >= currentStep" class="group flex w-full items-center" :class="{'cursor-not-allowed': stepIdx >= currentStep}">
                        <span class="flex items-center px-6 py-4 text-sm font-medium">
                            <span :class="['flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', stepIdx < currentStep ? 'bg-blue-600 group-hover:bg-blue-800' : 'border-2 border-blue-600']">
                                <template v-if="stepIdx < currentStep -1">
                                    <i class="fas fa-check text-white"></i>
                                </template>
                                <span v-else :class="stepIdx === currentStep - 1 ? 'text-blue-600' : 'text-blue-600'">{{ step.id }}</span>
                            </span>
                            <span class="ml-4 text-sm font-medium" :class="stepIdx <= currentStep -1 ? 'text-gray-900' : 'text-gray-500'">{{ step.name }}</span>
                        </span>
                    </button>
                    <!-- Arrow separator for md screens and up -->
                    <div v-if="stepIdx !== steps.length - 1" class="absolute top-0 right-0 hidden h-full w-5 md:block" aria-hidden="true">
                        <svg class="h-full w-full text-gray-300" viewBox="0 0 22 80" fill="none" preserveAspectRatio="none">
                            <path d="M0 -2L20 40L0 82" vector-effect="non-scaling-stroke" stroke="currentcolor" stroke-linejoin="round" />
                        </svg>
                    </div>
                </li>
           </ol>
        </nav>

        <!-- Alert for Active Request -->
         <div v-if="loadingCheck" class="text-center py-4">Loading...</div>
         <div v-if="hasActiveRequest" class="mb-6 rounded-md bg-yellow-50 p-4">
             <div class="flex">
                 <div class="flex-shrink-0">
                      <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                 </div>
                 <div class="ml-3">
                     <h3 class="text-sm font-medium text-yellow-800">Pending Request Active</h3>
                     <div class="mt-2 text-sm text-yellow-700">
                         <p>You already have a pending event request. Please wait for it to be reviewed before submitting a new one.</p>
                          <!-- Optionally link to view requests or contact admin -->
                     </div>
                 </div>
             </div>
         </div>


        <!-- Form Steps -->
        <form @submit.prevent="handleSubmit" v-if="!hasActiveRequest && !loadingCheck">
            <!-- Step 1: Basic Info -->
             <div v-show="currentStep === 1" class="space-y-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Event Details</h3>
                 <div>
                     <label for="eventName" class="block text-sm font-medium text-gray-700">Event Name</label>
                     <input type="text" v-model="eventName" id="eventName" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="e.g., Project Showcase">
                 </div>
                 <div>
                     <label class="block text-sm font-medium text-gray-700">Is this a Team Event?</label>
                     <div class="mt-2 flex items-center space-x-4">
                         <label class="inline-flex items-center">
                             <input type="radio" :value="false" v-model="isTeamEvent" name="eventTypeToggle" class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500">
                             <span class="ml-2 text-sm text-gray-700">Individual</span>
                         </label>
                         <label class="inline-flex items-center">
                             <input type="radio" :value="true" v-model="isTeamEvent" name="eventTypeToggle" class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500">
                             <span class="ml-2 text-sm text-gray-700">Team</span>
                         </label>
                     </div>
                 </div>
                 <div>
                     <label for="eventType" class="block text-sm font-medium text-gray-700">Event Category</label>
                     <select id="eventType" v-model="eventType" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                          <option disabled value="">Please select a category</option>
                          <option v-for="category in availableEventCategories" :key="category.value" :value="category.value">{{ category.label }}</option>
                     </select>
                 </div>
                  <div>
                     <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                     <textarea id="description" v-model="description" rows="3" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="Briefly describe the event's purpose and goals."></textarea>
                 </div>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                         <label for="desiredStartDate" class="block text-sm font-medium text-gray-700">Desired Start Date</label>
                         <input type="date" v-model="desiredStartDate" id="desiredStartDate" required :min="minDate" @change="validateDates" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                         <p v-if="dateErrorMessages.startDate" class="mt-1 text-xs text-red-600">{{ dateErrorMessages.startDate }}</p>
                         <p v-if="conflictWarnings.startDate" class="mt-1 text-xs text-yellow-600">{{ conflictWarnings.startDate }}</p>
                     </div>
                     <div>
                         <label for="desiredEndDate" class="block text-sm font-medium text-gray-700">Desired End Date</label>
                         <input type="date" v-model="desiredEndDate" id="desiredEndDate" required :min="desiredStartDate || minDate" @change="validateDates" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                         <p v-if="dateErrorMessages.endDate" class="mt-1 text-xs text-red-600">{{ dateErrorMessages.endDate }}</p>
                         <p v-if="conflictWarnings.endDate" class="mt-1 text-xs text-yellow-600">{{ conflictWarnings.endDate }}</p>
                     </div>
                 </div>
                  <!-- Potential Conflict Suggestion -->
                  <div v-if="suggestedNextAvailableDate && dateErrorMessages.startDate" class="mt-2 rounded-md bg-blue-50 p-3 text-xs text-blue-700 border border-blue-200">
                       <p><i class="fas fa-info-circle mr-1"></i>The earliest available date slot starting after your desired period seems to be around {{ suggestedNextAvailableDate.toLocaleDateString() }}.</p>
                       <button type="button" @click="setSuggestedDate" class="mt-1 text-blue-600 hover:underline font-medium" :disabled="isFindingNextDate">
                           {{ isFindingNextDate ? 'Checking...' : 'Use this date?' }}
                       </button>
                   </div>

                  <div>
                      <h4 class="text-md font-medium text-gray-800 mb-2">Suggest Co-Organizers (Optional, Max 4)</h4>
                      <div class="relative">
                            <input type="text" v-model="organizerSearch" placeholder="Search for students..." @focus="handleSearchFocus" @blur="handleSearchBlur" :disabled="!canAddMoreOrganizers"
                                   class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100">
                             <div v-if="showOrganizerDropdown && filteredStudentsForDropdown.length > 0" class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                <ul tabindex="-1" role="listbox">
                                    <li v-for="student in filteredStudentsForDropdown" :key="student.uid" @mousedown.prevent="addOrganizer(student)"
                                        class="text-gray-900 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50">
                                        <span class="font-normal block truncate">{{ student.name }}</span>
                                    </li>
                                </ul>
                             </div>
                             <p v-if="!canAddMoreOrganizers" class="mt-1 text-xs text-gray-500">Maximum number of co-organizers reached.</p>
                       </div>
                        <div v-if="selectedOrganizers.length > 0" class="mt-3 space-y-2">
                            <p class="text-xs font-medium text-gray-600">Selected Co-Organizers:</p>
                             <ul class="flex flex-wrap gap-2">
                                <li v-for="uid in selectedOrganizers" :key="uid" class="flex items-center bg-gray-100 rounded-full px-2.5 py-0.5 text-sm font-medium text-gray-800">
                                    <span>{{ studentNameCache[uid] || uid }}</span>
                                    <button @click="removeOrganizer(uid)" type="button" class="ml-1.5 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none">
                                        <i class="fas fa-times-circle h-3 w-3"></i>
                                    </button>
                                </li>
                            </ul>
                        </div>
                  </div>

             </div>

            <!-- Step 2: Team Definition (Only if isTeamEvent is true) -->
             <div v-if="isTeamEvent" v-show="currentStep === 2" class="space-y-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Define Teams</h3>
                <ManageTeamsComponent
                    :initial-teams="teams"
                    :available-students="availableStudentsWithoutOrganizers"
                    :student-name-cache="studentNameCache"
                    @teams-updated="handleTeamsUpdate"
                    :event-type="'request'"
                 />
             </div>

            <!-- Step 3: Rating Criteria -->
            <div v-show="currentStep === (isTeamEvent ? 3 : 2)" class="space-y-6">
                 <h3 class="text-lg font-medium leading-6 text-gray-900">Suggest Rating Criteria & XP Allocation</h3>
                <p class="text-sm text-gray-600">Define how participants will be rated and allocate XP (maximum 5 criteria, total XP cannot exceed 100).</p>

                 <div v-for="(criteria, index) in ratingCriteria" :key="index" class="flex flex-col md:flex-row items-start md:items-center gap-2 p-3 border rounded-md">
                     <div class="flex-1 w-full md:w-auto">
                          <label :for="`criteria-label-${index}`" class="sr-only">Criteria Label</label>
                         <input :id="`criteria-label-${index}`" type="text" v-model="criteria.label" :placeholder="getDefaultCriteriaLabel(index)" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                     </div>
                     <div class="flex-shrink-0 w-full md:w-auto">
                          <label :for="`criteria-role-${index}`" class="sr-only">Role</label>
                          <select :id="`criteria-role-${index}`" v-model="criteria.role" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                              <option value="">General</option>
                              <option v-for="role in availableRoles" :key="role.value" :value="role.value">{{ role.label }}</option>
                         </select>
                     </div>
                     <div class="flex-shrink-0 w-full md:w-auto flex items-center gap-2">
                          <label :for="`criteria-points-${index}`" class="sr-only">XP Points</label>
                         <input
                             :id="`criteria-points-${index}`"
                             type="range"
                             v-model.number="criteria.points"
                             min="1"
                             max="50"
                             class="block w-full cursor-pointer accent-blue-600 py-1.5"
                          />
                          <span class="text-sm font-medium text-gray-700 w-8 text-right">{{ criteria.points || 0 }}</span>
                     </div>
                      <button @click="removeConstraint(index)" type="button" :disabled="ratingCriteria.length <= 1" class="text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed p-2 ml-auto md:ml-0">
                           <i class="fas fa-trash"></i><span class="sr-only">Remove Criteria</span>
                      </button>
                 </div>

                 <div class="flex justify-between items-center">
                     <button @click="addConstraint" type="button" :disabled="ratingCriteria.length >= 5" class="inline-flex items-center rounded-md border border-transparent bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                          <i class="fas fa-plus mr-1"></i> Add Criteria
                     </button>
                     <p class="text-sm font-medium text-gray-700">Total XP Allocated: {{ totalAllocatedXp }} / 100</p>
                 </div>
                <p v-if="totalAllocatedXp > 100" class="text-xs text-red-600">Total XP exceeds the 100 point limit.</p>

            </div>

            <!-- Form Navigation & Submission -->
             <div class="mt-8 pt-5 border-t border-gray-200">
                 <div class="flex justify-between">
                    <button type="button" @click="prevStep" :disabled="currentStep === 1"
                            class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                         Previous
                     </button>

                     <button v-if="currentStep < totalSteps" type="button" @click="nextStep" :disabled="!canProceed"
                            class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                         Next
                     </button>

                    <button v-else type="submit" :disabled="isSubmitting || !isFormValid"
                            class="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {{ getSubmitButtonText() }}
                     </button>
                 </div>
                 <p v-if="errorMessage" class="mt-4 text-sm text-red-600 text-center">{{ errorMessage }}</p>
             </div>
        </form>
    </div>
</template>


<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { collection, getDocs, query, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ManageTeamsComponent from '../components/ManageTeamsComponent.vue';
import { EventRequest, TeamMember, Student, RatingCriteria } from '../types/event'; // Assuming types are defined

// --- Core State ---
const isTeamEvent = ref<boolean>(false);

// --- Form Fields ---
const eventName = ref<string>('');
const eventType = ref<string>('Topic Presentation'); // Default
const description = ref<string>('');
const desiredStartDate = ref<string>('');
const desiredEndDate = ref<string>('');
const selectedOrganizers = ref<string[]>([]); // User suggests co-organizers

// --- Team Definition State ---
const teams = ref<TeamMember[]>([{ teamName: '', members: [], isNew: true }]);

// --- Organizer/Student State ---
const availableStudents = ref<Student[]>([]);
const studentNameCache = ref<Record<string, string>>({});
const organizerSearch = ref<string>('');
const showOrganizerDropdown = ref<boolean>(false);

// --- Rating Criteria State ---
const ratingCriteria = ref<RatingCriteria[]>([{ label: '', role: 'general', points: 5 }]);
const defaultCriteriaLabels = [ 'Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology' ];
const availableRoles = [ // Keep consistent with potential admin view/types
    { value: 'fullstack', label: 'Full Stack Developer' },
    { value: 'presenter', label: 'Presenter' },
    { value: 'designer', label: 'Designer' },
    { value: 'problemSolver', label: 'Problem Solver' }
    // 'general' is handled implicitly by empty string
];

// --- General State ---
const store = useStore();
const router = useRouter();
const route = useRoute();
const errorMessage = ref<string>('');
const hasActiveRequest = ref<boolean>(false); // Check if user has pending request
const loadingCheck = ref<boolean>(true); // Loading state for active request check
const loadingStudents = ref<boolean>(true);
const isSubmitting = ref<boolean>(false);

// --- Date Conflict State ---
const dateErrorMessages = ref<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });
const conflictWarnings = ref<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });
const isCheckingConflict = ref<boolean>(false);
const suggestedNextAvailableDate = ref<Date | null>(null);
const isFindingNextDate = ref<boolean>(false);

// --- Multi-step Form State ---
const currentStep = ref<number>(1);
const steps = computed(() => {
    const baseSteps = [
        { id: '1', name: 'Event Details' },
        // Step 2 is conditional
        { id: isTeamEvent.value ? '3' : '2', name: 'Rating Criteria' },
    ];
    if (isTeamEvent.value) {
        baseSteps.splice(1, 0, { id: '2', name: 'Define Teams' });
    }
    return baseSteps;
});
const totalSteps = computed(() => steps.value.length);

// --- Computed ---
const currentUser = computed(() => store.getters['user/getUser']);
const minDate = computed(() => {
  const today = new Date();
  today.setDate(today.getDate() + 1); // Request must be for tomorrow or later
  return today.toISOString().split('T')[0];
});
const canAddMoreOrganizers = computed(() => selectedOrganizers.value.length < 4); // Max 4 suggested CO-organizers (requester is implicit 1st)

// Filter available students to exclude selected organizers and self (user requesting)
const availableStudentsWithoutOrganizers = computed(() => {
    return availableStudents.value.filter(s =>
        !selectedOrganizers.value.includes(s.uid) &&
        s.uid !== currentUser.value?.uid
    );
});

// Filter students for the co-organizer dropdown (exclude self and already selected)
const filteredStudentsForDropdown = computed(() => {
    if (!organizerSearch.value) return [];
    const lowerSearch = organizerSearch.value.toLowerCase();
    return availableStudents.value.filter(s =>
        s.uid !== currentUser.value?.uid && // Exclude self
        !selectedOrganizers.value.includes(s.uid) && // Exclude already selected
        s.name.toLowerCase().includes(lowerSearch)
    );
});

// Check if teams are valid (for team events) - adapted from ManageTeamsComponent logic if needed
const hasValidTeams = computed(() => {
    if (!isTeamEvent.value) return true; // Not applicable for individual events
    const validTeams = teams.value.filter(t => t.teamName.trim() !== '' && t.members.length > 0);
    return validTeams.length >= 2; // Require at least 2 valid teams
});

const totalAllocatedXp = computed(() => {
    return ratingCriteria.value.reduce((sum, criteria) => sum + (criteria.points || 0), 0);
});

const isStep1Valid = computed(() => {
    return eventName.value.trim() !== '' &&
           eventType.value !== '' &&
           description.value.trim() !== '' &&
           desiredStartDate.value !== '' &&
           desiredEndDate.value !== '' &&
           !dateErrorMessages.value.startDate &&
           !dateErrorMessages.value.endDate;
           // selectedOrganizers check removed from here, handled in final validation
});

const isStep2Valid = computed(() => {
    if (!isTeamEvent.value) return true; // Skip if not team event
    return hasValidTeams.value;
});

const isStep3Valid = computed(() => {
    return totalAllocatedXp.value > 0 && totalAllocatedXp.value <= 100;
});

// Determine if the current step is valid to proceed
const canProceed = computed(() => {
    if (currentStep.value === 1) return isStep1Valid.value;
    if (isTeamEvent.value && currentStep.value === 2) return isStep2Valid.value;
    if (currentStep.value === totalSteps.value -1) return (isTeamEvent.value ? isStep2Valid.value : true); // Validate team step before criteria
    return true; // Rating criteria step doesn't block moving *from* it, only final submission
});

// Overall form validity for submission
const isFormValid = computed(() => {
    return isStep1Valid.value && isStep2Valid.value && isStep3Valid.value && selectedOrganizers.value.length <= 4; // Max 4 co-organizers
});

const getSubmitButtonText = computed(() => {
    if (isSubmitting.value) return 'Submitting Request...';
    if (!isFormValid.value) {
        if (!isStep1Valid.value) return 'Complete Event Details';
        if (isTeamEvent.value && !isStep2Valid.value) return 'Define At Least 2 Teams';
        if (!isStep3Valid.value) return 'Check XP Allocation (1-100 total)';
         if (selectedOrganizers.value.length > 4) return 'Too many co-organizers (max 4)';
    }
    return 'Submit Event Request';
});

// --- NEW: Event Category Lists --- (Copied from original)
const teamEventCategories = [
    { value: 'Hackathon', label: 'Hackathon' }, { value: 'Ideathon', label: 'Ideathon' }, { value: 'Debate', label: 'Debate' },
    { value: 'Design Competition', label: 'Design Competition' }, { value: 'Tech Business plan', label: 'Tech Business plan' },
    { value: 'Treasure hunt', label: 'Treasure hunt' }, { value: 'Open Source', label: 'Open Source' }, { value: 'Other', label: 'Other' }
];
const individualEventCategories = [
    { value: 'Topic Presentation', label: 'Topic Presentation' }, { value: 'Debug competition', label: 'Debug competition' },
    { value: 'Discussion session', label: 'Discussion session' }, { value: 'Testing', label: 'Testing' },
    { value: 'Hands-on Presentation', label: 'Hands-on Presentation' }, { value: 'Quiz', label: 'Quiz' },
    { value: 'Program logic solver', label: 'Program logic solver' }, { value: 'Google Search', label: 'Google Search' },
    { value: 'Typing competition', label: 'Typing competition' }, { value: 'Algorithm writing', label: 'Algorithm writing' },
    { value: 'Other', label: 'Other' }
];
const availableEventCategories = computed(() => {
    return isTeamEvent.value ? teamEventCategories : individualEventCategories;
});

// --- Watchers ---
watch(isTeamEvent, (newVal) => {
    // Reset event type when switching between team/individual
    eventType.value = newVal ? 'Hackathon' : 'Topic Presentation';
    // Adjust steps/reset states if necessary
    if (currentStep.value > totalSteps.value) {
        currentStep.value = totalSteps.value;
    }
});

// --- Methods ---
const goToStep = (stepNumber: number) => {
    if (stepNumber < currentStep.value) { // Allow going back
        currentStep.value = stepNumber;
    } else if (stepNumber === currentStep.value + 1 && canProceed.value) { // Allow going forward one step if valid
         nextStep();
    }
     // Prevent jumping ahead multiple steps or to invalid steps
};

const nextStep = () => {
    if (currentStep.value < totalSteps.value && canProceed.value) {
        currentStep.value++;
    }
};

const prevStep = () => {
    if (currentStep.value > 1) {
        currentStep.value--;
    }
};

const validateDates = async () => {
    dateErrorMessages.value = { startDate: '', endDate: '' }; // Reset errors
    conflictWarnings.value = { startDate: null, endDate: null }; // Reset warnings
    suggestedNextAvailableDate.value = null; // Reset suggestion
    let start: Date | null = null;
    let end: Date | null = null;

    if (desiredStartDate.value) {
        start = new Date(desiredStartDate.value + 'T00:00:00'); // Add time to avoid timezone issues
        if (start < new Date(minDate.value + 'T00:00:00')) {
            dateErrorMessages.value.startDate = 'Start date must be in the future.';
        }
    }
    if (desiredEndDate.value) {
        end = new Date(desiredEndDate.value + 'T00:00:00');
         if (start && end < start) {
             dateErrorMessages.value.endDate = 'End date cannot be before the start date.';
         } else if (end < new Date(minDate.value + 'T00:00:00')) {
             dateErrorMessages.value.endDate = 'End date must be in the future.';
         }
    }

     // Check for conflicts only if dates are valid so far
     if (start && end && !dateErrorMessages.value.startDate && !dateErrorMessages.value.endDate) {
         isCheckingConflict.value = true;
         isFindingNextDate.value = false; // Reset
         try {
             const conflict = await store.dispatch('events/checkDateConflict', { startDate: start, endDate: end });
             if (conflict) {
                 const conflictEndDate = conflict.endDate?.toDate ? conflict.endDate.toDate() : new Date(conflict.endDate);
                 const warningMsg = `Conflicts with "${conflict.eventName}" (ends ${conflictEndDate.toLocaleDateString()}).`;
                 dateErrorMessages.value.startDate = warningMsg; // Show as error for request
                 dateErrorMessages.value.endDate = warningMsg;   // Show as error for request
                 // Suggest next available date
                 isFindingNextDate.value = true;
                 try {
                     suggestedNextAvailableDate.value = await store.dispatch('events/findNextAvailableDate', { afterDate: conflictEndDate });
                 } catch (findError) {
                      console.error("Error finding next available date:", findError);
                      // Handle error silently or show a generic message
                 } finally {
                     isFindingNextDate.value = false;
                 }
             }
         } catch (error) {
             console.error("Error checking date conflict:", error);
             conflictWarnings.value.startDate = "Could not verify date availability.";
             conflictWarnings.value.endDate = "Could not verify date availability.";
         } finally {
             isCheckingConflict.value = false;
         }
     }
};

const setSuggestedDate = () => {
    if (suggestedNextAvailableDate.value) {
         desiredStartDate.value = suggestedNextAvailableDate.value.toISOString().split('T')[0];
        // Optionally clear end date or set it relative to the new start date
        desiredEndDate.value = '';
        validateDates(); // Re-validate after setting
     }
};

const handleTeamsUpdate = (updatedTeams: TeamMember[]) => {
    teams.value = updatedTeams;
};

const fetchStudents = async () => {
    loadingStudents.value = true;
    errorMessage.value = '';
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '!=', 'Admin')); // Exclude Admins
        const querySnapshot = await getDocs(q);

        const students = querySnapshot.docs
            .map(doc => ({ uid: doc.id, name: doc.data().name || 'Unnamed', role: doc.data().role || 'Student' }))
            .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid));

        students.forEach(student => { studentNameCache.value[student.uid] = student.name; });
        availableStudents.value = students;

    } catch (error) {
        console.error('Error fetching students:', error);
        errorMessage.value = 'Failed to load student list';
    } finally {
        loadingStudents.value = false;
    }
};

// --- Organizer Selection Helpers --- (Simplified for Request)
const addOrganizer = (student: Student) => {
    if (!selectedOrganizers.value.includes(student.uid) && canAddMoreOrganizers.value) {
        selectedOrganizers.value.push(student.uid);
    }
    organizerSearch.value = '';
    showOrganizerDropdown.value = false;
};

const removeOrganizer = (uid: string) => {
    selectedOrganizers.value = selectedOrganizers.value.filter(id => id !== uid);
};

const handleSearchFocus = () => { showOrganizerDropdown.value = true; };
const handleSearchBlur = () => { setTimeout(() => { showOrganizerDropdown.value = false; organizerSearch.value = ''; }, 200); };
// --- END: Organizer Selection Helpers ---

const getDefaultCriteriaLabel = (index: number) => defaultCriteriaLabels[index] || `Criteria ${index + 1}`;

const addConstraint = () => {
    if (ratingCriteria.value.length < 5) {
        ratingCriteria.value.push({ label: '', role: 'general', points: 5 });
    }
};

const removeConstraint = (index: number) => {
    if (ratingCriteria.value.length > 1) {
        ratingCriteria.value.splice(index, 1);
    }
};

const prepareSubmissionData = (): EventRequest => {
    const xpAllocation = ratingCriteria.value
        .map((criteria, index) => ({
            constraintIndex: index,
            constraintLabel: criteria.label || getDefaultCriteriaLabel(index),
            role: criteria.role || 'general',
            points: criteria.points || 0
        }))
        .filter(allocation => allocation.points > 0);

    // Requester is always the current user
    const requesterUid = currentUser.value?.uid;
    if (!requesterUid) {
        throw new Error("User information is missing.");
    }

    // Combine requester (implicitly first organizer) and selected co-organizers
    // Ensure no duplicates and limit is respected (handled by isFormValid)
    const finalOrganizers = [...new Set([requesterUid, ...selectedOrganizers.value])];

    const requestData: EventRequest = {
        eventName: eventName.value,
        eventType: eventType.value,
        description: description.value,
        isTeamEvent: isTeamEvent.value,
        desiredStartDate: Timestamp.fromDate(new Date(desiredStartDate.value + 'T00:00:00')),
        desiredEndDate: Timestamp.fromDate(new Date(desiredEndDate.value + 'T00:00:00')),
        organizers: finalOrganizers, // Includes requester + selected
        requester: requesterUid,
        xpAllocation: xpAllocation,
        teams: isTeamEvent.value ? teams.value.map(t => ({ // Only include teams if it's a team event
            teamName: t.teamName,
            members: t.members,
            // submission: null, // Submission added later
            // ratings: {}, // Ratings added later
         })) : [],
        requestedAt: Timestamp.now(),
        status: 'Pending' // Initial status for requests
    };

    return requestData;
};


const handleSubmit = async () => {
    errorMessage.value = '';
    if (!isFormValid.value) {
        errorMessage.value = 'Please correct the errors before submitting.';
        // Force user to the first invalid step? Maybe too complex.
        return;
    }
    isSubmitting.value = true;
    try {
        const submissionData = prepareSubmissionData();
        console.log("Submitting event request:", submissionData); // For debugging
        await store.dispatch('events/submitEventRequest', submissionData);
        alert('Event request submitted successfully!');
        router.push({ name: 'Home' }); // Redirect after successful submission
    } catch (error: any) {
        console.error('Error submitting event request:', error);
        errorMessage.value = `Submission failed: ${error.message || 'Please try again.'}`;
    } finally {
        isSubmitting.value = false;
    }
};

// --- Lifecycle Hooks ---
onMounted(async () => {
    loadingCheck.value = true;
     await fetchStudents(); // Fetch students for organizer dropdown

    // Check if user already has an active request
    if (currentUser.value?.uid) {
        try {
             hasActiveRequest.value = await store.dispatch('events/checkActiveRequest', currentUser.value.uid);
         } catch (error) {
             console.error("Error checking for active requests:", error);
             errorMessage.value = "Could not check for existing requests.";
             // Decide how to proceed - allow request anyway or block? Assuming block for now.
             hasActiveRequest.value = true; // Block form if check fails
         }
    } else {
        errorMessage.value = "Cannot determine current user.";
        hasActiveRequest.value = true; // Block if no user
    }
     loadingCheck.value = false;

     // Parse step from route query if provided
     const initialStep = parseInt(route.query.step as string || '1', 10);
     if (initialStep >= 1 && initialStep <= totalSteps.value) {
         currentStep.value = initialStep;
     }

});

</script>

<style scoped>
/* Add styles if needed */
input[type="date"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
}
</style>
