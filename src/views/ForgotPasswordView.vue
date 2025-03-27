<template>
  <div class="container mt-5">
      <div class="row justify-content-center">
          <div class="col-md-6 col-lg-5">
              <div class="card login-card"> 
                   <div class="card-header">
                      <h2 class="mb-0">Forgot Password</h2>
                   </div>
                   <div class="card-body">
                      <p class="text-muted mb-4">Enter your email address and we will send you a link to reset your password.</p>

                      {/* Success/Error Message */}
                      <div v-if="message" :class="['alert', isError ? 'alert-danger' : 'alert-success']" role="alert">
                          {{ message }}
                      </div>

                      <form @submit.prevent="sendPasswordResetEmail" v-if="!message || isError">
                          <div class="mb-3">
                              <label for="email" class="form-label">Email Address:</label>
                              <input
                                  type="email"
                                  id="email"
                                  v-model="email"
                                  required
                                  class="form-control"
                                  placeholder="you@example.com"
                                  :disabled="isLoading" />
                          </div>
                           <button type="submit" class="btn btn-primary w-100" :disabled="isLoading">
                               <span v-if="isLoading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                              {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
                          </button>
                      </form>

                      <div class="mt-4 text-center">
                           <router-link v-if="!message || isError" to="/login" class="small">Back to Login</router-link>
                           <router-link v-else to="/login" class="btn btn-secondary w-100">Back to Login</router-link> 
                      </div>
                  </div>
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

<style scoped>
/* Styles primarily come from main.css login-card */
.login-card .card-body p.text-muted {
  font-size: var(--font-size-sm);
}
</style>