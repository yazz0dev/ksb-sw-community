<template>
  <div class="d-flex align-items-center justify-content-center py-5" style="min-height: calc(100vh - 120px);">
    <div class="container container-sm">
      <div class="text-center mb-5">
        <h2 class="h2 fw-bold text-primary">Login to your account</h2>
      </div>

      <div class="card shadow-sm border-0" style="max-width: 450px; margin: 0 auto; background-color: var(--bs-tertiary-bg);">
        <div class="card-body p-4 p-md-5">
          <div v-if="errorMessage" class="alert alert-danger small p-2 text-center" role="alert">
            {{ errorMessage }}
          </div>

          <form @submit.prevent="signIn">
            <div class="mb-3">
              <label for="email" class="form-label small">Email address</label>
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

            <div class="mb-3">
               <div class="d-flex justify-content-between align-items-center mb-1">
                  <label for="password" class="form-label small mb-0">Password</label>
                  <router-link
                    to="/forgot-password"
                    class="small text-primary text-decoration-none"
                  >
                    Forgot password?
                  </router-link>
               </div>
               <div class="input-group">
                  <span class="input-group-text"><i class="fas fa-lock"></i></span>
                  <input
                    id="password"
                    class="form-control"
                    type="password"
                    v-model="password"
                    placeholder="••••••••"
                    required
                    :disabled="isLoading"
                  />
               </div>
            </div>

            <div class="d-grid mt-4">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isLoading"
              >
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                {{ isLoading ? 'Signing In...' : 'Sign in' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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
        const role = store.getters['user/userRole'];
        if (role === 'Admin') {
            router.replace({ name: 'ManageRequests' });
        } else {
            router.replace({ name: 'Home' });
        }
        console.log(`Navigation to ${role === 'Admin' ? '/manage-requests' : '/home'} attempted.`);
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
    const userCredential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    await processLoginSuccess(userCredential.user);
  } catch (error) {
    console.error("Email/Password Sign-In Error:", error);
    switch (error.code) {
      case 'auth/invalid-email':
      case 'auth/missing-email':
        errorMessage.value = 'Please enter a valid email address.';
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
        errorMessage.value = 'Login failed. Please check your credentials and try again.';
    }
  } finally {
      isLoading.value = false;
  }
};
</script>

<style scoped>
/* Removed Bulma box shadow style */
</style>
