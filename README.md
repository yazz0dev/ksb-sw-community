# KSB MCA Software Community Platform  MERN stack implementation

Welcome to the KSB MCA Software Community Platform! This web application provides a central hub for managing events, tracking participation, showcasing projects, and fostering collaboration within the KMCT School of Business (KSB) MCA department.

## ✨ Features

*   **User Authentication:** Secure login using Firebase Authentication.
*   **Role-Based Access:** Differentiated views and permissions for Students and Admins.
*   **Event Management:**
    *   Dashboard displaying Upcoming, Active, and Completed events.
    *   Students can request new events (limit one active request).
    *   Admins can create events directly and manage pending requests.
    *   Detailed event view with participant/team lists.
*   **Team Formation:** Admins/Organizers can create teams and assign students for team-based events.
*   **Project Submission:** Participants can submit project links (GitHub, website, documents) related to specific events.
*   **Rating System:** Users can rate participants/teams on completed events based on customizable criteria.
*   **XP System:** Experience points automatically calculated based on event participation, ratings, and winning status, distributed across different skill categories (`xpByRole`).
*   **User Profiles:**
    *   Displays user information, total XP, XP breakdown, and submitted event projects.
    *   Publicly viewable profiles for showcasing achievements.
*   **PDF Portfolio Generation:** Users can generate a PDF portfolio summarizing their profile, XP, skills, and projects.
*   **Leaderboard:** Ranks students based on Overall XP or specific role-based XP categories.
*   **Resource Sharing:** Centralized page for important links and documents.
*   **Transparency Page:** Outlines community guidelines, event lifecycle, and system operations.
*   **Modern UI:** Built with Vue 3 and custom CSS using modern practices (CSS Variables).

## 🚀 Technologies Used

*   **Frontend:** Vue.js 3 (Composition API)
*   **Routing:** Vue Router
*   **State Management:** Vuex
*   **Backend & Database:** Firebase (Firestore, Authentication)
*   **Styling:** Custom Modern CSS (using CSS Variables), Tailwind 5 (Grid, Utilities, JS Components)
*   **PDF Generation:** jsPDF
*   **UI Components:** vue3-star-ratings
*   **Icons:** Font Awesome

## ⚙️ Setup and Installation

To run this project locally, follow these steps:

1.  **Prerequisites:**
    *   Node.js (v16 or higher recommended)
    *   npm or yarn

2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/ksb-sw-community.git
    cd ksb-sw-community
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    # OR
    yarn install
    ```

4.  **Firebase Configuration (IMPORTANT):**
    *   This project uses Firebase for backend services. The configuration file (`src/firebase.js`) containing API keys is **intentionally excluded** from this repository for security reasons (`.gitignore` should prevent accidental commits).
    *   You need to create your **own** Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Enable **Firestore Database** and **Authentication** (Email/Password provider) in your Firebase project settings.
    *   In your Firebase project settings (Project settings > General > Your apps > Web app), find your Firebase configuration object.
    *   Create a new file named `firebase.js` inside the `src` directory (`src/firebase.js`).
    *   Paste the following code into `src/firebase.js`, replacing the placeholder values with your **actual** Firebase project configuration:

    ```javascript
    // src/firebase.js
    import { initializeApp } from "firebase/app";
    import { getFirestore } from "firebase/firestore";
    import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'; // Ensure all needed auth functions are imported if used directly

    // --- REPLACE WITH YOUR FIREBASE PROJECT CONFIG ---
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };
    // --- END OF CONFIG ---

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Export the necessary Firebase services
    export { db, auth, signInWithEmailAndPassword }; // Add other exports if needed
    ```
    *   **DO NOT commit `src/firebase.js` to your public repository if you fork this project.**

5.  **Firestore Rules:**
    *   Copy the contents of `firebase.rules` from this repository.
    *   Go to your Firebase project console -> Firestore Database -> Rules.
    *   Paste the rules into the editor and click **Publish**.

6.  **Firestore Indexes (If Required):**
    *   Complex queries (like sorting/filtering on multiple fields in `fetchEventRequests`, `fetchUserProjects`, or potentially `Leaderboard`) might require composite indexes in Firestore.
    *   When running the app locally, Firestore often provides an error message in the browser console with a direct link to create the required index if one is missing. Click this link and follow the instructions in the Firebase console.

## ▶️ Running the Project

1.  **Development Server:**
    ```bash
    npm run dev
    # OR
    yarn dev
    ```
    This will start the Vite development server, typically at `http://localhost:5173`.

2.  **Production Build:**
    ```bash
    npm run build
    # OR
    yarn build
    ```
    This creates a `dist` folder with optimized static assets ready for deployment.

## 🤝 Contributing (Optional)

Contributions are welcome! Please follow standard Git workflow (fork, branch, pull request). Ensure code adheres to existing style and practices.

## 📄 License (Optional)

Specify your project's license here (e.g., MIT License). If none, state that.

---

This README provides clear instructions, especially regarding the sensitive Firebase configuration, ensuring anyone cloning the repository knows how to set it up locally without exposing credentials. Remember to replace `YOUR_USERNAME` in the clone URL if needed.