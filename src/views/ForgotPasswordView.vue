<template>
  <div class="d-flex align-items-center justify-content-center py-5 forgot-password-bg">
    <div class="container container-sm">
      <div class="text-center mb-5">
        <h2 class="h2 fw-bold text-gradient-primary">
          {{ viewState === 'reset' ? 'Reset Your Password' : 'Forgot Your Password?' }}
        </h2>
      </div>

      <div class="card shadow-sm border-0" style="max-width: 450px; margin: 0 auto;">
         <div class="card-body p-4 p-md-5">
            <p v-if="viewState === 'request'" class="text-subtitle text-center mb-4">
              Enter your email address and we will send you a link to reset your password.
            </p>
            <p v-if="viewState === 'reset'" class="text-subtitle text-center mb-4">
              Enter your new password below.
            </p>
            <p v-if="viewState === 'success'" class="text-subtitle text-center mb-4">
              Your password has been successfully reset.
            </p>

            <div v-if="message" class="alert alert-sm mb-4 text-center" :class="isError ? 'alert-danger' : 'alert-success'" role="alert">
              {{ message }}
            </div>

            <!-- Request Reset Form -->
            <form @submit.prevent="handleSendResetEmail" v-if="viewState === 'request'">
              <div class="mb-3">
                <label for="email" class="form-label">Email Address</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="fas fa-envelope"></i></span>
                  <input
                    id="email"
                    class="form-control"
                    type="email"
                    v-model="email"
                    placeholder="you@example.com"
                    required
                    :disabled="isLoading"
                  />
                </div>
              </div>

              <div class="mt-4">
                <button
                  type="submit"
                  class="btn btn-primary w-100"
                  :class="{ 'btn-loading': isLoading }"
                  :disabled="isLoading"
                >
                  <span class="btn-text">{{ isLoading ? 'Sending...' : 'Send Reset Link' }}</span>
                </button>
              </div>
            </form>

            <!-- Reset Password Form -->
            <form @submit.prevent="handleResetPassword" v-if="viewState === 'reset'">
              <div class="mb-3">
                <label for="newPassword" class="form-label">New Password</label>
                <div class="input-group has-validation">
                   <span class="input-group-text"><i class="fas fa-lock"></i></span>
                  <input
                    id="newPassword"
                    class="form-control"
                    :class="{ 'is-invalid': newPassword.length > 0 && newPassword.length < 6 }"
                    type="password"
                    v-model="newPassword"
                    placeholder="Enter new password (min. 6 characters)"
                    required
                    :disabled="isLoading"
                    minlength="6"
                  />
                  <div class="invalid-feedback">
                      Password must be at least 6 characters.
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label for="confirmPassword" class="form-label">Confirm Password</label>
                 <div class="input-group has-validation">
                    <span class="input-group-text"><i class="fas fa-lock"></i></span>
                    <input
                      id="confirmPassword"
                      class="form-control"
                      :class="{ 'is-invalid': confirmPassword.length > 0 && newPassword !== confirmPassword }"
                      type="password"
                      v-model="confirmPassword"
                      placeholder="Confirm new password"
                      required
                      :disabled="isLoading"
                    />
                    <div class="invalid-feedback">
                      Passwords do not match.
                    </div>
                </div>
              </div>

              <div class="mt-4">
                <button
                  type="submit"
                  class="btn btn-primary w-100"
                  :class="{ 'btn-loading': isLoading }"
                  :disabled="isLoading || newPassword !== confirmPassword || newPassword.length < 6"
                >
                  <span class="btn-text">{{ isLoading ? 'Resetting...' : 'Reset Password' }}</span>
                </button>
              </div>
            </form>

            <!-- Back/Proceed Link -->
            <div class="mt-4 text-center">
              <router-link
                v-if="viewState !== 'success'"
                to="/login"
                class="btn btn-link btn-sm text-secondary text-decoration-none btn-icon"
              >
                 <i class="fas fa-arrow-left me-1"></i>
                 <span>Back to Login</span>
              </router-link>
              <router-link
                v-else
                to="/login"
                class="btn btn-outline-primary w-100"
              >
                Proceed to Login
              </router-link>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type AuthError
} from 'firebase/auth';
import { auth } from '@/firebase';

const route = useRoute();
const router = useRouter();
// Using centralized auth instance from firebase.ts

const email = ref<string>('');
const newPassword = ref<string>('');
const confirmPassword = ref<string>('');
const message = ref<string>('');
const isError = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const viewState = ref<'request' | 'reset' | 'success' | 'error'>('request');
const oobCode = ref<string | null>(null);

// --- Check URL parameters on mount ---
onMounted(() => {
  // Extract mode and oobCode from query parameters
  const queryMode = route.query.mode;
  const queryOobCode = route.query.oobCode;

  const mode = ref<string | null>(null);
  mode.value = typeof queryMode === 'string' ? queryMode : null;
  oobCode.value = typeof queryOobCode === 'string' ? queryOobCode : null; // Take only string value

  const verifyResetCode = async () => {
    if (mode.value === 'resetPassword' && oobCode.value) {
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
  };

  verifyResetCode();
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
    switch ((error as AuthError).code) {
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
    await confirmPasswordReset(auth, oobCode.value, newPassword.value);
    message.value = 'Password reset successfully!';
    isError.value = false;
    viewState.value = 'success';
  } catch (error) {
    console.error("Confirm Password Reset Error:", error);
    message.value = 'Failed to reset password. The link may be invalid or expired.';
    isError.value = true;
    viewState.value = 'error';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.forgot-password-bg {
  min-height: 100vh;
  background-color: var(--bs-light);
}
</style>

