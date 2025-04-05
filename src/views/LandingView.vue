<template>
  <div class="max-w-4xl mx-auto text-center py-12 px-4 sm:px-6 lg:px-8"> <!-- Main container -->
    <h1 class="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">Welcome to the KSB MCA S/W Community!</h1> <!-- Updated text color -->
    <p class="text-lg text-text-secondary mb-6 max-w-2xl mx-auto"> <!-- Updated text color -->
      Manage events, collaborate on projects, and share resources within the KSB MCA community.
    </p>
    <p class="text-text-secondary mb-8"> <!-- Updated text color -->
      Please <router-link to="/login" class="font-semibold text-primary hover:text-primary-dark hover:underline">log in</router-link> to access the platform. <!-- Updated link colors -->
    </p>

    <!-- Features Section -->
    <div class="max-w-xl mx-auto mb-8">
        <div class="bg-surface shadow-md rounded-lg overflow-hidden text-left"> <!-- Updated bg -->
             <h2 class="text-lg font-semibold text-text-primary px-4 py-3 bg-surface-variant border-b border-border">Platform Features</h2> <!-- Updated text, bg, border -->
             <ul role="list" class="divide-y divide-border"> <!-- Updated divider -->
                 <li class="flex items-center p-4">
                     <i class="fas fa-calendar-alt fa-fw h-5 w-5 text-primary mr-3 flex-shrink-0"></i> <!-- Updated icon color -->
                     <span class="text-sm text-text-secondary">View upcoming and past events.</span> <!-- Updated text color -->
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-plus-circle fa-fw h-5 w-5 text-info mr-3 flex-shrink-0"></i> <!-- Updated icon color -->
                     <span class="text-sm text-text-secondary">Request new events.</span> <!-- Updated text color -->
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-users fa-fw h-5 w-5 text-neutral mr-3 flex-shrink-0"></i> <!-- Updated icon color -->
                     <span class="text-sm text-text-secondary">Participate in team-based events.</span> <!-- Updated text color -->
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-star fa-fw h-5 w-5 text-warning mr-3 flex-shrink-0"></i> <!-- Updated icon color -->
                     <span class="text-sm text-text-secondary">Rate projects and provide feedback.</span> <!-- Updated text color -->
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-book fa-fw h-5 w-5 text-success mr-3 flex-shrink-0"></i> <!-- Updated icon color -->
                     <span class="text-sm text-text-secondary">Access a library of shared resources.</span> <!-- Updated text color -->
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-trophy fa-fw h-5 w-5 text-primary mr-3 flex-shrink-0"></i> <!-- Updated icon color -->
                     <span class="text-sm text-text-secondary">View leaderboards based on XP.</span> <!-- Updated text color -->
                 </li>
                 <li class="flex items-center p-4">
                     <i class="fas fa-file-pdf fa-fw h-5 w-5 text-error mr-3 flex-shrink-0"></i> <!-- Updated icon color -->
                     <span class="text-sm text-text-secondary">Generate a portfolio of your achievements.</span> <!-- Updated text color -->
                 </li>
             </ul>
        </div>
    </div>

    <!-- Footer Text -->
    <p class="mt-10">
        <small class="text-sm text-text-disabled">This site is managed by the MCA department of KMCT School Of Business.</small> <!-- Updated text color -->
    </p>
  </div>
</template>
