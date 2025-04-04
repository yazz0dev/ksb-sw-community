// src/views/LandingView.vue
<template>
  <div class="max-w-4xl mx-auto text-center py-12 px-4 sm:px-6 lg:px-8"> <!-- Main container -->
    <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Welcome to the KSB MCA S/W Community!</h1>
    <p class="text-lg text-gray-600 mb-6 max-w-2xl mx-auto"> 
      Manage events, collaborate on projects, and share resources within the KSB MCA community.
    </p>
    <p class="text-gray-700 mb-8">
      Please <router-link to="/login" class="font-semibold text-blue-600 hover:text-blue-700 hover:underline">log in</router-link> to access the platform.
    </p>

    <!-- Features Section -->
    <div class="max-w-xl mx-auto mb-8">
        <div class="bg-white shadow-md rounded-lg overflow-hidden text-left"> 
             <h2 class="text-lg font-semibold text-gray-800 px-4 py-3 bg-gray-50 border-b border-gray-200">Platform Features</h2>
             <ul role="list" class="divide-y divide-gray-200"> 
                 <li class="flex items-center p-4">
                     <i class="fas fa-calendar-alt fa-fw h-5 w-5 text-blue-500 mr-3 flex-shrink-0"></i>
                     <span class="text-sm text-gray-800">View upcoming and past events.</span>
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-plus-circle fa-fw h-5 w-5 text-cyan-500 mr-3 flex-shrink-0"></i>
                     <span class="text-sm text-gray-800">Request new events.</span>
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-users fa-fw h-5 w-5 text-gray-500 mr-3 flex-shrink-0"></i>
                     <span class="text-sm text-gray-800">Participate in team-based events.</span>
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-star fa-fw h-5 w-5 text-yellow-500 mr-3 flex-shrink-0"></i>
                     <span class="text-sm text-gray-800">Rate projects and provide feedback.</span>
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-book fa-fw h-5 w-5 text-green-500 mr-3 flex-shrink-0"></i>
                     <span class="text-sm text-gray-800">Access a library of shared resources.</span>
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-trophy fa-fw h-5 w-5 text-blue-500 mr-3 flex-shrink-0"></i>
                     <span class="text-sm text-gray-800">View leaderboards based on XP.</span>
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-file-pdf fa-fw h-5 w-5 text-red-500 mr-3 flex-shrink-0"></i>
                     <span class="text-sm text-gray-800">Generate a portfolio of your achievements.</span>
                 </li>
             </ul>
        </div>
    </div>

    <!-- Footer Text -->
    <p class="mt-10">
        <small class="text-sm text-gray-500">This site is managed by the MCA department of KMCT School Of Business.</small>
    </p>
  </div>
</template>

<script setup>
// No script logic needed for this simple view
</script>

<!-- <style scoped>
.landing-container {
  max-width: 900px; /* Limit width */
}
/* Removed redundant icon width style, relying on fa-fw class */
</style> -->
