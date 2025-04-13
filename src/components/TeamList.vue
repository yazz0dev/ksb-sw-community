<template>
  <CBox p={{ base: '4', sm: '6' }}>
    <TransitionGroup name="fade-fast" tag="div">
      <CBox 
        v-for="team in teamsWithDetails"
        :key="team.teamName"
        mb="4"
      >
        <CCard variant="outline" shadow="sm" _hover={{ shadow: 'md' }} transition="box-shadow 0.2s">
          <CCardBody p={{ base: '4', sm: '5' }}>
            <CFlex justify="space-between" align="start" mb="3">
              <CHeading size="md" color="primary">{{ team.teamName }}</CHeading>
            </CFlex>

            <CButton
              leftIcon={<CIcon name={team.showDetails ? 'fa-chevron-up' : 'fa-chevron-down'} />}
              size="sm"
              variant="outline"
              onClick={() => toggleTeamDetails(team.teamName)}
            >
              {{ team.showDetails ? 'Hide Members' : `Show Members (${team.members?.length || 0})` }}
            </CButton>

            <CCollapse in={team.showDetails}>
              <CBox mt="4" pt="4" borderTopWidth="1px">
                <CText v-if="organizerNamesLoading" fontSize="sm" color="text-secondary" fontStyle="italic">
                  <CIcon name="fa-spinner" spin mr="1" /> Loading members...
                </CText>

                <CBox v-else-if="team.members && team.members.length > 0">
                  <CText fontSize="xs" fontWeight="semibold" color="text-secondary" textTransform="uppercase" mb="2">
                    Team Members
                  </CText>
                  <CStack spacing="2">
                    <CFlex
                      v-for="memberId in team.members"
                      :key="memberId"
                      align="center"
                      p="2"
                      borderRadius="md"
                      transition="colors 0.15s"
                      :bg="memberId === currentUserUid ? 'secondary-light' : 'transparent'"
                      :fontWeight="memberId === currentUserUid ? 'medium' : 'normal'"
                    >
                      <CIcon name="fa-user" color="text-secondary" mr="2" w="4" textAlign="center" />
                      <CLink
                        as="router-link"
                        :to="{ name: 'PublicProfile', params: { userId: memberId } }"
                        fontSize="sm"
                        color="text-primary"
                        _hover={{ color: 'primary' }}
                        isTruncated
                        :fontWeight="memberId === currentUserUid ? 'semibold' : 'normal'"
                      >
                        {{ getUserName(memberId) || memberId }} {{ memberId === currentUserUid ? '(You)' : '' }}
                      </CLink>
                    </CFlex>
                  </CStack>
                </CBox>

                <CText v-else fontSize="sm" color="text-secondary" fontStyle="italic">
                  No members assigned to this team yet.
                </CText>
              </CBox>
            </CCollapse>
          </CCardBody>
        </CCard>
      </CBox>
    </TransitionGroup>

    <CAlert v-if="teamsWithDetails.length === 0" status="info" variant="subtle" mt="4">
      <CAlertIcon name="fa-info-circle" />
      <CAlertDescription>No teams have been created for this event yet.</CAlertDescription>
    </CAlert>
  </CBox>
</template>

<script setup>
import {
  Box as CBox,
  Card as CCard,
  CardBody as CCardBody,
  Button as CButton,
  Stack as CStack,
  Text as CText,
  Link as CLink,
  Flex as CFlex,
  Icon as CIcon,
  Heading as CHeading,
  Collapse as CCollapse,
  Alert as CAlert,
  AlertIcon as CAlertIcon,
  AlertDescription as CAlertDescription
} from '@chakra-ui/vue-next'

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const props = defineProps({
    teams: { 
        type: Array, 
        required: true, 
        default: () => [] 
    },
    eventId: { 
        type: String, 
        required: true 
    },
    ratingsOpen: { 
        type: Boolean, 
        default: false 
    },
    getUserName: { 
        type: Function, 
        required: true 
    },
    organizerNamesLoading: { 
        type: Boolean, 
        default: false 
    },
    currentUserUid: { 
        type: String, 
        default: null 
    }
});

const store = useStore();
const router = useRouter();
const canRate = computed(() => {
    const userRole = store.getters['user/getUserRole'];
    return store.getters['user/isAuthenticated'] && userRole !== 'Admin';
});

const teamsWithDetails = ref([]);
const searchQueries = ref({});
const dropdownVisible = ref({});

let unwatchTeams = null;

onMounted(() => {
    updateLocalTeams(props.teams);
    unwatchTeams = watch(() => props.teams, (newTeams) => {
        updateLocalTeams(newTeams);
    }, { deep: true });
});

onBeforeUnmount(() => {
    if (unwatchTeams) {
        unwatchTeams();
    }
});

function updateLocalTeams(teamsFromProps) {
    if (!Array.isArray(teamsFromProps)) return;
    
    teamsWithDetails.value = teamsFromProps.map(team => ({
        ...team,
        showDetails: false,
        members: Array.isArray(team.members) ? [...team.members] : [],
        ratings: Array.isArray(team.ratings) ? [...team.ratings] : [],
        submissions: Array.isArray(team.submissions) ? [...team.submissions] : []
    }));
}

const toggleTeamDetails = (teamName) => {
    const teamIndex = teamsWithDetails.value.findIndex(t => t.teamName === teamName);
    if (teamIndex !== -1) {
        teamsWithDetails.value[teamIndex].showDetails = !teamsWithDetails.value[teamIndex].showDetails;
    } else {
        console.warn(`Could not find team ${teamName} to toggle details.`);
    }
};

defineEmits(['update:teams', 'canAddTeam']);

</script>

<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
    transition: all 0.2s ease-out;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

.fade-fast-move {
    transition: transform 0.3s ease-out;
}
</style>
