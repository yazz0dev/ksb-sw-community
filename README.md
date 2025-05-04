# KSB Tech Community Platform

A collaborative platform for MCA students at KMCT School Of Business to learn, build, and grow together through real-world software projects and events.

## Features

- 🎯 **Event Management**
  - Create and join coding events
  - Team-based and individual participation
  - Request new events
  - Track event progress and completion

- 🏆 **XP & Recognition**
  - Earn XP for participation and achievements
  - Role-based XP tracking (Frontend, Backend, etc.)
  - Leaderboard rankings
  - Generate portfolio PDFs of achievements

- 👥 **Community Features**
  - Profile management
  - Team collaboration
  - Project submissions
  - Peer ratings and feedback

- 📚 **Resources**
  - Curated learning materials
  - Development guides
  - Community best practices

## Tech Stack

- Vue 3 + TypeScript
- Firebase (Authentication, Firestore, Storage)
- Appwrite (Push Notifications)
- Bootstrap 5
- Vite

## Getting Started

### Prerequisites

- Node.js >= 16
- npm or yarn
- Firebase account
- Appwrite account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/ksb-sw-community.git
cd ksb-sw-community
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory with your credentials:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"

VITE_APPWRITE_ENDPOINT="your-appwrite-endpoint"
VITE_APPWRITE_PROJECT_ID="your-appwrite-project-id"
VITE_APPWRITE_FUNCTION_UPDATE_PUSH_PREFS_ID="your-function-id"
VITE_APPWRITE_FUNCTION_TRIGGER_PUSH_ID="your-function-id"
```

4. Start development server:
```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
# or watch mode
npm run type-check:watch
```

## Project Structure

```
src/
├── assets/          # Static assets
├── components/      # Vue components
├── store/          # pinia store modules
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── views/          # Vue route components
├── firebase.ts     # Firebase configuration
└── App.vue         # Root component
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Key Features for Students

- Build a portfolio of real-world projects
- Collaborate with peers on team projects
- Earn recognition through XP system
- Access curated learning resources
- Get feedback from peers and mentors
- Track progress and achievements

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- KMCT School of Business
- All contributing students and mentors
- Open source community
