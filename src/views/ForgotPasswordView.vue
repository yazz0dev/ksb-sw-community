<template>
    <div class="container">
      <h2>Forgot Password</h2>
      <div v-if="message" :class="{ 'alert': true, 'alert-success': !isError, 'alert-danger': isError }">
        {{ message }}
      </div>
      <form @submit.prevent="sendPasswordResetEmail">
        <div class="mb-3">
          <label for="email" class="form-label">Email:</label>
          <input type="email" id="email" v-model="email" required class="form-control" />
        </div>
        <button type="submit" class="btn btn-primary">Send Reset Email</button>
        <router-link to="/login" class="btn btn-secondary">Back to Login</router-link>
      </form>
    </div>
  </template>
  
  <script>
  import { ref } from 'vue';
  import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
  
  export default {
    name: 'ForgotPasswordView',
    setup() {
      const email = ref('');
      const message = ref('');
      const isError = ref(false);
  
      const sendPasswordResetEmailHandler = async () => {
        message.value = '';
        isError.value = false;
        try {
          const auth = getAuth();
          await sendPasswordResetEmail(auth, email.value);
          message.value = 'Password reset email sent.  Check your inbox (and spam folder).';
        } catch (error) {
          console.error("Password Reset Error:", error);
          isError.value = true;
           switch (error.code) {
              case 'auth/invalid-email':
                message.value = 'Invalid email address.';
                break;
              case 'auth/user-not-found':
                message.value = 'No user found with this email.';
                break;
              default:
                message.value =  error.message || 'Password reset failed. Please try again.';
            }
        }
      };
  
      return {
        email,
        message,
        isError,
        sendPasswordResetEmail: sendPasswordResetEmailHandler,
      };
    },
  };
  </script>