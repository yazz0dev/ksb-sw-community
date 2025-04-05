<template>
  <div class="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8"> <!-- Full height container -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-text-primary">Login to your account</h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-surface py-8 px-4 shadow sm:rounded-lg sm:px-10"> <!-- Card styling -->
        <div v-if="errorMessage" class="mb-4 rounded-md bg-error-light p-4 border border-error-light" role="alert">
           <div class="flex">
            <div class="flex-shrink-0">
              <!-- Heroicon name: solid/x-circle -->
              <svg class="h-5 w-5 text-error" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-error-dark">{{ errorMessage }}</p>
            </div>
          </div>
        </div>

        <form @submit.prevent="signIn" class="space-y-6"> <!-- Form with spacing -->
          <div>
            <label for="email" class="block text-sm font-medium text-text-secondary">Email address</label>
            <div class="mt-1">
              <input
                type="email"
                id="email"
                v-model="email"
                required
                autocomplete="email"
                class="appearance-none block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-text-disabled focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
                :disabled="isLoading" />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-text-secondary">Password</label>
            <div class="mt-1">
              <input
                type="password"
                id="password"
                v-model="password"
                required
                autocomplete="current-password"
                class="appearance-none block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-text-disabled focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your password"
                :disabled="isLoading" />
            </div>
          </div>

          <div class="flex items-center justify-end"> <!-- Forgot password link aligned right -->
            <div class="text-sm">
              <router-link to="/forgot-password" class="font-medium text-primary hover:text-primary-dark hover:underline">Forgot Password?</router-link>
            </div>
          </div>

          <div> <!-- Login Button -->
            <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    :disabled="isLoading">
              <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isLoading ? 'Logging In...' : 'Login' }}
            </button>
          </div>
        </form>


      </div>
    </div>
  </div>
</template>

<script setup> // Using setup script
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useStore } from 'vuex';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false); // Loading state
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
        // Optionally sign the user out if data fetch fails critically
        // signOut(getAuth());
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
    // Error handling logic remains the same
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
      isLoading.value = false; // Stop loading regardless of outcome
  }
};

</script>
