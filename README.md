# KSB Tech Community Platform 

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other relevant badges: build status, coverage, etc. -->

A web application built with Vue 3, TypeScript, Pinia, and Firebase for managing events, projects, user profiles, and engagement within the KSB Tech Community (or your specific community name).

## Overview

This platform allows students and organizers within the KSB MCA community to:

*   Request, approve, and manage community events (hackathons, workshops, talks, etc.).
*   View upcoming, active, and completed events.
*   Join events individually or as part of teams.
*   Submit projects for events where applicable.
*   Rate projects and organizers based on defined criteria.
*   Earn Experience Points (XP) based on participation, roles, and performance.
*   View leaderboards based on XP earned in different skill categories.
*   Manage user profiles with bio, skills, social links, and event history.
*   Generate a PDF portfolio summarizing achievements and projects.
*   Receive push notifications for event updates (requires setup).
*   Utilize basic offline capabilities for queuing actions.

## Features

*   **Event Management:** Full lifecycle from request to completion/closure.
*   **User Authentication:** Secure login using Firebase Authentication (Email/Password).
*   **User Profiles:** Public and private views, editable details, XP breakdown, event history.
*   **Team Formation:** Support for team-based events with member management and lead selection.
*   **Project Submissions:** Functionality for participants/teams to submit project links and descriptions.
*   **Rating System:** Peer-based rating for projects/teams and organizer feedback.
*   **XP & Leaderboard:** Gamified experience points system with role-based tracking and leaderboards.
*   **Portfolio Generation:** Users can generate a PDF summary of their participation and projects.
*   **Push Notifications:** Integration with OneSignal & Supabase Functions for real-time updates.
*   **Offline Support:** Queues certain user actions when offline for later synchronization.
*   **Responsive UI:** Built with Bootstrap 5 for usability across devices.
*   **Loading States:** Skeleton loaders provide a better UX during data fetching.
*   **Typed Codebase:** Developed using TypeScript for improved maintainability and safety.
*   **State Management:** Centralized state management using Pinia.

## Tech Stack

*   **Frontend:** Vue 3 (Composition API), TypeScript
*   **Routing:** Vue Router
*   **State Management:** Pinia
*   **Backend:** Firebase (Authentication, Firestore Database)
*   **UI Framework:** Bootstrap 5 (via SCSS)
*   **Icons:** Font Awesome
*   **Date/Time:** Luxon
*   **Markdown:** Marked, DOMPurify
*   **PDF Generation:** jsPDF, jspdf-autotable
*   **Push Notifications:** OneSignal SDK, Supabase Edge Functions (for backend logic)
*   **Build Tool:** Vite

## Project Structure

```
./
├── public/
└── src/
    ├── assets/         # Static assets (images, global styles)
    ├── components/     # Reusable Vue components (organized by feature/type)
    │   ├── events/
    │   ├── forms/
    │   ├── shared/
    │   ├── skeletons/
    │   ├── ui/
    │   └── user/
    ├── composables/    # Reusable Composition API functions
    ├── router/         # Vue Router configuration
    ├── store/          # Pinia stores (state management)
    │   ├── events/     # Event store module (split actions)
    │   ├── app.ts
    │   ├── events.ts
    │   ├── notification.ts
    │   └── user.ts
    ├── types/          # TypeScript type definitions
    ├── utils/          # Utility functions (datetime, markdown, firebase, etc.)
    ├── views/          # Page-level components (routed views)
    ├── App.vue         # Root application component
    ├── firebase.ts     # Firebase initialization
    ├── main.ts         # Application entry point
    └── vite-env.d.ts   # Vite environment types
├── .env.example        # Example environment variables
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Prerequisites

*   Node.js (LTS version recommended, e.g., v18 or v20+)
*   npm or yarn package manager
*   A Firebase project set up.
*   (Optional) A OneSignal account and app set up for push notifications.
*   (Optional) A Supabase project with Edge Functions enabled for push notification backend logic.

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Firebase:**
    *   Create a project on the [Firebase Console](https://console.firebase.google.com/).
    *   Enable **Authentication** (specifically Email/Password provider).
    *   Enable **Firestore Database** (start in test mode for development, but configure security rules for production).
    *   Obtain your Firebase project configuration keys (apiKey, authDomain, etc.).

4.  **Configure Environment Variables:**
    *   Copy the `.env.example` file to a new file named `.env` in the project root:
        ```bash
        cp .env.example .env
        ```
    *   Fill in the required Firebase configuration keys in the `.env` file:
        ```dotenv
        # Firebase Configuration
        VITE_FIREBASE_API_KEY=YOUR_API_KEY
        VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
        VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
        VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
        VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
        VITE_FIREBASE_APP_ID=YOUR_APP_ID

        # OneSignal (Optional - for Push Notifications)
        VITE_ONESIGNAL_APP_ID=YOUR_ONESIGNAL_APP_ID

        # Supabase (Optional - for Push Notification Backend Function)
        VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
    *   **Important:** Never commit your actual `.env` file to version control. Add it to your `.gitignore` file if it's not already there.

5.  **(Optional) Set up Push Notifications:**
    *   Configure your OneSignal app.
    *   Deploy the Supabase Edge Function (located in `supabase/functions/push-notification` or similar - *Note: This function code is not included in the provided snippets but is required for the push logic*). Ensure the function URL matches the one used in `src/utils/notifications.ts`.

## Running the Project

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
2.  Open your browser and navigate to the local URL provided (usually `http://localhost:5173`).

## Building for Production

```bash
npm run build
# or
yarn build
```
This will create a `dist` directory with the optimized production build.

## Firebase Setup Details

### Firestore Security Rules

It is **critical** to set up proper Firestore security rules to protect your data. The default "allow read, write: if true;" rule is **insecure** for production. You need rules that:

*   Allow authenticated users to read/write their own profile data.
*   Allow authenticated users to read public event data.
*   Allow specific roles (e.g., event organizers, admins) to modify event data.
*   Validate data writes (e.g., ensuring XP cannot be set arbitrarily).

Consult the [Firebase Firestore Security Rules documentation](https://firebase.google.com/docs/firestore/security/get-started) for details.

### Firestore Indexes

Depending on your queries (especially compound queries involving `where` and `orderBy`), you might need to configure Firestore indexes. Firebase usually prompts you in the console logs or Firebase Console if an index is required.

## Linting

To check for code style issues:

```bash
npm run lint
# or
yarn lint
```

## Contributing

Please read `CONTRIBUTING.md` for details on our code of conduct, and the process for submitting pull requests to us.

## License

*(Optional: Specify the license)*
This project is licensed under the MIT License.
```