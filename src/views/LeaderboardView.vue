<template>
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Container -->
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Leaderboard</h2>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-10">
            <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
        
        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
             {{ error }}
        </div>
        
        <!-- Leaderboard Table -->
        <div v-else class="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Rank</th>
                        <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">User</th>
                        <th scope="col" class="hidden px-3 py-3.5 text-center text-sm font-semibold text-gray-900 md:table-cell">Skills</th> <!-- Hide on small screens -->
                        <th scope="col" class="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Total XP</th>
                        <th scope="col" class="hidden px-3 py-3.5 text-center text-sm font-semibold text-gray-900 sm:table-cell">Profile</th> <!-- Hide on extra-small screens -->
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                    <tr v-for="(user, index) in leaderboard" :key="user.uid">
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-center font-semibold text-gray-900">{{ index + 1 }}</td>
                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div class="flex items-center">
                                <div class="h-8 w-8 flex-shrink-0">
                                    <img class="h-8 w-8 rounded-full object-cover" 
                                         :src="user.photoURL || defaultAvatarUrl"
                                         alt="User avatar"
                                         @error="handleImageError">
                                </div>
                                <div class="ml-3">
                                    <div class="font-medium text-gray-900">{{ user.name }}</div>
                                    <!-- Optional: Email or other info -->
                                    <!-- <div class="text-gray-500">{{ user.email }}</div> -->
                                </div>
                            </div>
                        </td>
                        <td class="hidden whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500 md:table-cell"> <!-- Hide on small screens -->
                            <template v-if="user.skills?.length">
                                <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 mr-1 mb-1" v-for="skill in user.skills.slice(0, 2)" :key="skill">{{ skill }}</span>
                                <span v-if="user.skills.length > 2" class="text-xs text-gray-400">+{{ user.skills.length - 2 }}</span>
                            </template>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-center font-semibold text-blue-600">{{ user.totalXp }}</td>
                        <td class="hidden whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500 sm:table-cell"> <!-- Hide on extra-small screens -->
                            <router-link :to="{ name: 'PublicProfile', params: { userId: user.uid } }" 
                                         class="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                View
                            </router-link>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from '../firebase';

const leaderboard = ref([]);
const loading = ref(true);
const error = ref(null);

// Import default avatar or define path
const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const handleImageError = (event) => {
  event.target.src = defaultAvatarUrl;
};

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const usersRef = collection(db, "users");
    // Query requires an index on totalXp. Create this in Firebase console.
    const q = query(usersRef, orderBy("totalXp", "desc"), limit(100)); // Get top 100 users

    const querySnapshot = await getDocs(q);
    leaderboard.value = querySnapshot.docs
      .map(doc => ({
        uid: doc.id,
        ...doc.data(),
        totalXp: doc.data().totalXp || 0 // Ensure totalXp exists and is a number
      }))
      .filter(user => user.role !== 'Admin'); // Filter out admins

  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    error.value = "Failed to load leaderboard data. Please try again later.";
  } finally {
    loading.value = false;
  }
});
</script>

<!-- <style scoped>
/* Removed scoped styles - relying on Tailwind */
</style> -->