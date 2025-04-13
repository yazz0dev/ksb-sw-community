<template>
  <CBox 
    maxW="4xl" 
    mx="auto" 
    textAlign="center" 
    py="12" 
    :px="{ base: '4', sm: '6', lg: '8' }"
  >
    <CHeading as="h1" size="2xl" color="text-primary" mb="4">
      Welcome to the KSB Tech Community!
    </CHeading>
    <CText fontSize="lg" color="text-secondary" mb="6" maxW="2xl" mx="auto">
      Manage events, collaborate on projects, and share resources within the KSB MCA community.
    </CText>
    <CText color="text-secondary" mb="8">
      Please 
      <CLink 
        as="router-link"
        to="/login"
        fontWeight="semibold"
        color="primary"
        _hover={{ color: 'primary-dark', textDecoration: 'underline' }}
      >
        log in
      </CLink>
      to access the platform.
    </CText>

    <CBox maxW="xl" mx="auto" mb="8">
      <CCard variant="outline" shadow="md">
        <CCardHeader bg="surface-variant" borderBottomWidth="1px" borderColor="border">
          <CHeading size="md" color="text-primary">Platform Features</CHeading>
        </CCardHeader>
        <CList :divider="h(CDivider)">
          <!-- Feature items -->
          <CListItem 
            v-for="(feature, index) in features" 
            :key="index"
            p="4"
            d="flex"
            alignItems="center"
          >
            <CIcon :name="feature.icon" :color="feature.color" mr="3" />
            <CText fontSize="sm" color="text-secondary">{{ feature.text }}</CText>
          </CListItem>
        </CList>
      </CCard>
    </CBox>

    <CText mt="10" fontSize="sm" color="text-disabled">
      This site is managed by the MCA department of KMCT School Of Business.
    </CText>
  </CBox>
</template>

<script setup>
import { defineComponent, ref, h } from 'vue'
import {
  Box as CBox,
  Heading as CHeading,
  Text as CText,
  Link as CLink,
  Card as CCard,
  CardHeader as CCardHeader,
  List as CList,
  ListItem as CListItem,
  Icon as CIcon,
  Divider as CDivider
} from '@chakra-ui/vue-next'

const features = [
  { icon: 'fa-calendar-alt', color: 'primary', text: 'View upcoming and past events.' },
  { icon: 'fa-plus-circle', color: 'info', text: 'Request new events.' },
  { icon: 'fa-users', color: 'neutral', text: 'Participate in team-based events.' },
  { icon: 'fa-star', color: 'warning', text: 'Rate projects and provide feedback.' },
  { icon: 'fa-book', color: 'success', text: 'Access a library of shared resources.' },
  { icon: 'fa-trophy', color: 'primary', text: 'View leaderboards based on XP.' },
  { icon: 'fa-file-pdf', color: 'error', text: 'Generate a portfolio of your achievements.' }
]
</script>
