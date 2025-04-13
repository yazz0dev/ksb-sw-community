<template>
  <CFlex minH="full" flexDir="column" justify="center" py="12" px={{ sm: '6', lg: '8' }}>
    <CBox mx="auto" w="full" maxW="md">
      <CHeading textAlign="center" size="xl" fontWeight="extrabold" color="text-primary">
        Login to your account
      </CHeading>
    </CBox>

    <CBox mt="8" mx="auto" w="full" maxW="md">
      <CCard variant="outline" bg="surface" py="8" px={{ base: '4', sm: '10' }}>
        <CAlert v-if="errorMessage" status="error" variant="left-accent" mb="4">
          <CAlertIcon />
          <CBox>
            <CText fontWeight="medium">{{ errorMessage }}</CText>
          </CBox>
        </CAlert>

        <form @submit.prevent="signIn">
          <CStack spacing="6">
            <CFormControl isRequired>
              <CFormLabel htmlFor="email" fontSize="sm">Email address</CFormLabel>
              <CInput
                id="email"
                type="email"
                v-model="email"
                autoComplete="email"
                required
              />
            </CFormControl>

            <CFormControl isRequired>
              <CFlex justify="space-between">
                <CFormLabel htmlFor="password" fontSize="sm">Password</CFormLabel>
                <CLink
                  as="router-link"
                  to="/forgot-password"
                  fontSize="sm"
                  color="primary"
                  _hover={{ textDecoration: 'underline' }}
                >
                  Forgot password?
                </CLink>
              </CFlex>
              <CInput
                id="password"
                type="password"
                v-model="password"
                autoComplete="current-password"
                required
              />
            </CFormControl>

            <CButton
              type="submit"
              colorScheme="primary"
              size="lg"
              fontSize="sm"
              isLoading={isLoading}
            >
              Sign in
            </CButton>
          </CStack>
        </form>
      </CCard>
    </CBox>
  </CFlex>
</template>

<script setup>
import {
  Box as CBox,
  Flex as CFlex,
  Heading as CHeading,
  Card as CCard,
  Stack as CStack,
  FormControl as CFormControl,
  FormLabel as CFormLabel,
  Input as CInput,
  Button as CButton,
  Link as CLink,
  Alert as CAlert,
  AlertIcon as CAlertIcon,
  Text as CText
} from '@chakra-ui/vue-next'

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useStore } from 'vuex';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);
const router = useRouter();
const store = useStore();

const processLoginSuccess = async (user) => {
    console.log("Login successful for:", user.uid);
    try {
        await store.dispatch('user/fetchUserData', user.uid);
        console.log("User data fetch dispatched after login.");
        router.push('/home');
        console.log("Navigation to /home attempted.");
    } catch (fetchError) {
        console.error("Error fetching user data after login:", fetchError);
        errorMessage.value = 'Failed to load user profile. Please try again.';
    }
};

const signIn = async () => {
  errorMessage.value = '';
  isLoading.value = true;
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    await processLoginSuccess(userCredential.user);
  } catch (error) {
    console.error("Email/Password Sign-In Error:", error);
    switch (error.code) {
      case 'auth/invalid-email':
      case 'auth/missing-email':
        errorMessage.value = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage.value = 'This user account has been disabled.';
        break;
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        errorMessage.value = 'Incorrect email or password.';
        break;
      case 'auth/too-many-requests':
         errorMessage.value = 'Too many login attempts. Please try again later or reset your password.';
          break;
      default:
        errorMessage.value =  error.message || 'Login failed. Please try again.';
    }
  } finally {
      isLoading.value = false;
  }
};
</script>
