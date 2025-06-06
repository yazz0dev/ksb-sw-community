# KSB Tech Community

A modern web platform for the KSB Tech Community, enabling students to participate in events, collaborate on projects, and grow together through hands-on learning experiences.

## 🚀 Features

### For Students
- **Event Management**: Browse, join, and participate in tech events
- **Project Submissions**: Submit projects for events and competitions
- **Team Collaboration**: Form teams and work together on projects
- **XP System**: Earn experience points for participation and achievements
- **Profile Management**: Maintain personal profiles with skills and bio
- **Real-time Notifications**: Stay updated with event announcements

### For Admins
- **Event Administration**: Create, approve, and manage events
- **Student Management**: Oversee student registrations and profiles
- **Analytics Dashboard**: Track participation and engagement
- **Content Moderation**: Review submissions and maintain quality

### Technical Features
- **Progressive Web App (PWA)**: Installable with offline capabilities
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Updates**: Live synchronization across devices
- **Secure Authentication**: Firebase Auth with role-based access
- **Image Optimization**: Automatic compression and optimization

## 🛠️ Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **Bootstrap 5** - CSS framework
- **SCSS** - Enhanced CSS with variables and mixins

### Backend & Services
- **Firebase Firestore** - NoSQL database
- **Firebase Authentication** - User authentication
- **Firebase Storage** - File storage
- **Firebase Hosting** - Static site hosting

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vue TSC** - TypeScript checking for Vue
- **Vite PWA Plugin** - Progressive Web App features

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **PNPM** (recommended) or npm
- **Firebase CLI** (for deployment)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ksb-sw-community
```

### 2. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Deploy Firestore rules and indexes
firebase deploy --only firestore
```

### 5. Development Server
```bash
pnpm dev
# or
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/          # Reusable Vue components
│   ├── ui/             # UI components (buttons, cards, etc.)
│   └── forms/          # Form components
├── views/              # Page components
├── stores/             # Pinia store modules
├── services/           # API and business logic
├── composables/        # Vue composition functions
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── styles/             # SCSS stylesheets
└── router/             # Vue Router configuration

public/
├── manifest.json       # PWA manifest
└── offline.html        # Offline fallback page

docs/                   # Documentation
└── student-signup-feature.md
```

## 🎯 Key Components

### Event Management
Events support multiple formats:
- **Individual**: Single participant events
- **Team**: Collaborative team-based events
- **Competition**: Competitive events with winners

Event lifecycle includes:
- **Pending** → **Approved** → **In Progress** → **Completed** → **Closed**

### User Roles
- **Students**: Can join events, submit projects, and earn XP
- **Admins**: Full platform management capabilities

### XP System
Students earn experience points through:
- Event participation
- Project submissions
- Team collaboration
- Achievement unlocks

## 🔧 Development

### Available Scripts
```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm type-check

# Type checking with watch mode
pnpm type-check:watch
```

### Code Style
- Use **TypeScript** for all new code
- Follow **Vue 3 Composition API** patterns
- Use **SCSS** for styling with Bootstrap variables
- Implement **responsive design** principles

### State Management
The application uses Pinia with the following stores:
- **appStore**: Global app state and configuration
- **profileStore**: User authentication and profile data
- **eventStore**: Event management and participation
- **notificationStore**: In-app notifications

## 📱 PWA Features

The application is a Progressive Web App with:
- **Offline Support**: Core functionality works without internet
- **Installable**: Can be installed on devices like a native app
- **Push Notifications**: Real-time event updates
- **Background Sync**: Data synchronization when back online

## 🔐 Security

### Authentication
- Firebase Authentication with email/password
- Role-based access control
- Session management with automatic refresh

### Data Protection
- Firestore security rules enforce proper access
- Input validation and sanitization
- XSS protection with DOMPurify

## 🚀 Deployment

### Firebase Hosting
```bash
# Build the project
pnpm build

# Deploy to Firebase
firebase deploy --only hosting

# Deploy specific site
firebase deploy --only hosting:ksbtechs
```

### Environment-Specific Deployments
- **Production**: `ksbtechs` site
- **Beta**: `ksbtechbetas` site

## 📊 Monitoring

The application includes:
- Error boundary handling
- Performance monitoring
- User analytics (privacy-compliant)
- Real-time error reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run type checking (`pnpm type-check`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Write TypeScript interfaces for all data structures
- Add proper error handling and loading states
- Test on both desktop and mobile viewports
- Follow the existing code patterns and naming conventions
- Update documentation for new features

## 📝 License

This project is proprietary software for KMCT School of Business.

## 🆘 Support

For technical support or questions:
1. Check the documentation in the `/docs` folder
2. Review existing issues in the repository
3. Contact the development team

## 🔄 Recent Updates

### Student Self-Signup Feature
- Admin-generated signup links
- Batch-based registration system
- Approval workflow for new students
- Duplicate prevention and validation

See `docs/student-signup-feature.md` for detailed documentation.

---

**Made with ❤️ by the KSB Tech Community**
