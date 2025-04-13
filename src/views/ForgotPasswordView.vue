<template>
  <div class="section is-flex is-flex-direction-column is-align-items-center is-justify-content-center" style="min-height: 80vh;">
    <div class="container is-max-desktop">
      <div class="has-text-centered mb-5">
        <h1 class="title is-2 has-text-primary">
          {{ viewState === 'reset' ? 'Reset Your Password' : 'Forgot Your Password?' }}
        </h1>
      </div>

      <div class="box" style="background-color: var(--color-surface); border: 1px solid var(--color-border); max-width: 450px; margin: 0 auto;">
        <p v-if="viewState === 'request'" class="is-size-7 has-text-centered has-text-grey mb-5">
          Enter your email address and we will send you a link to reset your password.
        </p>
        <p v-if="viewState === 'reset'" class="is-size-7 has-text-centered has-text-grey mb-5">
          Enter your new password below.
        </p>
        <p v-if="viewState === 'success'" class="is-size-7 has-text-centered has-text-grey mb-5">
          Your password has been successfully reset.
        </p>

        <div v-if="message" class="message is-small mb-4" :class="isError ? 'is-danger' : 'is-success'">
          <div class="message-body">
            {{ message }}
          </div>
        </div>

        <!-- Request Reset Form -->
        <form @submit.prevent="handleSendResetEmail" v-if="viewState === 'request'">
          <div class="field">
            <label for="email" class="label is-small">Email Address</label>
            <div class="control has-icons-left">
              <input
                id="email"
                class="input"
                type="email"
                v-model="email"
                placeholder="you@example.com"
                required
                :disabled="isLoading"
              />
              <span class="icon is-small is-left"><i class="fas fa-envelope"></i></span>
            </div>
          </div>

          <div class="field mt-5">
            <button
              type="submit"
              class="button is-primary is-fullwidth"
              :class="{ 'is-loading': isLoading }"
              :disabled="isLoading"
            >
              Send Reset Link
            </button>
          </div>
        </form>

        <!-- Reset Password Form -->
        <form @submit.prevent="handleResetPassword" v-if="viewState === 'reset'">
          <div class="field">
            <label for="newPassword" class="label is-small">New Password</label>
            <div class="control has-icons-left">
              <input
                id="newPassword"
                class="input"
                type="password"
                v-model="newPassword"
                placeholder="Enter new password (min. 6 characters)"
                required
                :disabled="isLoading"
                minlength="6"
              />
               <span class="icon is-small is-left"><i class="fas fa-lock"></i></span>
            </div>
             <p v-if="newPassword.length > 0 && newPassword.length < 6" class="help is-danger is-size-7">Password must be at least 6 characters.</p>
          </div>

          <div class="field">
            <label for="confirmPassword" class="label is-small">Confirm Password</label>
            <div class="control has-icons-left">
              <input
                id="confirmPassword"
                class="input"
                type="password"
                v-model="confirmPassword"
                placeholder="Confirm new password"
                required
                :disabled="isLoading"
              />
               <span class="icon is-small is-left"><i class="fas fa-lock"></i></span>
            </div>
             <p v-if="confirmPassword.length > 0 && newPassword !== confirmPassword" class="help is-danger is-size-7">Passwords do not match.</p>
          </div>

          <div class="field mt-5">
            <button
              type="submit"
              class="button is-primary is-fullwidth"
              :class="{ 'is-loading': isLoading }"
              :disabled="isLoading || newPassword !== confirmPassword || newPassword.length < 6"
            >
              Reset Password
            </button>
          </div>
        </form>

        <!-- Back/Proceed Link -->
        <div class="mt-5 has-text-centered">
          <router-link
            v-if="viewState !== 'success'"
            to="/login"
            class="button is-text is-small"
          >
             <span class="icon is-small"><i class="fas fa-arrow-left"></i></span>
             <span>Back to Login</span>
          </router-link>
          <router-link
            v-else
            to="/login"
            class="button is-primary is-outlined is-fullwidth"
          >
            Proceed to Login
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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
      viewState.value = 'error'; // Show error state
      // Optionally redirect or clear the invalid query params after a delay
      setTimeout(() => {
          if (viewState.value === 'error') { // Only redirect if still in error state
             router.replace({ query: {} });
             viewState.value = 'request'; // Go back to request form
             message.value = ''; // Clear error message
          }
      }, 4000);
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
    url: window.location.origin + '/forgot-password', // Use current origin
    handleCodeInApp: false // Let Firebase handle the link
  };

  try {
    await firebaseSendPasswordResetEmail(auth, email.value.trim(), actionCodeSettings);
    message.value = 'Password reset email sent. Check your inbox (and spam folder).';
    isError.value = false;
    // Keep viewState as 'request', show success message
    // Clear email field after successful request?
    // email.value = ''; 
  } catch (error) {
    console.error("Send Password Reset Email Error:", error);
    isError.value = true;
    switch (error.code) {
      case 'auth/invalid-email':
      case 'auth/missing-email':
        message.value = 'Please enter a valid email address.';
        break;
      case 'auth/user-not-found':
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

  // Basic client-side validation (already handled by button disable usually)
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
    router.replace({ query: {} }); // Clear query params from URL
    // No automatic redirect, let user click the button
  } catch (error) {
    console.error("Confirm Password Reset Error:", error);
    isError.value = true;
    switch (error.code) {
        case 'auth/expired-action-code':
            message.value = 'The password reset link has expired. Please request a new one.';
            viewState.value = 'error';
            break;
        case 'auth/invalid-action-code':
            message.value = 'The password reset link is invalid. Please request a new one.';
            viewState.value = 'error';
            break;
        case 'auth/user-disabled':
            message.value = 'Your account has been disabled.';
            viewState.value = 'error';
            break;
        case 'auth/user-not-found': 
            message.value = 'User not found. The account may have been deleted.';
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
         viewState.value = 'request'; // Send back to request form on code error
     }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.box {
    box-shadow: 0 4px 10px rgba(10, 10, 10, 0.1);
}
</style>
