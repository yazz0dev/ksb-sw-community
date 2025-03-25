// /src/views/LoginView.vue (Bootstrap styling, error handling)
<template>
    <div class="container">
      <h2>Login</h2>
       <div v-if="errorMessage" class="alert alert-danger" role="alert">
         {{ errorMessage }}
       </div>
      <form @submit.prevent="signIn">
       <div class="mb-3">
        <label for="registerNumber" class="form-label">Register Number:</label>
        <input type="text" id="registerNumber" v-model="registerNumber" required pattern="KMC24MCA-.{4}" title="KMC24MCA-XXXX Format" class="form-control" />
       </div>
        <button type="submit" class="btn btn-primary">Login</button>

      </form>
    </div>
  </template>
  
  <script>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useStore } from 'vuex';
  
  
  export default {
    setup() {
      const registerNumber = ref('');
      const errorMessage = ref('');
      const router = useRouter();
      const store = useStore();
  
      const signIn = async () => {
          errorMessage.value = ''; // Reset error message
        try {
  
          await store.dispatch('fetchUserData', registerNumber.value);
            //Check User authenticated
          if(store.getters.isAuthenticated)
          {
              router.push('/'); // Redirect to home page
          }else{
              errorMessage.value = "Invalid User";
          }
        } catch (error) {
            errorMessage.value = `Login failed: ${error.message}` || 'Login failed';
        }
      };
  
      return {
        registerNumber,
        errorMessage,
        signIn,
      };
    },
  };
  </script>