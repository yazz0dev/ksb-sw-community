<template>
  <div class="section is-flex is-flex-direction-column is-align-items-center is-justify-content-center" style="min-height: 80vh;">
    <div class="container is-max-desktop">
      <div class="has-text-centered mb-6">
        <h1 class="title is-2 has-text-primary">Login to your account</h1>
      </div>

      <div class="box" style="background-color: var(--color-surface); border: 1px solid var(--color-border); max-width: 450px; margin: 0 auto;">
        <div v-if="errorMessage" class="message is-danger is-small">
          <div class="message-body">
            {{ errorMessage }}
          </div>
        </div>

        <form @submit.prevent="signIn">
          <div class="field">
            <label for="email" class="label is-small">Email address</label>
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
              <span class="icon is-small is-left">
                <i class="fas fa-envelope"></i>
              </span>
            </div>
          </div>

          <div class="field">
             <div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
                <label for="password" class="label is-small mb-0">Password</label>
                <router-link
                  to="/forgot-password"
                  class="is-size-7 has-text-primary"
                >
                  Forgot password?
                </router-link>
             </div>
            <div class="control has-icons-left">
              <input
                id="password"
                class="input"
                type="password"
                v-model="password"
                placeholder="••••••••"
                required
                :disabled="isLoading"
              />
              <span class="icon is-small is-left">
                <i class="fas fa-lock"></i>
              </span>
            </div>
          </div>

          <div class="field mt-5">
            <button
              type="submit"
              class="button is-primary is-fullwidth"
              :class="{ 'is-loading': isLoading }"
              :disabled="isLoading"
            >
              Sign in
            </button>
          </div>
        </form>
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
.box {
    box-shadow: 0 4px 10px rgba(10, 10, 10, 0.1);
}
</style>
