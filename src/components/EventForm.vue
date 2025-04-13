<template>
    <CForm @submit.prevent="handleSubmit" class="space-y-6">
        <CCard variant="outline">
            <CCardBody>
                <CStack spacing="4">
                    <CHeading as="h3" size="md">Event Details</CHeading>

                    <CFormControl isRequired>
                        <CFormLabel>Event Format</CFormLabel>
                        <CRadioGroup v-model="formData.isTeamEvent" @change="handleFormatChange">
                            <CStack direction="row" spacing="4">
                                <CRadio :value="false" :isDisabled="isSubmitting">Individual</CRadio>
                                <CRadio :value="true" :isDisabled="isSubmitting">Team</CRadio>
                            </CStack>
                        </CRadioGroup>
                    </CFormControl>

                    <CFormControl isRequired>
                        <CFormLabel>Event Name</CFormLabel>
                        <CInput
                            v-model="formData.eventName"
                            :isDisabled="isSubmitting"
                            placeholder="Enter event name"
                        />
                    </CFormControl>

                    <CFormControl isRequired>
                        <CFormLabel>Event Type</CFormLabel>
                        <CSelect
                            v-model="formData.eventType"
                            :isDisabled="isSubmitting"
                            @change="handleEventTypeChange"
                            placeholder="Select Type"
                        >
                            <option
                                v-for="type in availableEventTypes"
                                :key="type"
                                :value="type"
                            >{{ type }}</option>
                        </CSelect>
                    </CFormControl>

                    <CFormControl isRequired>
                        <CFormLabel>Description</CFormLabel>
                        <CTextarea
                            v-model="formData.description"
                            :isDisabled="isSubmitting"
                            rows="4"
                            placeholder="Enter event description"
                        />
                    </CFormControl>

                    <div v-if="formData.isTeamEvent">
                        <CDivider my="4" />
                        <CHeading as="h4" size="sm" mb="4">Team Configuration</CHeading>
                        <ManageTeamsComponent
                            :initial-teams="formData.teams"
                            :students="availableStudents"
                            :name-cache="nameCache"
                            :is-submitting="isSubmitting"
                            :can-auto-generate="true"
                            :event-id="eventId || ''"
                            @update:teams="updateTeams"
                        />
                    </div>
                </CStack>
            </CCardBody>
        </CCard>

        <CCard variant="outline">
            <CCardBody>
                <CStack spacing="4">
                    <CHeading as="h3" size="md">Event Schedule</CHeading>

                    <CGrid :templateColumns="{ base: '1fr', sm: 'repeat(2, 1fr)' }" :gap="6">
                        <CFormControl isRequired>
                            <CFormLabel>{{ isAdmin ? 'Start Date' : 'Desired Start Date' }}</CFormLabel>
                            <DatePicker
                                v-model="formData[dateFields.startField]"
                                :enable-time-picker="false"
                                :disabled="isSubmitting"
                                @update:model-value="checkNextAvailableDate"
                                model-type="yyyy-MM-dd"
                                :min-date="new Date()"
                                :input-class-name="!isDateAvailable ? 'chakra-input error' : 'chakra-input'"
                                :auto-apply="true"
                                :teleport="true"
                                :clearable="false"
                                placeholder="Select start date"
                            />
                            <CText
                                v-if="formData[dateFields.startField]"
                                fontSize="sm"
                                :color="isDateAvailable ? 'green.500' : 'red.500'"
                                mt="1"
                            >
                                <CIcon :as="isDateAvailable ? 'check-circle' : 'exclamation-circle'" mr="1" />
                                {{ isDateAvailable ? 'Date available' : 'Date conflict detected' }}
                            </CText>
                        </CFormControl>

                        <CFormControl isRequired>
                            <CFormLabel>{{ isAdmin ? 'End Date' : 'Desired End Date' }}</CFormLabel>
                            <DatePicker
                                v-model="formData[dateFields.endField]"
                                :enable-time-picker="false"
                                :disabled="isSubmitting || !formData[dateFields.startField]"
                                @update:model-value="checkNextAvailableDate"
                                model-type="yyyy-MM-dd"
                                :min-date="formData[dateFields.startField] ? new Date(formData[dateFields.startField]) : new Date()"
                                :input-class-name="!isDateAvailable || !formData[dateFields.startField] ? 'chakra-input error' : 'chakra-input'"
                                :auto-apply="true"
                                :teleport="true"
                                :clearable="false"
                                placeholder="Select end date"
                            />
                        </CFormControl>
                    </CGrid>

                    <CAlert
                        v-if="!isDateAvailable && nextAvailableDate"
                        status="warning"
                        variant="subtle"
                    >
                        <CAlertIcon />
                        <CBox>
                            <CAlertTitle>Date Conflict Detected</CAlertTitle>
                            <CAlertDescription>
                                The selected dates conflict with another event.
                                Next available start date is <CText as="span" fontWeight="semibold">{{ formatDate(nextAvailableDate) }}</CText>.
                            </CAlertDescription>
                            <CButton
                                mt="3"
                                size="sm"
                                colorScheme="blue"
                                leftIcon="calendar-check"
                                @click="useNextAvailableDate"
                                :isDisabled="isSubmitting"
                            >
                                Use Next Available Date
                            </CButton>
                        </CBox>
                    </CAlert>
                </CStack>
            </CCardBody>
        </CCard>

        <!-- Additional sections (Rating Criteria, Co-organizers) follow the same pattern -->
        
        <CButton
            type="submit"
            colorScheme="blue"
            size="lg"
            :isLoading="isSubmitting"
            :isDisabled="!isFormValid || totalXP > 50"
            :leftIcon="isSubmitting ? 'fa-spinner' : 'fa-paper-plane'"
        >
            {{ submitButtonText }}
        </CButton>
    </CForm>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { Timestamp } from 'firebase/firestore'
import type { XPAllocation, EventCreateDTO, EventRequest, EventTeam, EventFormData } from '../types'
import {
  Box as CBox,
  Card as CCard,
  CardBody as CCardBody,
  Stack as CStack,
  Heading as CHeading,
  FormControl as CFormControl,
  FormLabel as CFormLabel,
  Input as CInput, 
  Select as CSelect,
  Textarea as CTextarea,
  RadioGroup as CRadioGroup,
  Radio as CRadio,
  Divider as CDivider,
  Grid as CGrid,
  Alert as CAlert,
  AlertIcon as CAlertIcon,
  AlertTitle as CAlertTitle,
  AlertDescription as CAlertDescription,
  Button as CButton,
  Text as CText,
  Icon as CIcon
} from '@chakra-ui/vue-next'

// Fix maxGenerateValue type
const maxGenerateValue = computed(() => {
  return generationType.value === 'fixed-size' ? 10 : Math.min(maxTeams, Math.floor(props.students.length / 2))
})

// Add component aliases
const getStartOfDayUTC = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

const getEndOfDayUTC = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
};

const props = defineProps({
    eventId: {
        type: String,
        required: false
    },
    initialData: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['submit', 'error']);

const store = useStore();
const isSubmitting = ref(false);
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);
const usersLoaded = ref(false);
const nextAvailableDate = ref<Date | null>(null);
const isDateAvailable = ref(true);
const teamsList = ref<EventTeam[]>([]);
const isUpdatingTeamsInternally = ref(false);

const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');

const defaultFormData: EventFormData = {
    isTeamEvent: false,
    eventType: '',
    eventName: '',
    description: '',
    startDate: '',
    endDate: '',
    desiredStartDate: '',
    desiredEndDate: '',
    location: '',
    organizers: [],
    xpAllocation: [],
    teams: [],
};

const formData = ref<EventFormData>(JSON.parse(JSON.stringify(defaultFormData)));

const individualEventTypes = [
    'Workshop',
    'Presentation',
    'Individual Project',
    'Training Session',
    'Tutorial'
];

const teamEventTypes = [
    'Hackathon',
    'Team Project',
    'Group Challenge',
    'Team Competition',
    'Collaborative Workshop'
];

const availableEventTypes = computed(() => {
    return formData.value.isTeamEvent ? teamEventTypes : individualEventTypes;
});

const dpInputClass = (hasError: boolean) => {
    let base = 'dp-custom-input block w-full rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100';
    return hasError ? `${base} border-error` : `${base} border-border`;
};

const handleFormatChange = () => {
    formData.value.eventType = '';
    if (!formData.value.isTeamEvent) {
        formData.value.teams = [];
    }
};

const handleEventTypeChange = () => {
};

const submitButtonText = computed(() => {
    if (isSubmitting.value) return 'Saving...';
    if (props.eventId) return 'Update Event';
    return isAdmin.value ? 'Create Event' : 'Submit Request';
});

const isFormValid = computed(() => {
    const data = formData.value;
    const datesValid = !!data[dateFields.value.startField] && !!data[dateFields.value.endField];
    const xpValid = data.xpAllocation.every(a => a.constraintLabel && a.role && a.points > 0) && totalXP.value <= 50;
    const basicInfoValid = !!data.eventName && !!data.eventType && !!data.description;
    const teamsValid = data.isTeamEvent ? data.teams.length > 0 && data.teams.every(t => t.teamName) : true;
    
    // Add organizer validation for admins
    const organizersValid = !isAdmin.value || (Array.isArray(data.organizers) && data.organizers.length > 0);

    return datesValid && xpValid && basicInfoValid && teamsValid && isDateAvailable.value && organizersValid;
});

// Update co-organizers section UI to show required status for admins
const coOrganizerSectionTitle = computed(() => {
    return `Co-organizers ${isAdmin.value ? '<span class="text-error">*</span>' : '(Optional)'}`;
});

const filteredUsers = computed(() => {
    if (!usersLoaded.value) return [];
    const search = coOrganizerSearch.value.trim().toLowerCase();
    if (!search) return [];

    const allUsers = store.getters['user/getAllUsers'] || [];
    const currentUserId = store.getters['user/userId'];

    return allUsers
        .filter(user => {
            // Skip if user is invalid, current user, already an organizer, or is an admin
            if (!user?.uid || 
                user.uid === currentUserId || 
                formData.value.organizers.includes(user.uid) || 
                user.role === 'Admin') {
                return false;
            }
            const userName = (user.name || '').toLowerCase();
            return userName.includes(search);
        })
        .slice(0, 10);
});

const addAllocation = () => {
    if (formData.value.xpAllocation.length >= 4 || totalXP.value >= 50) return;

    const remainingXP = 50 - totalXP.value;
    const defaultPoints = Math.min(10, Math.max(1, remainingXP));

    formData.value.xpAllocation.push({
        constraintIndex: formData.value.xpAllocation.length,
        constraintLabel: '',
        role: 'fullstack',
        points: defaultPoints
    });
};

const removeAllocation = (index: number) => {
    formData.value.xpAllocation.splice(index, 1);
    formData.value.xpAllocation.forEach((alloc, idx) => {
        alloc.constraintIndex = idx;
    });
};

const addCoOrganizer = (user: { uid: string }) => {
    if (!formData.value.organizers.includes(user.uid)) {
        formData.value.organizers.push(user.uid);
    }
    coOrganizerSearch.value = '';
    showCoOrganizerDropdown.value = false;
};

const removeCoOrganizer = (userId: string) => {
    formData.value.organizers = formData.value.organizers.filter(id => id !== userId);
};

const handleSubmit = async () => {
    isSubmitting.value = true;
    emit('error', '');

    if (!isFormValid.value) {
        emit('error', 'Please fill all required fields correctly and ensure dates are available.');
        isSubmitting.value = false;
        return;
    }

    try {
        const { startField, endField } = dateFields.value;
        const proposedStartDateStr = formData.value[startField];
        const proposedEndDateStr = formData.value[endField];

        const proposedStartDate = getStartOfDayUTC(proposedStartDateStr);
        const proposedEndDate = getEndOfDayUTC(proposedEndDateStr);

        const payload: Partial<EventCreateDTO | EventRequest> = {
            eventName: formData.value.eventName,
            eventType: formData.value.eventType,
            description: formData.value.description,
            isTeamEvent: formData.value.isTeamEvent,
            location: formData.value.location,
            organizers: formData.value.organizers,
            xpAllocation: formData.value.xpAllocation.map(a => ({ ...a, points: Number(a.points) })),
            teams: formData.value.isTeamEvent ? formData.value.teams : [],
        };

        if (isAdmin.value) {
            (payload as EventCreateDTO).startDate = Timestamp.fromDate(proposedStartDate);
            (payload as EventCreateDTO).endDate = Timestamp.fromDate(proposedEndDate);
        } else {
            (payload as EventRequest).desiredStartDate = Timestamp.fromDate(proposedStartDate);
            (payload as EventRequest).desiredEndDate = Timestamp.fromDate(proposedEndDate);
            (payload as EventRequest).requester = store.getters['user/userId'];
        }

        emit('submit', payload);

    } catch (error: any) {
        console.error('Form submission error:', error);
        emit('error', error.message || 'Failed to prepare event data.');
    } finally {
    }
};

const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date + 'T00:00:00Z') : date;
        return d.toLocaleDateString('en-CA');
    } catch (e) {
        console.warn("Error formatting date:", date, e);
        return '';
    }
};

const dateFields = computed(() => ({
    startField: isAdmin.value ? 'startDate' : 'desiredStartDate',
    endField: isAdmin.value ? 'endDate' : 'desiredEndDate'
}));

const useNextAvailableDate = () => {
    if (nextAvailableDate.value) {
        const { startField, endField } = dateFields.value;
        const startDateStr = formatDate(nextAvailableDate.value);
        formData.value[startField] = startDateStr;

        const originalStartStr = formData.value[startField];
        const originalEndStr = formData.value[endField];
        let endDate = new Date(nextAvailableDate.value);
        if (originalStartStr && originalEndStr) {
            try {
                const duration = getEndOfDayUTC(originalEndStr).getTime() - getStartOfDayUTC(originalStartStr).getTime();
                if (duration >= 0) {
                    endDate = new Date(nextAvailableDate.value.getTime() + duration);
                }
            } catch { }
        }
        formData.value[endField] = formatDate(endDate);

        checkNextAvailableDate();
    }
};

const checkNextAvailableDate = async () => {
    const { startField, endField } = dateFields.value;
    const selectedStartDateStr = formData.value[startField];
    const selectedEndDateStr = formData.value[endField];

    if (!selectedStartDateStr) {
        isDateAvailable.value = true;
        nextAvailableDate.value = null;
        return;
    }

    try {
        const checkStartDate = getStartOfDayUTC(selectedStartDateStr);
        const checkEndDate = selectedEndDateStr ? getEndOfDayUTC(selectedEndDateStr) : getEndOfDayUTC(selectedStartDateStr);

        // Use proper error handling for the date check response
        const dateCheck = await store.dispatch('events/checkDateConflict', {
            startDate: checkStartDate,
            endDate: checkEndDate,
            excludeEventId: props.eventId
        });

        // Handle the response properly
        if (dateCheck && typeof dateCheck.hasConflict === 'boolean') {
            isDateAvailable.value = !dateCheck.hasConflict;
            nextAvailableDate.value = dateCheck.hasConflict && dateCheck.nextAvailableDate ? 
                new Date(dateCheck.nextAvailableDate) : null;
                
            if (!isDateAvailable.value && nextAvailableDate.value) {
                const conflictEventName = dateCheck.conflictingEvent?.eventName || 'another event';
                emit('error', `Date conflict with ${conflictEventName}. Next available: ${formatDate(nextAvailableDate.value)}`);
            } else {
                emit('error', '');
            }
        } else {
            console.error('Invalid date check response:', dateCheck);
            throw new Error('Invalid date check response from server');
        }
    } catch (error) {
        console.error('Error checking date availability:', error);
        isDateAvailable.value = false;
        nextAvailableDate.value = null;
        emit('error', 'Could not verify date availability.');
    }
};

const totalXP = computed(() => {
    return formData.value.xpAllocation.reduce((sum, alloc) => sum + (Number(alloc.points) || 0), 0);
});

const maxPointsForAllocation = (index: number): number => {
    const currentPoints = Number(formData.value.xpAllocation[index]?.points) || 0;
    const otherPointsTotal = formData.value.xpAllocation.reduce((sum, alloc, i) => {
        return i !== index ? sum + (Number(alloc.points) || 0) : sum;
    }, 0);
    return Math.max(1, 50 - otherPointsTotal);
};

const handlePointsInput = (index: number) => {
};

watch(() => formData.value.xpAllocation, (newAllocations, oldAllocations) => {
    newAllocations.forEach(alloc => {
        alloc.points = Number(alloc.points) || 1;
    });

    let currentTotal = newAllocations.reduce((sum, alloc) => sum + alloc.points, 0);

    if (currentTotal > 50) {
        const lastChangedIndex = findLastChangedIndex(newAllocations, oldAllocations);
        if (lastChangedIndex !== -1) {
            const excess = currentTotal - 50;
            const currentPoints = newAllocations[lastChangedIndex].points;
            nextTick(() => {
                formData.value.xpAllocation[lastChangedIndex].points = Math.max(1, currentPoints - excess);
            });
        }
    }

    if (newAllocations.length !== oldAllocations?.length) {
        nextTick(() => {
             formData.value.xpAllocation.forEach((alloc, idx) => {
                 alloc.constraintIndex = idx;
             });
        });
    }

}, { deep: true });

const findLastChangedIndex = (newArr, oldArr) => {
    if (!oldArr || newArr.length !== oldArr.length) {
        return newArr.length - 1;
    }
    for (let i = newArr.length - 1; i >= 0; i--) {
        if (JSON.stringify(newArr[i]) !== JSON.stringify(oldArr[i])) {
            return i;
        }
    }
    return newArr.length - 1;
};

watch(() => props.initialData, (newData) => {
    if (newData && Object.keys(newData).length > 0 && !props.eventId) {
        return;
    }
    if (newData && Object.keys(newData).length > 0 && props.eventId) {
        const dataToLoad = JSON.parse(JSON.stringify(newData));

        const formatInitialDate = (dateInput: any): string => {
            if (!dateInput) return '';
            try {
                const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
                return formatDate(date);
            } catch {
                return '';
            }
        };

        formData.value = {
            ...defaultFormData,
            ...dataToLoad,
            startDate: formatInitialDate(dataToLoad.startDate),
            endDate: formatInitialDate(dataToLoad.endDate),
            desiredStartDate: formatInitialDate(dataToLoad.desiredStartDate),
            desiredEndDate: formatInitialDate(dataToLoad.desiredEndDate),
            xpAllocation: (dataToLoad.xpAllocation || []).map((a: any) => ({ ...a, points: Number(a.points) || 1 })),
            teams: Array.isArray(dataToLoad.teams) ? dataToLoad.teams : [],
        };

        nextTick(() => {
            checkNextAvailableDate();
        });
    } else {
        formData.value = JSON.parse(JSON.stringify(defaultFormData));
        isDateAvailable.value = true;
        nextAvailableDate.value = null;
    }
}, { immediate: true, deep: true });

onMounted(async () => {
    const currentUsers = store.getters['user/getAllUsers'];
    if (!currentUsers || currentUsers.length === 0) {
        try {
            await store.dispatch('user/fetchAllUsers');
            usersLoaded.value = true;
        } catch (error) {
            console.error("Failed to fetch users on mount:", error);
            emit('error', 'Failed to load user data for co-organizer selection.');
        }
    } else {
        usersLoaded.value = true;
    }
});

const availableStudents = computed(() => {
    const allUsers = store.getters['user/getAllUsers'] || [];
    return allUsers.filter(user =>
        user.role !== 'Admin' &&
        user.uid !== store.getters['user/userId'] &&
        !formData.value.organizers.includes(user.uid)
    );
});

const nameCache = computed(() => {
    const users = store.getters['user/getAllUsers'] || [];
    return Object.fromEntries(users.map(user => [user.uid, user.name || user.uid]));
});

const updateTeams = (teams: EventTeam[]) => {
    if (isUpdatingTeamsInternally.value) return;
    isUpdatingTeamsInternally.value = true;
    formData.value.teams = JSON.parse(JSON.stringify(teams));
    nextTick(() => {
        isUpdatingTeamsInternally.value = false;
    });
};

const hideCoOrganizerDropdown = () => {
    setTimeout(() => {
        showCoOrganizerDropdown.value = false;
    }, 200);
};

const getUserName = (userId: string): string => {
    return nameCache.value[userId] || userId;
};

</script>

<style>
/* Only keep DatePicker customization */
.chakra-input {
    width: 100%;
    min-width: 0px;
    outline: 2px solid transparent;
    outline-offset: 2px;
    position: relative;
    appearance: none;
    font-size: 1rem;
    padding-inline-start: 1rem;
    padding-inline-end: 1rem;
    height: 2.5rem;
    border-radius: 0.375rem;
    border: 1px solid;
    border-color: inherit;
    background: inherit;
}

.chakra-input.error {
    border-color: var(--chakra-colors-red-500);
}

/* Keep existing transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
