<template>
  <div class="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <!-- Dynamically change title based on view state -->
      <h2 class="mt-6 text-center text-2xl font-bold text-text-primary">
        {{ viewState === 'reset' ? 'Reset Your Password' : 'Forgot Your Password?' }}
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-surface py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <!-- Show different text based on view state -->
        <p v-if="viewState === 'request'" class="text-sm text-center text-text-secondary mb-6">
          Enter your email address and we will send you a link to reset your password.
        </p>
        <p v-if="viewState === 'reset'" class="text-sm text-center text-text-secondary mb-6">
          Enter your new password below.
        </p>
         <p v-if="viewState === 'success'" class="text-sm text-center text-text-secondary mb-6">
           Your password has been successfully reset.
         </p>

        <!-- Success/Error Message -->
        <div v-if="message"
             :class="[
               'mb-4 rounded-md p-4 border',
               isError ? 'bg-error-extraLight border-error-light text-error-dark' : 'bg-success-extraLight border-success-light text-success-dark'
             ]"
             role="alert">
            <div class="flex">
              <div class="flex-shrink-0">
                 <!-- Icon (conditional based on error state, example using Heroicons) -->
                 <svg v-if="isError" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                 </svg>
                 <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                 </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium">{{ message }}</p>
              </div>
            </div>
        </div>

        <!-- Request Reset Email Form -->
        <form @submit.prevent="handleSendResetEmail" v-if="viewState === 'request'" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-text-secondary">Email Address</label>
            <div class="mt-1">
              <input
                type="email"
                id="email"
                v-model="email"
                required
                autocomplete="email"
                class="appearance-none block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-text-disabled focus:outline-none focus:ring-primary-light focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
                :disabled="isLoading" />
            </div>
          </div>

          <div>
            <button type="submit"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    :disabled="isLoading">
              <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </div>
        </form>

        <!-- Reset Password Form -->
        <form @submit.prevent="handleResetPassword" v-if="viewState === 'reset'" class="space-y-6">
           <div>
             <label for="newPassword" class="block text-sm font-medium text-text-secondary">New Password</label>
             <div class="mt-1">
               <input
                 type="password"
                 id="newPassword"
                 v-model="newPassword"
                 required
                 minlength="6"
                 class="appearance-none block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-text-disabled focus:outline-none focus:ring-primary-light focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                 placeholder="Enter new password"
                 :disabled="isLoading" />
             </div>
           </div>
           <div>
             <label for="confirmPassword" class="block text-sm font-medium text-text-secondary">Confirm New Password</label>
             <div class="mt-1">
               <input
                 type="password"
                 id="confirmPassword"
                 v-model="confirmPassword"
                 required
                 class="appearance-none block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-text-disabled focus:outline-none focus:ring-primary-light focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                 placeholder="Confirm new password"
                 :disabled="isLoading" />
             </div>
           </div>
           <div>
             <button type="submit"
                     class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     :disabled="isLoading || newPassword !== confirmPassword || newPassword.length < 6">
               <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               {{ isLoading ? 'Resetting...' : 'Reset Password' }}
             </button>
           </div>
         </form>

        <!-- Back to Login Link/Button -->
        <div class="mt-6 text-center">
          <router-link
             v-if="viewState !== 'success'"
             to="/login"
             class="text-sm font-medium text-primary hover:text-primary-dark hover:underline">
            Back to Login
          </router-link>
          <router-link
             v-if="viewState === 'success'"
             to="/login"
             class="w-full inline-flex justify-center py-2 px-4 border border-border rounded-md shadow-sm bg-surface text-sm font-medium text-text-secondary hover:bg-neutral-extraLight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors">
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
