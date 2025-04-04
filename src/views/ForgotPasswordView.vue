<template>
  <div class="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-2xl font-bold text-gray-900">Forgot your password?</h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <p class="text-sm text-center text-gray-600 mb-6">Enter your email address and we will send you a link to reset your password.</p>

        <!-- Success/Error Message -->
        <div v-if="message" 
             :class="[
               'mb-4 rounded-md p-4 border',
               isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
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

        <!-- Form (shown initially or on error) -->
        <form @submit.prevent="sendPasswordResetEmail" v-if="!message || isError" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
            <div class="mt-1">
              <input
                type="email"
                id="email"
                v-model="email"
                required
                autocomplete="email"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
                :disabled="isLoading" />
            </div>
          </div>

          <div>
            <button type="submit" 
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    :disabled="isLoading">
              <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </div>
        </form>

        <!-- Back to Login Link/Button -->
        <div class="mt-6 text-center">
          <router-link 
             v-if="!message || isError" 
             to="/login" 
             class="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline">
            Back to Login
          </router-link>
          <router-link 
             v-else 
             to="/login" 
             class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            Back to Login
           </router-link> 
        </div>
      </div>
    </div>
  </div>
</template>

<script setup> // Using setup script
import { ref } from 'vue';
import { getAuth, sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth'; // Renamed import

const email = ref('');
const message = ref('');
const isError = ref(false);
const isLoading = ref(false); // Loading state

const sendPasswordResetEmail = async () => { // Renamed handler function
  message.value = '';
  isError.value = false;
  isLoading.value = true;
  try {
      const auth = getAuth();
      await firebaseSendPasswordResetEmail(auth, email.value);
      message.value = 'Password reset email sent. Check your inbox (and spam folder).';
      isError.value = false; // Explicitly set success state
  } catch (error) {
      console.error("Password Reset Error:", error);
      isError.value = true;
       switch (error.code) {
          case 'auth/invalid-email':
          case 'auth/missing-email':
              message.value = 'Please enter a valid email address.';
              break;
          case 'auth/user-not-found':
              message.value = 'No user found with this email address.';
              break;
          case 'auth/too-many-requests':
              message.value = 'Too many requests. Please try again later.';
              break;
          default:
              message.value = error.message || 'Password reset failed. Please try again.';
      }
  } finally {
      isLoading.value = false;
  }
};

</script>

<!-- <style scoped>
/* Removed style targeting .login-card */
</style> -->
