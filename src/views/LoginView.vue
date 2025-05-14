<template>
  <div class="login-bg d-flex align-items-center justify-content-center overflow-hidden">
    <div class="container container-sm">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-6">
          <transition name="fade-pop">
            <div class="card login-card shadow-lg border-0 animate-pop">
              <div class="card-body p-4 p-md-5">
                <div class="text-center mb-4">
                  <div class="login-icon mb-2">
                    <i class="fas fa-user-circle fa-3x text-primary"></i>
                  </div>
                  <h2 class="h3 fw-bold text-primary mb-1">Sign In</h2>
                  <p class="text-secondary small mb-0">Access your KSB Tech Community account</p>
                </div>
                <div v-if="errorMessage" class="alert alert-danger small p-2 text-center" role="alert">
                  {{ errorMessage }}
                </div>
                <form @submit.prevent="signIn" autocomplete="on">
                  <div class="mb-3">
                    <label for="email" class="form-label small">Email address</label>
                    <div class="input-group">
                      <span class="input-group-text bg-light"><i class="fas fa-envelope"></i></span>
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
                      <label for="password" class="form-label small mb-0">Password</label>
                      <router-link
                        to="/forgot-password"
                        class="small text-primary text-decoration-underline-hover"
                      >
                        Forgot password?
                      </router-link>
                    </div>
                    <div class="input-group">
                      <span class="input-group-text bg-light"><i class="fas fa-lock"></i></span>
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
                  <div class="d-grid mt-4">
                    <button
                      type="submit"
                      class="btn btn-primary btn-lg rounded-pill shadow-sm"
                      :disabled="isLoading"
                    >
                      <span v-if="isLoading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      {{ isLoading ? 'Signing In...' : 'Sign In' }}
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
import { useRouter } from 'vue-router';
import { getAuth, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { useUserStore } from '@/store/user';

const email = ref<string>('');
const password = ref<string>('');
const errorMessage = ref<string>('');
const isLoading = ref<boolean>(false);
const router = useRouter();
const userStore = useUserStore();

const processLoginSuccess = async (user: UserCredential['user']): Promise<void> => {
    try {
        // Fetch Firebase user data first
        await userStore.fetchUserData(user.uid);

        // Check if user data exists after fetch
        const userData = userStore.currentUser;
        if (!userData || !userData.uid) {
            errorMessage.value = 'Your account exists in authentication, but no user profile was found. Please contact support or try registering again.';
            return; // Do not navigate
        }

        router.replace({ name: 'Home' });
    } catch (fetchError) {
        console.error("Error fetching user data after Firebase login:", fetchError);
        errorMessage.value = 'Login successful, but failed to load profile. Please try refreshing.';
        // Keep the user logged into Firebase, but show an error.
    }
};

const signIn = async (): Promise<void> => {
    errorMessage.value = '';
    isLoading.value = true;
    try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
        // processLoginSuccess will handle fetching data and routing.
        await processLoginSuccess(userCredential.user);

    } catch (error: any) {
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
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                errorMessage.value = 'Invalid email or password.';
                break;
            default:
                errorMessage.value = 'An error occurred during sign in. Please try again.';
        }
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
.login-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle, #e0e7ff) 100%);
  padding: 1rem 0; /* Add some padding for very small screens */
}
.login-card {
  border-radius: var(--bs-border-radius-xl, 1rem);
  background: var(--bs-card-bg, #fff);
  box-shadow: var(--bs-box-shadow-lg);
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
.text-decoration-underline-hover:hover {
  text-decoration: underline;
}
</style>
