<template>
  <CStack spacing="4">
    <template v-if="teams.length > 0">
      <CBox v-for="(team, index) in teams" :key="index" p="4" bg="surface" borderRadius="lg" borderWidth="1px" borderColor="border">
        <CFlex justify="space-between" align="center" mb="3">
          <CFlex align="center" gap="2">
            <CInput
              v-model="team.teamName"
              size="sm"
              fontWeight="medium"
              placeholder="Team Name"
              :isDisabled="isSubmitting"
            />
          </CFlex>
          <CIconButton
            icon={<CIcon name="fa-times" />}
            variant="ghost"
            colorScheme="red"
            size="sm"
            :isDisabled="isSubmitting"
            @click="removeTeam(index)"
            aria-label="Remove team"
          />
        </CFlex>
        
        <CStack spacing="2">
          <TeamMemberSelect
            :selected-members="team.members"
            :available-students="availableStudentsForTeam(index)"
            :name-cache="nameCache"
            :is-submitting="isSubmitting"
            :min-members="2"
            :max-members="10"
            @update:members="updateTeamMembers(index, $event)"
          />
          
          <CBox v-if="team.members.length > 0" mt="2">
            <CWrap spacing="2">
              <CBadge
                v-for="memberId in team.members"
                :key="memberId"
                px="2.5"
                py="1"
                borderRadius="full"
                variant="subtle"
                colorScheme="primary"
              >
                <CFlex align="center">
                  {{ nameCache[memberId] || memberId }}
                  <CIconButton
                    ml="1.5"
                    size="xs"
                    icon={<CIcon name="fa-times" />}
                    variant="ghost"
                    :isDisabled="isSubmitting"
                    @click="removeMember(index, memberId)"
                    aria-label="Remove member"
                  />
                </CFlex>
              </CBadge>
            </CWrap>
            <CText fontSize="xs" color="text-secondary" mt="1">
              {{ team.members.length }}/10 members
              <CText as="span" color="error" v-if="team.members.length < 2">
                (Minimum 2 members required)
              </CText>
            </CText>
          </CBox>
        </CStack>
      </CBox>
    </template>

    <CFlex justify="space-between" align="center">
      <CButton
        leftIcon={<CIcon name="fa-plus" />}
        colorScheme="primary"
        size="sm"
        :isDisabled="isSubmitting"
        @click="addTeam"
      >
        Add Team
      </CButton>

      <template v-if="canAutoGenerate">
        <CFlex align="center" gap="2">
          <CSelect
            v-model="generationType"
            size="sm"
            :isDisabled="isSubmitting"
          >
            <option value="fixed-size">Fixed Size Teams</option>
            <option value="fixed-count">Fixed Number of Teams</option>
          </CSelect>
          
          <CNumberInput
            v-model="generateValue"
            size="sm"
            w="16"
            :min="2"
            :max="maxGenerateValue"
            :isDisabled="isSubmitting"
          />
          
          <CButton
            leftIcon={<CIcon name="fa-random" />}
            colorScheme="secondary"
            size="sm"
            :isDisabled="isSubmitting || !canGenerate || !hasValidEventId"
            :title="autoGenerateButtonTitle"
            @click="handleAutoGenerate"
          >
            Auto-Generate
          </CButton>
        </CFlex>
      </template>
    </CFlex>
  </CStack>
</template>

<script setup lang="ts">
import {
  Box as CBox,
  Button as CButton,
  IconButton as CIconButton,
  Stack as CStack,
  Flex as CFlex,
  Input as CInput,
  Select as CSelect,
  NumberInput as CNumberInput,
  Text as CText,
  Wrap as CWrap,
  Badge as CBadge,
  Icon as CIcon
} from '@chakra-ui/vue-next'

import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import TeamMemberSelect from '././TeamMemberSelect.vue'; 

interface Team {
  teamName: string;
  members: string[];
  submissions: any[];
  ratings: any[];
}

interface Student {
  uid: string;
  name?: string;
}

interface Props {
  initialTeams: Team[];
  students: Student[];
  nameCache: Record<string, string>;
  isSubmitting: boolean;
  canAutoGenerate: boolean;
  eventId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:teams', teams: Team[]): void;
  (e: 'error', message: string): void;
}>();

const store = useStore();
const teams = ref<Team[]>(JSON.parse(JSON.stringify(props.initialTeams || []))); 
const generationType = ref<'fixed-size' | 'fixed-count'>('fixed-size');
const generateValue = ref(3);

const maxTeams = 8;

const maxGenerateValue = computed(() => {
  if (generationType.value === 'fixed-size') {
    return 10;
  }
  return Math.min(maxTeams, Math.floor(props.students.length / 2));
});

const canGenerate = computed(() => {
  const studentCount = Array.isArray(props.students) ? props.students.length : 0;
  const assignedMembersCount = teams.value.flatMap(t => t.members || []).length;
  const availableStudents = studentCount - assignedMembersCount;
  return availableStudents >= 2;
});

const hasValidEventId = computed(() => Boolean(props.eventId?.trim()));

const autoGenerateButtonTitle = computed(() => {
  if (!hasValidEventId.value) {
    return 'Please save the event first before generating teams';
  }
  if (!canGenerate.value) {
    return 'Not enough available students to generate teams';
  }
  if (isSubmitting.value) {
    return 'Please wait...';
  }
  return 'Generate teams automatically';
});

const handleAutoGenerate = async () => {
  try {
    if (!hasValidEventId.value) {
      throw new Error('Please save the event first before generating teams.');
    }

    if (generationType.value === 'fixed-count' && generateValue.value > maxTeams) {
      throw new Error(`Cannot generate more than ${maxTeams} teams.`);
    }

    const generatedTeams = await store.dispatch('events/autoGenerateTeams', {
      eventId: props.eventId!,
      generationType: generationType.value,
      value: generateValue.value,
      maxTeams: maxTeams
    });
    
    if (Array.isArray(generatedTeams)) {
      teams.value = generatedTeams;
      emit('update:teams', teams.value);
    } else {
      throw new Error('Team generation failed: Invalid response from server');
    }
  } catch (error) {
    console.error('Error generating teams:', error);
    emit('error', error instanceof Error ? error.message : 'Failed to generate teams');
  }
};

const availableStudentsForTeam = (teamIndex: number): Student[] => {
  if (!Array.isArray(props.students)) return [];
  
  const assignedToOtherTeams = new Set(
    teams.value
      .filter((_, i) => i !== teamIndex)
      .flatMap(t => t.members || [])
  );
  
  return props.students.filter(s => s && s.uid && !assignedToOtherTeams.has(s.uid));
};

const addTeam = () => {
  if (teams.value.length >= maxTeams) {
    emit('error', 'Maximum of 8 teams allowed');
    return;
  }
  if (teams.value.length >= Math.floor(props.students.length / 2)) {
    emit('error', 'Maximum number of possible teams reached based on available students');
    return;
  }
  teams.value.push({
    teamName: `Team ${teams.value.length + 1}`,
    members: [],
    submissions: [],
    ratings: []
  });
  emit('update:teams', teams.value);
};

const removeTeam = (index: number) => {
    if (index < 2) {
        emit('error', 'Cannot remove default teams - minimum 2 teams required');
        return;
    }
    teams.value.splice(index, 1);
    emit('update:teams', teams.value);
};

const initializeDefaultTeams = () => {
    if (!teams.value || teams.value.length === 0) {
        teams.value = [
            {
                teamName: 'Team 1',
                members: [],
                submissions: [],
                ratings: []
            },
            {
                teamName: 'Team 2',
                members: [],
                submissions: [],
                ratings: []
            }
        ];
        emit('update:teams', teams.value);
    }
};

onMounted(() => {
    initializeDefaultTeams();
});

const removeMember = (teamIndex: number, memberId: string) => {
  if (teams.value[teamIndex]) {
    teams.value[teamIndex].members = teams.value[teamIndex].members.filter(id => id !== memberId);
    emit('update:teams', teams.value);
  }
};

const updateTeamMembers = (teamIndex: number, newMembers: string[]) => {
  if (teams.value[teamIndex]) {
    if (newMembers.length > 10) {
      emit('error', 'Maximum 10 members per team allowed');
      return;
    }
    teams.value[teamIndex].members = newMembers;
    emit('update:teams', teams.value);
  }
};

watch(() => props.initialTeams, (newTeams) => {
  teams.value = JSON.parse(JSON.stringify(newTeams || [])); 
}, { immediate: true, deep: true });

</script>

<style scoped>
/* Your existing styles */
</style>