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

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAuth, signInWithEmailAndPassword, UserCredential, User } from 'firebase/auth'; // Import User
import { useStore } from 'vuex';
// --- Appwrite/SendPulse Integration START ---
import { isAppwriteConfigured } from '@/appwrite'; // Import helper
// --- Appwrite/SendPulse Integration END ---

const email = ref<string>('');
const password = ref<string>('');
const errorMessage = ref<string>('');
const isLoading = ref<boolean>(false);
const router = useRouter();
const store = useStore();

// --- Appwrite/SendPulse Integration START ---
// Extracted Appwrite JWT login logic
async function handleAppwriteJwtLogin(firebaseUser: User) {
    if (!firebaseUser || !isAppwriteConfigured()) return;
    console.log("Attempting Appwrite JWT login for:", firebaseUser.uid);
    try {
        const idToken = await firebaseUser.getIdToken(true);
        // IMPORTANT: Replace '/api/generate-appwrite-jwt' with your actual secure backend endpoint URL
        const response = await fetch('/api/generate-appwrite-jwt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
        });

        if (!response.ok) {
             const errorText = await response.text();
             console.error("Appwrite JWT Generation Error:", response.status, errorText);
             throw new Error(`Backend token generation failed (Status: ${response.status})`);
        }
        const { appwriteJwt } = await response.json();
        if (!appwriteJwt) throw new Error("No Appwrite JWT received");

        const { account } = await import('../appwrite');
        await account.createJWT(appwriteJwt);
        console.log('Appwrite JWT session created successfully.');

        // Optionally trigger SendPulse init/check here if needed after Appwrite login
        const { initSendpulse } = await import('../sendpulse');
        initSendpulse();

    } catch (error) {
        console.error("Appwrite JWT login process failed:", error);
        // Decide how to handle this error (e.g., notify user, proceed without Appwrite session?)
        // For now, we log the error but let the Firebase login proceed.
        // You might want to add a notification:
        // store.dispatch('notification/showNotification', { message: 'Could not sync session with Appwrite.', type: 'warning' });
    }
}
// --- Appwrite/SendPulse Integration END ---

const processLoginSuccess = async (user: UserCredential['user']): Promise<void> => {
    console.log("Firebase Login successful for:", user.uid);
    try {
        await store.dispatch('user/fetchUserData', user.uid);
        console.log("Firebase user data fetch dispatched.");

        // --- Appwrite/SendPulse Integration START ---
        // Attempt Appwrite JWT Login *after* Firebase user data is fetched
        await handleAppwriteJwtLogin(user);
        // --- Appwrite/SendPulse Integration END ---

        // Proceed with routing based on Firebase role
        const role = store.getters['user/getUserRole']; // Corrected getter name
        if (role === 'Admin') {
            router.replace({ name: 'AdminDashboard' }); // Route to Admin Dashboard
        } else {
            router.replace({ name: 'Home' });
        }
        console.log(`Navigation to ${role === 'Admin' ? 'AdminDashboard' : 'Home'} attempted.`);

    } catch (fetchError) {
        console.error("Error fetching user data or Appwrite login after Firebase login:", fetchError);
        errorMessage.value = 'Login successful, but failed to load profile/sync session. Please try refreshing.';
        // Keep the user logged into Firebase, but show an error.
    }
};

const signIn = async (): Promise<void> => {
    errorMessage.value = '';
    isLoading.value = true;
    try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
        // Call the combined success handler
        await processLoginSuccess(userCredential.user);
    } catch (error: any) {
        console.error("Email/Password Sign-In Error:", error);
        // ... (keep existing Firebase error handling) ...
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
            case 'auth/invalid-credential': // Add this common error code
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
