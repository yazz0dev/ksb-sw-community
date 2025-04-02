<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-5">
        <div class="card login-card shadow"> 
          <div class="card-header">
            <h2 class="mb-0">Login</h2> 
          </div>
          <div class="card-body">
            <div v-if="errorMessage" class="alert alert-danger" role="alert">
              {{ errorMessage }}
            </div>

            <form @submit.prevent="signIn"> 
              <div class="mb-4"> 
                <label for="email" class="form-label">Email:</label>
                <input
                  type="email"
                  id="email"
                  v-model="email"
                  required
                  class="form-control"
                  placeholder="Enter your email"
                  :disabled="isLoading" />
              </div>
              <div class="mb-4">  
                <label for="password" class="form-label">Password:</label>
                <input
                  type="password"
                  id="password"
                  v-model="password"
                  required
                  class="form-control"
                  placeholder="Enter your password"
                  :disabled="isLoading" /> 
              </div>
              <button type="submit" class="btn btn-primary w-100 mt-4" :disabled="isLoading">
                 <span v-if="isLoading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                 {{ isLoading ? 'Logging In...' : 'Login' }}
                </button>
            </form>
             <div class="mt-4 text-center"> 
              <router-link to="/forgot-password" class="small">Forgot Password?</router-link> 
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup> // Using setup script
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useStore } from 'vuex';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false); // Loading state
const router = useRouter();
const store = useStore();

const signIn = async () => {
  errorMessage.value = '';
  isLoading.value = true; // Start loading
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    console.log("Firebase sign-in successful for:", userCredential.user.uid);

    // Fetch user data - This action now sets hasFetched internally
    await store.dispatch('user/fetchUserData', userCredential.user.uid);
    console.log("User data fetch dispatched.");

    // The router guard (`beforeEach` in router/index.js) now waits for `hasFetchedUserData`
    // before allowing navigation. We can reliably push to '/home' here.
    console.log("Navigating to /home...");
    router.push('/home');

  } catch (error) {
    console.error("Login Error:", error);
    isLoading.value = false; // Stop loading on error
    switch (error.code) {
      case 'auth/invalid-email':
      case 'auth/missing-email': // Added case
        errorMessage.value = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage.value = 'This user account has been disabled.';
        break;
      case 'auth/user-not-found':
      case 'auth/invalid-credential': // More common error code now
        errorMessage.value = 'Incorrect email or password.'; // Combined message
        break;
      // case 'auth/wrong-password': // Often replaced by invalid-credential
      //   errorMessage.value = 'Incorrect password.';
      //   break;
      case 'auth/too-many-requests':
         errorMessage.value = 'Too many login attempts. Please try again later or reset your password.';
          break;
      default:
        errorMessage.value =  error.message || 'Login failed. Please try again.';
    }
  }
  // No finally block needed here, redirect happens on success path
};
</script>

<style scoped>
/* Removed custom space-y-4 style, using Bootstrap mb-4 utility now */
</style>
