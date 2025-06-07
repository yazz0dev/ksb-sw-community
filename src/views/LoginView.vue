<template>
  <div class="login-bg d-flex align-items-center justify-content-center overflow-hidden">
    <div class="container container-sm px-3 px-md-4">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-6">
          <transition name="fade-pop">
            <div class="card login-card shadow-lg border-0 animate-pop">
              <div class="card-body p-3 p-md-5">
                <div class="text-center mb-3 mb-md-4">
                  <div class="login-icon mb-2">
                    <i class="fas fa-user-circle fa-3x text-primary"></i>
                  </div>
                  <h2 class="h3 fw-bold gradient-text mb-1">Sign In</h2>
                  <p class="text-subtitle mb-0">Access your KSB Tech Community account</p>
                </div>
                <div v-if="errorMessage" class="alert alert-danger small p-2 text-center" role="alert">
                  {{ errorMessage }}
                </div>
                <form @submit.prevent="signIn" autocomplete="on">
                  <div class="mb-3">
                    <label for="email" class="form-label">Email address</label>
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
                        autocomplete="username"
                      />
                    </div>
                  </div>
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label for="password" class="form-label mb-0">Password</label>
                      <router-link
                        to="/forgot-password"
                        class="small text-primary text-decoration-underline-hover"
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
                        autocomplete="current-password"
                      />
                    </div>
                  </div>
                  <div class="mt-4">
                    <button
                      type="submit"
                      class="btn btn-primary btn-lg w-100"
                      :class="{ 'btn-loading': isLoading }"
                      :disabled="isLoading"
                    >
                      <span class="btn-text">{{ isLoading ? 'Signing In...' : 'Sign In' }}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { type UserCredential } from 'firebase/auth';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { signInWithEmail } from '@/services/authService'; // Import from authService

const email = ref<string>('');
const password = ref<string>('');
const errorMessage = ref<string>('');
const isLoading = ref<boolean>(false);
const router = useRouter();
const route = useRoute();
const studentStore = useProfileStore();
const appStore = useAppStore();

const processLoginSuccess = async (_user: UserCredential['user']): Promise<void> => {
    try {
        // Get redirect path from appStore, fallback to query param, then to /home
        const redirectPath = appStore.getRedirectAfterLogin() || 
                           (route.query.redirect as string) || 
                           '/home';
        
        // Use router navigation instead of window.location
        await router.replace(redirectPath);
        
    } catch (fetchError) {
        errorMessage.value = 'Login successful, but failed to load profile. Please try refreshing.';
        
        // Fallback navigation
        await router.replace('/home');
    } finally {
        // Reset processing login flag
        appStore.setIsProcessingLogin(false);
    }
};

const signIn = async (): Promise<void> => {
    errorMessage.value = '';
    isLoading.value = true;
    appStore.setIsProcessingLogin(true);
    studentStore.clearError(); // Clear any previous errors from profile store
    
    try {
        // Use the authService signInWithEmail method instead of direct Firebase call
        const userCredential = await signInWithEmail(email.value.trim(), password.value);
        
        // Force update store authentication state
        // This might throw an error (caught below) or complete but set studentStore.error (e.g., profile not found)
        await studentStore.handleAuthStateChange(userCredential.user);
        
        if (studentStore.error) {
            // Profile store handled the auth change but encountered an issue (e.g., profile not found)
            errorMessage.value = studentStore.error;
            appStore.setIsProcessingLogin(false); // Explicitly set false as processLoginSuccess is skipped
        } else if (!studentStore.currentStudent) {
            // Fallback: auth change processed, no error set from store, but student data still missing
            errorMessage.value = "Login successful, but critical user data could not be loaded. Please contact support.";
            appStore.setIsProcessingLogin(false); // Explicitly set false
        } else {
            // All good, student profile loaded, proceed to redirect logic
            await processLoginSuccess(userCredential.user);
            // processLoginSuccess will call appStore.setIsProcessingLogin(false) in its finally block
        }
    } catch (error: any) { // Catches errors from signInWithEmail or if studentStore.handleAuthStateChange throws
        if (studentStore.error) { // Prefer error message from studentStore if it was set during a thrown error
            errorMessage.value = studentStore.error;
        } else {
            // Handle Firebase auth errors (invalid email, wrong password, etc.)
            switch (error.code) {
                case 'auth/invalid-email':
                case 'auth/missing-email':
                    errorMessage.value = 'Please enter a valid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage.value = 'This user account has been disabled.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage.value = 'Invalid email or password.';
                    break;
                default:
                    errorMessage.value = error.message || 'An error occurred during sign in. Please try again.';
            }
        }
        appStore.setIsProcessingLogin(false); // Reset on any caught error
    } finally {
        isLoading.value = false;
        // appStore.setIsProcessingLogin(false) is now handled within the try/catch blocks
        // or by processLoginSuccess's own finally block.
    }
};
</script>

<style scoped>
.login-bg {
  height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.login-card {
  border-radius: var(--bs-border-radius-xl);
  background: var(--bs-card-bg);
  box-shadow: var(--bs-box-shadow-lg);
  max-height: 95vh;
  overflow-y: auto;
}

.login-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--bs-light);
  border-radius: 50%;
  width: 64px;
  height: 64px;
  margin: 0 auto 0.5rem auto;
  box-shadow: var(--bs-box-shadow-sm);
}

.input-group-text {
  background-color: transparent;
}

</style>
