<template>
    <div class="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-secondary-light rounded-lg shadow-sm">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">
            {{ isEditing ? 'Edit Event' : 'Create New Event' }}
        </h2>
        <button @click="$router.back()" class="mb-6 text-sm text-primary hover:text-primary-dark transition-colors flex items-center">
            <i class="fas fa-arrow-left mr-1"></i> Back
        </button>

         <!-- Loading Indicator -->
        <div v-if="isLoadingEventData" class="text-center py-16 text-gray-500">
            <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
            <p>Loading event data...</p>
        </div>
        <div v-else-if="loadingError" class="mb-6 p-4 bg-red-100 text-red-800 border border-red-200 rounded-md shadow-sm">
            <i class="fas fa-exclamation-circle mr-2"></i> {{ loadingError }}
        </div>

        <!-- Main Form -->
        <form @submit.prevent="handleSubmit" v-else class="space-y-8">
            <!-- Basic Info Section -->
            <div class="bg-white p-6 rounded-lg shadow border border-secondary space-y-6">
                <h3 class="text-xl font-semibold leading-6 text-gray-800 border-b border-secondary pb-3">Event Details</h3>
                <div>
                    <label for="eventName" class="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                    <input type="text" v-model="eventName" id="eventName" required class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Is this a Team Event?</label>
                    <div class="mt-2 flex items-center space-x-6">
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="radio" :value="false" v-model="isTeamEvent" name="eventTypeToggle" class="h-4 w-4 border-secondary text-primary focus:ring-primary-light">
                            <span class="ml-2 text-sm text-gray-800">Individual</span>
                        </label>
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="radio" :value="true" v-model="isTeamEvent" name="eventTypeToggle" class="h-4 w-4 border-secondary text-primary focus:ring-primary-light">
                            <span class="ml-2 text-sm text-gray-800">Team</span>
                        </label>
                    </div>
                </div>
                <div>
                    <label for="eventType" class="block text-sm font-medium text-gray-700 mb-1">Event Category</label>
                    <select id="eventType" v-model="eventType" required class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                        <option disabled value="">Please select a category</option>
                        <option v-for="category in availableEventCategories" :key="category.value" :value="category.value">{{ category.label }}</option>
                    </select>
                </div>
                 <div>
                    <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea id="description" v-model="description" rows="4" required class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm"></textarea>
                </div>
                 <!-- Admin Date Setting -->
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input type="date" v-model="startDate" id="startDate" required :min="minDate" @change="validateDates" class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                        <p v-if="dateErrorMessages.startDate" class="mt-1 text-xs text-red-600">{{ dateErrorMessages.startDate }}</p>
                    </div>
                    <div>
                        <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input type="date" v-model="endDate" id="endDate" required :min="startDate || minDate" @change="validateDates" class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                         <p v-if="dateErrorMessages.endDate" class="mt-1 text-xs text-red-600">{{ dateErrorMessages.endDate }}</p>
                    </div>
                </div>
                <!-- Organizer Selection -->
                <div>
                    <h4 class="text-md font-medium text-gray-800 mb-2">Organizers <span class="text-xs text-gray-500">(Max {{ maxOrganizers }} including requester if applicable)</span></h4>
                    <p v-if="originalRequesterName" class="text-xs text-gray-500 mb-2">Original Requester: <span class="font-medium">{{ originalRequesterName }}</span> (automatically included)</p>
                     <div class="relative">
                        <input type="text" v-model="organizerSearch" placeholder="Search students to add as organizers..." @focus="handleSearchFocus" @blur="handleSearchBlur" :disabled="!canAddMoreOrganizers"
                               class="block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                         <div v-if="showOrganizerDropdown && filteredStudentsForDropdown.length > 0" class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-secondary">
                            <ul tabindex="-1" role="listbox">
                                <li v-for="student in filteredStudentsForDropdown" :key="student.uid" @mousedown.prevent="addOrganizer(student)"
                                    class="text-gray-900 cursor-pointer select-none relative py-2 px-4 hover:bg-primary-light hover:text-white transition-colors">
                                    <span class="font-normal block truncate">{{ student.name }}</span>
                                </li>
                            </ul>
                         </div>
                         <p v-if="!canAddMoreOrganizers" class="mt-1 text-xs text-gray-500">Maximum number of organizers reached.</p>
                   </div>
                    <div v-if="selectedOrganizers.length > 0" class="mt-4 space-y-2">
                        <p class="text-xs font-medium text-gray-600">Selected Organizers:</p>
                         <ul class="flex flex-wrap gap-2">
                            <li v-for="uid in selectedOrganizers" :key="uid" class="flex items-center bg-secondary rounded-full px-3 py-1 text-sm font-medium text-gray-700 shadow-sm">
                                <span>{{ studentNameCache[uid] || uid }}</span>
                                <button @click="removeOrganizer(uid)" type="button" class="ml-1.5 flex-shrink-0 text-gray-400 hover:text-red-500 focus:outline-none transition-colors rounded-full hover:bg-red-100 p-0.5">
                                    <i class="fas fa-times h-3 w-3"></i>
                                    <span class="sr-only">Remove {{ studentNameCache[uid] }}</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
                <!-- Status Selection (Only if Editing) -->
                 <div v-if="isEditing">
                     <label for="eventStatus" class="block text-sm font-medium text-gray-700 mb-1">Event Status</label>
                     <select id="eventStatus" v-model="eventStatus" required class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                         <option value="Pending">Pending</option>
                         <option value="Approved">Approved</option>
                         <option value="Rejected">Rejected</option>
                         <option value="Ongoing">Ongoing</option>
                         <option value="Completed">Completed</option>
                     </select>
                     <!-- Rejection Reason Input -->
                     <div v-if="eventStatus === 'Rejected'" class="mt-3">
                         <label for="rejectionReason" class="block text-xs font-medium text-gray-700 mb-1">Rejection Reason (Optional)</label>
                         <input type="text" id="rejectionReason" v-model="rejectionReason" placeholder="Reason for rejecting the event..." class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                     </div>
                 </div>
            </div>

            <!-- Team Definition (Only if isTeamEvent is true) -->
            <div v-if="isTeamEvent" class="bg-white p-6 rounded-lg shadow border border-secondary space-y-6">
                <h3 class="text-xl font-semibold leading-6 text-gray-800 border-b border-secondary pb-3">Define/Manage Teams</h3>
                <ManageTeamsComponent
                    :initial-teams="teams"
                    :available-students="availableStudentsWithoutOrganizers"
                    :student-name-cache="studentNameCache"
                    @teams-updated="handleTeamsUpdate"
                    :event-type="'admin'" />
            </div>

            <!-- Rating Criteria -->
            <div class="bg-white p-6 rounded-lg shadow border border-secondary space-y-6">
                <h3 class="text-xl font-semibold leading-6 text-gray-800 border-b border-secondary pb-3">Rating Criteria & XP Allocation</h3>
                <p class="text-sm text-gray-600">Define how participants will be rated and allocate XP (maximum 5 criteria, total XP cannot exceed 100).</p>
                <div class="space-y-4">
                    <div v-for="(criteria, index) in ratingCriteria" :key="index" class="flex flex-col md:flex-row items-start md:items-center gap-3 p-4 border border-secondary rounded-md bg-secondary-light">
                        <div class="flex-1 w-full md:w-auto">
                             <label :for="`criteria-label-${index}`" class="sr-only">Criteria Label</label>
                            <input :id="`criteria-label-${index}`" type="text" v-model="criteria.label" :placeholder="getDefaultCriteriaLabel(index)" class="block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm" />
                        </div>
                        <div class="flex-shrink-0 w-full md:w-1/4">
                             <label :for="`criteria-role-${index}`" class="sr-only">Role</label>
                             <select :id="`criteria-role-${index}`" v-model="criteria.role" class="block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                                 <option value="general">General</option>
                                 <option v-for="role in availableRoles" :key="role.value" :value="role.value">{{ role.label }}</option>
                            </select>
                        </div>
                        <div class="flex-shrink-0 w-full md:w-auto">
                             <label :for="`criteria-points-${index}`" class="sr-only">XP Points</label>
                             <input :id="`criteria-points-${index}`" type="number" v-model.number="criteria.points" min="1" max="100" class="block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm" placeholder="XP" />
                        </div>
                         <button @click="removeConstraint(index)" type="button" :disabled="ratingCriteria.length <= 1" class="text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-full hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300">
                              <i class="fas fa-trash h-4 w-4"></i><span class="sr-only">Remove Criteria</span>
                         </button>
                    </div>
                </div>
                 <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-secondary">
                    <button @click="addConstraint" type="button" :disabled="ratingCriteria.length >= 5" class="inline-flex items-center rounded-md border border-transparent bg-primary-light px-4 py-2 text-xs font-medium text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                         <i class="fas fa-plus mr-1"></i> Add Criteria
                    </button>
                    <div class="text-right">
                        <p class="text-sm font-semibold text-gray-800">Total XP Allocated: {{ totalAllocatedXp }} / 100</p>
                        <p v-if="totalAllocatedXp > 100" class="mt-1 text-xs text-red-600">Total XP exceeds the 100 point limit.</p>
                    </div>
                </div>
            </div>

            <!-- Submission -->
            <div class="mt-8 pt-6 border-t border-secondary">
                 <div class="flex justify-end">
                     <button type="submit" :disabled="isSubmitting || !isFormValid"
                             class="inline-flex items-center rounded-md border border-transparent bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                         <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                           <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         {{ getSubmitButtonText }}
                      </button>
                 </div>
                 <p v-if="submitError" class="mt-4 text-sm text-red-600 text-center">{{ submitError }}</p>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { collection, getDocs, query, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ManageTeamsComponent from '../components/ManageTeamsComponent.vue';
import { EventData, TeamMember, Student, RatingCriteria } from '../types/event'; // Assuming types are defined

// --- Props --- (For editing existing event)
const props = defineProps({
    eventId: { type: String, default: null }
});

// --- Core State ---
const isTeamEvent = ref<boolean>(false);
const isEditing = computed(() => !!props.eventId);

// --- Form Fields ---
const eventName = ref<string>('');
const eventType = ref<string>('Hackathon'); // Default for admin creation
const description = ref<string>('');
const startDate = ref<string>(''); // Actual start date
const endDate = ref<string>('');   // Actual end date
const selectedOrganizers = ref<string[]>([]);
const eventStatus = ref<string>('Approved'); // Default for new admin-created events
const rejectionReason = ref<string | null>(null);
const originalRequester = ref<string | null>(null); // Store original requester ID if editing a request
const originalRequesterName = ref<string | null>(null); // Store original requester Name if editing a request

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
const availableRoles = [
    { value: 'fullstack', label: 'Full Stack Developer' },
    { value: 'presenter', label: 'Presenter' },
    { value: 'designer', label: 'Designer' },
    { value: 'problemSolver', label: 'Problem Solver' }
];

// --- General State ---
const store = useStore();
const router = useRouter();
const route = useRoute();
const submitError = ref<string>('');
const loadingError = ref<string>(''); // Error during initial data load for editing
const loadingStudents = ref<boolean>(true);
const isLoadingEventData = ref<boolean>(false);
const isSubmitting = ref<boolean>(false);

// --- Date Validation State ---
const dateErrorMessages = ref<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });

// --- Computed ---
const currentUser = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin'); // Should always be true here, but good practice

const minDate = computed(() => {
  const today = new Date();
  // Allow selecting today for admin?
  return today.toISOString().split('T')[0];
});

// Adjust max organizers based on whether there was an original requester
const maxOrganizers = computed(() => originalRequester.value ? 4 : 5);
const canAddMoreOrganizers = computed(() => selectedOrganizers.value.length < maxOrganizers.value);

const availableStudentsWithoutOrganizers = computed(() => {
    const excludeIds = new Set(selectedOrganizers.value);
    if (originalRequester.value) {
        excludeIds.add(originalRequester.value);
    }
    return availableStudents.value.filter(s => !excludeIds.has(s.uid));
});

const filteredStudentsForDropdown = computed(() => {
    if (!organizerSearch.value) return [];
    const lowerSearch = organizerSearch.value.toLowerCase();
    const excludeIds = new Set(selectedOrganizers.value);
     if (originalRequester.value) {
        excludeIds.add(originalRequester.value);
    }
    return availableStudents.value.filter(s =>
        !excludeIds.has(s.uid) &&
        s.name.toLowerCase().includes(lowerSearch)
    );
});

const hasValidTeams = computed(() => {
    if (!isTeamEvent.value) return true;
    const validTeams = teams.value.filter(t => t.teamName.trim() !== '' && t.members.length > 0);
    // Admin might create an event before teams are fully defined, adjust validation?
    // For now, require at least 1 team if isTeamEvent is true for creation/edit
    return validTeams.length >= 1;
});

const totalAllocatedXp = computed(() => {
    return ratingCriteria.value.reduce((sum, criteria) => sum + (criteria.points || 0), 0);
});

const isFormValid = computed(() => {
    return eventName.value.trim() !== '' &&
           eventType.value !== '' &&
           description.value.trim() !== '' &&
           startDate.value !== '' &&
           endDate.value !== '' &&
           !dateErrorMessages.value.startDate &&
           !dateErrorMessages.value.endDate &&
           (isTeamEvent.value ? hasValidTeams.value : true) && // Check teams if applicable
           totalAllocatedXp.value > 0 && totalAllocatedXp.value <= 100 &&
           selectedOrganizers.value.length <= maxOrganizers.value; // Check organizer limit
});

const getSubmitButtonText = computed(() => {
    if (isSubmitting.value) return isEditing.value ? 'Saving Changes...' : 'Creating Event...';
    if (!isFormValid.value) return 'Complete Required Fields';
    return isEditing.value ? 'Save Changes' : 'Create Event';
});

// --- Event Category Lists --- (Copied again)
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
watch(isTeamEvent, (newVal, oldVal) => {
    // Only reset type if not editing or if type hasn't been set yet
    if (!isEditing.value || !eventType.value) {
         eventType.value = newVal ? 'Hackathon' : 'Topic Presentation';
    }
    // Reset teams if switching from team to individual?
    if (!newVal && oldVal === true) {
        teams.value = [{ teamName: '', members: [], isNew: true }];
    }
});

watch(eventStatus, (newStatus) => {
    // Clear rejection reason if status is not Rejected
    if (newStatus !== 'Rejected') {
        rejectionReason.value = null;
    }
});

// --- Methods ---

const validateDates = () => {
    dateErrorMessages.value = { startDate: '', endDate: '' };
    let start: Date | null = null;
    let end: Date | null = null;

    if (startDate.value) {
        start = new Date(startDate.value + 'T00:00:00');
    }
    if (endDate.value) {
        end = new Date(endDate.value + 'T00:00:00');
         if (start && end < start) {
             dateErrorMessages.value.endDate = 'End date cannot be before the start date.';
         }
    }
    // Conflict checking could be added here if admins also need it, but likely less critical than for requests.
};

const handleTeamsUpdate = (updatedTeams: TeamMember[]) => {
    teams.value = updatedTeams;
};

const fetchStudents = async () => {
    loadingStudents.value = true;
    submitError.value = '';
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef); // Fetch all users (including admins? Decide if they can be organizers)
        const querySnapshot = await getDocs(q);

        const students = querySnapshot.docs
            .map(doc => ({ uid: doc.id, name: doc.data().name || 'Unnamed', role: doc.data().role || 'Student' }))
            .filter(u => u.role !== 'Admin') // Maybe filter Admins out from being organizers?
            .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid));

        students.forEach(student => { studentNameCache.value[student.uid] = student.name; });
        availableStudents.value = students;

    } catch (error) {
        console.error('Error fetching students:', error);
        submitError.value = 'Failed to load student list';
    } finally {
        loadingStudents.value = false;
    }
};

const fetchEventData = async () => {
    if (!props.eventId) return;
    isLoadingEventData.value = true;
    loadingError.value = '';
    try {
        const eventData = await store.dispatch('events/fetchEventById', props.eventId);
        if (!eventData) {
            throw new Error("Event not found.");
        }

        // Populate form fields
        eventName.value = eventData.eventName || '';
        eventType.value = eventData.eventType || (eventData.isTeamEvent ? 'Hackathon' : 'Topic Presentation');
        isTeamEvent.value = eventData.isTeamEvent || false;
        description.value = eventData.description || '';
        startDate.value = eventData.startDate?.toDate ? eventData.startDate.toDate().toISOString().split('T')[0] : '';
        endDate.value = eventData.endDate?.toDate ? eventData.endDate.toDate().toISOString().split('T')[0] : '';
        eventStatus.value = eventData.status || 'Pending';
        rejectionReason.value = eventData.rejectionReason || null;
        originalRequester.value = eventData.requester || null;

        // Handle organizers (excluding the original requester if they exist)
        selectedOrganizers.value = (eventData.organizers || []).filter(orgId => orgId !== originalRequester.value);

        // Handle teams
        teams.value = (eventData.teams || []).map(t => ({ ...t, isNew: false })); // Mark existing teams
        if (teams.value.length === 0 && isTeamEvent.value) {
             teams.value = [{ teamName: '', members: [], isNew: true }]; // Add placeholder if team event has no teams yet
        }

        // Handle rating criteria
        ratingCriteria.value = (eventData.xpAllocation || []).map(alloc => ({
            label: alloc.constraintLabel || '',
            role: alloc.role || 'general',
            points: alloc.points || 0
        }));
        if (ratingCriteria.value.length === 0) {
            ratingCriteria.value = [{ label: '', role: 'general', points: 5 }]; // Add placeholder
        }

        // Fetch names for organizers and requester
        let idsToFetch = new Set(selectedOrganizers.value);
        if (originalRequester.value) idsToFetch.add(originalRequester.value);
        await fetchUserNames(Array.from(idsToFetch));
        if(originalRequester.value) {
            originalRequesterName.value = studentNameCache.value[originalRequester.value] || originalRequester.value;
        }


    } catch (error: any) {
        console.error("Error loading event data:", error);
        loadingError.value = `Failed to load event data: ${error.message || 'Please try again.'}`;
    } finally {
        isLoadingEventData.value = false;
    }
};

// Fetch user names (simple version, consider batching for many users)
async function fetchUserNames(userIds: string[]) {
    const idsToFetch = [...new Set(userIds)].filter(id => id && !studentNameCache.value.hasOwnProperty(id));
    if (idsToFetch.length === 0) return;
    try {
        const names = await store.dispatch('user/fetchUserNamesBatch', idsToFetch); // Use Vuex action
         idsToFetch.forEach(id => {
            studentNameCache.value[id] = names[id] || id;
        });
    } catch (error) {
        console.error("Error fetching user names batch:", error);
        idsToFetch.forEach(id => { if (!studentNameCache.value.hasOwnProperty(id)) studentNameCache.value[id] = id; });
    }
}

// --- Organizer Selection Helpers ---
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
const addConstraint = () => { if (ratingCriteria.value.length < 5) ratingCriteria.value.push({ label: '', role: 'general', points: 5 }); };
const removeConstraint = (index: number) => { if (ratingCriteria.value.length > 1) ratingCriteria.value.splice(index, 1); };

const prepareEventData = (): Partial<EventData> => {
    const xpAllocation = ratingCriteria.value
        .map((criteria, index) => ({
            constraintIndex: index,
            constraintLabel: criteria.label || getDefaultCriteriaLabel(index),
            role: criteria.role || 'general',
            points: criteria.points || 0
        }))
        .filter(allocation => allocation.points > 0);

    // Combine selected organizers with the original requester (if editing a request)
    const finalOrganizers = [...new Set([
        ...(originalRequester.value ? [originalRequester.value] : []),
        ...selectedOrganizers.value
    ])];

    const data: Partial<EventData> = {
        eventName: eventName.value,
        eventType: eventType.value,
        description: description.value,
        isTeamEvent: isTeamEvent.value,
        startDate: Timestamp.fromDate(new Date(startDate.value + 'T00:00:00')),
        endDate: Timestamp.fromDate(new Date(endDate.value + 'T00:00:00')),
        organizers: finalOrganizers,
        xpAllocation: xpAllocation,
        teams: isTeamEvent.value ? teams.value.map(t => ({ teamName: t.teamName, members: t.members })) : [],
        status: eventStatus.value, // Include status
        // Include requester only if it existed originally (editing a request)
        ...(originalRequester.value && { requester: originalRequester.value }),
        // Add rejection reason only if status is Rejected
        ...(eventStatus.value === 'Rejected' && rejectionReason.value && { rejectionReason: rejectionReason.value }),
        // Add/update timestamps
        ...(isEditing.value ? { updatedAt: Timestamp.now() } : { createdAt: Timestamp.now(), requestedAt: Timestamp.now() }) // Use requestedAt for consistency if creating from scratch?
    };

    // Clean up potential null rejectionReason if status is not Rejected
     if (data.status !== 'Rejected') {
         delete data.rejectionReason;
     }

    return data;
};

const handleSubmit = async () => {
    submitError.value = '';
    if (!isFormValid.value) {
        submitError.value = 'Please correct the errors before submitting.';
        return;
    }
    isSubmitting.value = true;
    try {
        const eventData = prepareEventData();

        if (isEditing.value && props.eventId) {
            console.log("Updating event:", props.eventId, eventData);
             await store.dispatch('events/updateEvent', { eventId: props.eventId, eventData });
             alert('Event updated successfully!');
             router.push({ name: 'ManageRequests' }); // Or back to event details?
        } else {
            console.log("Creating event:", eventData);
             await store.dispatch('events/createEvent', eventData);
             alert('Event created successfully!');
             router.push({ name: 'ManageRequests' }); // Redirect after successful creation
        }
    } catch (error: any) {
        console.error('Error saving event:', error);
        submitError.value = `Save failed: ${error.message || 'Please try again.'}`;
    } finally {
        isSubmitting.value = false;
    }
};

// --- Lifecycle Hooks ---
onMounted(async () => {
    if (!isAdmin.value) {
         loadingError.value = "Access Denied.";
         console.error("Non-admin user accessed CreateEditEventView");
         // Optionally redirect
         // router.replace({ name: 'Home' });
         return;
     }

    await fetchStudents(); // Fetch students for organizer dropdown
    if (isEditing.value) {
        await fetchEventData(); // Load existing data if editing
    } else {
         // Set default start date? e.g., tomorrow
         // const tomorrow = new Date();
         // tomorrow.setDate(tomorrow.getDate() + 1);
         // startDate.value = tomorrow.toISOString().split('T')[0];
    }
});

</script>

<style scoped>
/* Add styles if needed */
input[type="date"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s ease;
}
input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}
</style> 