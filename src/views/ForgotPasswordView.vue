<template>
  <CFlex minH="full" flexDir="column" justify="center" py="12" px={{ sm: '6', lg: '8' }}>
    <CBox mx="auto" w="full" maxW="md">
      <CHeading mt="6" textAlign="center" size="xl" fontWeight="extrabold" color="text-primary">
        {{ viewState === 'reset' ? 'Reset Your Password' : 'Forgot Your Password?' }}
      </CHeading>
    </CBox>

    <CBox mt="8" mx="auto" w="full" maxW="md">
      <CCard variant="outline" bg="surface" py="8" px={{ base: '4', sm: '10' }} shadow="sm">
        <CText v-if="viewState === 'request'" fontSize="sm" textAlign="center" color="text-secondary" mb="6">
          Enter your email address and we will send you a link to reset your password.
        </CText>
        <CText v-if="viewState === 'reset'" fontSize="sm" textAlign="center" color="text-secondary" mb="6">
          Enter your new password below.
        </CText>
        <CText v-if="viewState === 'success'" fontSize="sm" textAlign="center" color="text-secondary" mb="6">
          Your password has been successfully reset.
        </CText>

        <CAlert v-if="message" status={isError ? 'error' : 'success'} variant="left-accent" mb="4">
          <CAlertIcon />
          <CAlertDescription>{{ message }}</CAlertDescription>
        </CAlert>

        <form @submit.prevent="handleSendResetEmail" v-if="viewState === 'request'">
          <CStack spacing="6">
            <CFormControl isRequired>
              <CFormLabel htmlFor="email" fontSize="sm">Email Address</CFormLabel>
              <CInput
                id="email"
                type="email"
                v-model="email"
                placeholder="you@example.com"
                :isDisabled="isLoading"
              />
            </CFormControl>

            <CButton
              type="submit"
              colorScheme="primary"
              w="full"
              :isLoading="isLoading"
              loadingText="Sending..."
            >
              Send Reset Link
            </CButton>
          </CStack>
        </form>

        <form @submit.prevent="handleResetPassword" v-if="viewState === 'reset'">
          <CStack spacing="6">
            <CFormControl isRequired>
              <CFormLabel htmlFor="newPassword" fontSize="sm">New Password</CFormLabel>
              <CInput
                id="newPassword"
                type="password"
                v-model="newPassword"
                placeholder="Enter new password"
                :isDisabled="isLoading"
                minLength="6"
              />
            </CFormControl>

            <CFormControl isRequired>
              <CFormLabel htmlFor="confirmPassword" fontSize="sm">Confirm Password</CFormLabel>
              <CInput
                id="confirmPassword"
                type="password"
                v-model="confirmPassword"
                placeholder="Confirm new password"
                :isDisabled="isLoading"
              />
            </CFormControl>

            <CButton
              type="submit"
              colorScheme="primary"
              w="full"
              :isLoading="isLoading"
              loadingText="Resetting..."
              :isDisabled="newPassword !== confirmPassword || newPassword.length < 6"
            >
              Reset Password
            </CButton>
          </CStack>
        </form>

        <CBox mt="6" textAlign="center">
          <CLink
            v-if="viewState !== 'success'"
            as="router-link"
            to="/login"
            color="primary"
            fontWeight="medium"
            fontSize="sm"
            _hover={{ textDecoration: 'underline' }}
          >
            Back to Login
          </CLink>
          <CButton
            v-else
            as="router-link"
            to="/login"
            variant="outline"
            w="full"
          >
            Proceed to Login
          </CButton>
        </CBox>
      </CCard>
    </CBox>
  </CFlex>
</template>

<script setup>
import {
  Box as CBox,
  Flex as CFlex,
  Heading as CHeading,
  Text as CText,
  Button as CButton,
  Stack as CStack,
  Card as CCard,
  FormControl as CFormControl,
  FormLabel as CFormLabel,
  Input as CInput,
  Link as CLink,
  Alert as CAlert,
  AlertIcon as CAlertIcon,
  AlertDescription as CAlertDescription
} from '@chakra-ui/vue-next'

import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getAuth,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'firebase/auth';

const route = useRoute();
const router = useRouter();
const auth = getAuth();

const email = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const message = ref('');
const isError = ref(false);
const isLoading = ref(false);
const viewState = ref('request'); // 'request', 'reset', 'success', 'error'
const oobCode = ref(null); // Store the out-of-band code

// --- Check URL parameters on mount ---
onMounted(async () => {
  const mode = route.query.mode;
  oobCode.value = route.query.oobCode;

  if (mode === 'resetPassword' && oobCode.value) {
    isLoading.value = true;
    message.value = 'Verifying reset link...';
    isError.value = false;
    try {
      // Verify the password reset code.
      await verifyPasswordResetCode(auth, oobCode.value);
      // Code is valid, show the reset password form.
      viewState.value = 'reset';
      message.value = ''; // Clear verification message
    } catch (error) {
      console.error("Verify Password Reset Code Error:", error);
      message.value = 'Invalid or expired password reset link. Please request a new one.';
      isError.value = true;
      viewState.value = 'error'; // Or back to 'request' maybe?
      // Optionally redirect or clear the invalid query params
      router.replace({ query: {} });
    } finally {
      isLoading.value = false;
    }
  } else {
    // Default state: show the request form
    viewState.value = 'request';
  }
});

// --- Handler for Sending Reset Email ---
const handleSendResetEmail = async () => {
  message.value = '';
  isError.value = false;
  isLoading.value = true;

  const actionCodeSettings = {
    // Update URL to point back to this component/route
    url: 'https://ksbtech.web.app/forgot-password',
    handleCodeInApp: false
  };

  try {
    await firebaseSendPasswordResetEmail(auth, email.value, actionCodeSettings);
    message.value = 'Password reset email sent. Check your inbox (and spam folder).';
    isError.value = false;
    // Keep viewState as 'request', but show success message
  } catch (error) {
    console.error("Send Password Reset Email Error:", error);
    isError.value = true;
    switch (error.code) {
      case 'auth/invalid-email':
      case 'auth/missing-email':
        message.value = 'Please enter a valid email address.';
        break;
      case 'auth/user-not-found':
        // Avoid confirming if user exists for security, show generic message
        message.value = 'If an account exists for this email, a reset link has been sent.';
        isError.value = false; // Treat as success to prevent user enumeration
        break;
      case 'auth/too-many-requests':
        message.value = 'Too many requests. Please try again later.';
        break;
      default:
        message.value = 'Failed to send reset email. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
};

// --- Handler for Resetting the Password ---
const handleResetPassword = async () => {
  message.value = '';
  isError.value = false;

  if (newPassword.value !== confirmPassword.value) {
    message.value = 'Passwords do not match.';
    isError.value = true;
    return;
  }
  if (newPassword.value.length < 6) {
      message.value = 'Password must be at least 6 characters long.';
      isError.value = true;
      return;
  }
  if (!oobCode.value) {
      message.value = 'Missing reset code. Please use the link from your email again.';
      isError.value = true;
      viewState.value = 'error';
      return;
  }

  isLoading.value = true;
  try {
    // Confirm the password reset.
    await confirmPasswordReset(auth, oobCode.value, newPassword.value);
    message.value = 'Password has been reset successfully!';
    isError.value = false;
    viewState.value = 'success';
    // Clear sensitive fields
    newPassword.value = '';
    confirmPassword.value = '';
    oobCode.value = null; // Clear the code after use
    // Optionally redirect after a delay
    // setTimeout(() => router.push('/login'), 3000);
  } catch (error) {
    console.error("Confirm Password Reset Error:", error);
    isError.value = true;
    switch (error.code) {
        case 'auth/expired-action-code':
            message.value = 'The password reset link has expired. Please request a new one.';
            viewState.value = 'error'; // Or 'request'
            break;
        case 'auth/invalid-action-code':
            message.value = 'The password reset link is invalid. Please request a new one.';
            viewState.value = 'error'; // Or 'request'
            break;
        case 'auth/user-disabled':
            message.value = 'Your account has been disabled.';
            viewState.value = 'error';
            break;
        case 'auth/user-not-found': // Should ideally not happen if verify worked, but handle defensively
            message.value = 'User not found.';
             viewState.value = 'error';
            break;
        case 'auth/weak-password':
            message.value = 'Password is too weak. Please choose a stronger password.';
            // Keep viewState as 'reset' to allow retry
            break;
        default:
            message.value = 'Failed to reset password. Please try again.';
            viewState.value = 'error';
    }
     // Clear invalid code if error occurs during reset confirmation
     if (error.code === 'auth/expired-action-code' || error.code === 'auth/invalid-action-code') {
         oobCode.value = null;
         router.replace({ query: {} }); // Clear query params
     }
  } finally {
    isLoading.value = false;
  }
};
</script>
