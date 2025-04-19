<template>
  <div class="login-bg d-flex align-items-center justify-content-center py-5">
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
                <div class="text-center mt-4">
                  <span class="small text-muted">Don't have an account?</span>
                  <router-link to="/register" class="small text-primary text-decoration-underline-hover ms-1">
                    Register
                  </router-link>
                </div>
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
import { useStore } from 'vuex';

const email = ref<string>('');
const password = ref<string>('');
const errorMessage = ref<string>('');
const isLoading = ref<boolean>(false);
const router = useRouter();
const store = useStore();

const processLoginSuccess = async (user: UserCredential['user']): Promise<void> => {
    console.log("Firebase Login successful for:", user.uid);
    try {
        // Fetch Firebase user data first
        await store.dispatch('user/fetchUserData', user.uid);
        console.log("Firebase user data fetch dispatched.");

        // Proceed with routing based on Firebase role
        const role = store.getters['user/getUserRole'];
        if (role === 'Admin') {
            router.replace({ name: 'AdminDashboard' });
        } else {
            router.replace({ name: 'Home' });
        }
        console.log(`Navigation to ${role === 'Admin' ? 'AdminDashboard' : 'Home'} attempted.`);

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
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
}
.login-card {
  border-radius: 1.5rem;
  background: #fff;
  box-shadow: 0 8px 32px 0 rgba(37,99,235,0.10);
  animation: fadeIn 0.7s;
}
.login-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(120deg, #e0e7ff 0%, #f8fafc 100%);
  border-radius: 50%;
  width: 64px;
  height: 64px;
  margin: 0 auto 0.5rem auto;
  box-shadow: 0 2px 8px 0 rgba(37,99,235,0.08);
}
.btn-primary {
  background: linear-gradient(90deg, #2563eb 30%, #14b8a6 100%);
  border: none;
}
.btn-primary:focus, .btn-primary:hover {
  background: linear-gradient(90deg, #1d4ed8 30%, #0d9488 100%);
}
.text-decoration-underline-hover:hover {
  text-decoration: underline;
}
.animate-pop {
  animation: pop-in 0.7s cubic-bezier(.23,1.01,.32,1) both;
}
@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.95);}
  100% { opacity: 1; transform: scale(1);}
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fade-pop-enter-active {
  animation: fadeIn 0.7s;
}
.fade-pop-leave-active {
  animation: fadeIn 0.7s reverse;
}
</style>
