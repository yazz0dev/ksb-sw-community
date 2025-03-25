<template>
  <div class="container mt-5"> 
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-5"> 
        <div class="card login-card">
          <div class="card-header">
            <h2>Login</h2>
          </div>
          <div class="card-body">
            <div v-if="errorMessage" class="alert alert-danger" role="alert">
              {{ errorMessage }}
            </div>
            
            <form @submit.prevent="signIn" class="space-y-6">
              <div> 
                <label for="email" class="form-label">Email:</label>
                <input
                  type="email"
                  id="email"
                  v-model="email"
                  required
                  class="form-control"
                  placeholder="Enter your email"
                />
              </div>
              <div> 
                <label for="password" class="form-label">Password:</label>
                <input
                  type="password"
                  id="password"
                  v-model="password"
                  required
                  class="form-control"
                  placeholder="Enter your password"
                />
              </div>
              <button type="submit" class="btn btn-primary w-100">Login</button> 
            </form>
             <div class="mt-3 text-center"> 
              <router-link to="/forgot-password">Forgot Password?</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  /* Optional: Add w-100 if not globally defined */
  .w-100 { width: 100% !important; }
</style>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'; // Import Firebase auth functions

export default {
  setup() {
    const email = ref('');
    const password = ref('');
    const errorMessage = ref('');
    const router = useRouter();

    const signIn = async () => {
      errorMessage.value = ''; // Reset error message
      try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
        // User signed in successfully
        console.log('User signed in:', userCredential.user);
        router.push('/home'); // Redirect to home page
      } catch (error) {
        // Handle errors here.  Provide specific error messages.
        console.error("Login Error:", error);
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage.value = 'Invalid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage.value = 'This user account has been disabled.';
            break;
          case 'auth/user-not-found':
            errorMessage.value = 'No user found with this email.';
            break;
          case 'auth/wrong-password':
            errorMessage.value = 'Incorrect password.';
            break;
          case 'auth/too-many-requests':
             errorMessage.value = 'Too many login attempts. Please try again later.';
              break;
          default:
            errorMessage.value =  error.message || 'Login failed. Please try again.';
        }
      }
    };

    return {
      email,
      password,
      errorMessage,
      signIn,
    };
  },
};
</script>