# 📚 ILoveStudyApp

An all-in-one exam preparation platform designed for competitive exams (such as **JEE Mains**). Features include practice papers, time-tracked test attempts, rich mathematical equation rendering, user streaks, and cross-platform native mobile support (Android & Web).

---

## 🚀 Tech Stack

### **📱 Mobile Native App**
- **Cross-Platform Bridge**: [Capacitor 8](https://capacitorjs.com/) (Android / iOS native wrappers)
- **Mobile Authentication**: `@capacitor-firebase/authentication`
- **Native Target**: Android Studio (`/frontend/android`)

### **🌐 Frontend & Web**
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- **UI Library**: [React 19](https://react.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Math Rendering**: [KaTeX](https://katex.org/) (LaTeX formatting for math & science questions)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & PostCSS
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **HTTP Client**: [Axios](https://axios-http.com/)

### **⚙️ Backend & API**
- **Runtime & Server**: [Node.js](https://nodejs.org/) & [Express.js v5](https://expressjs.com/)
- **Authentication & Security**: Firebase Auth, JSON Web Tokens (JWT), `bcryptjs`
- **Email Service**: [Nodemailer](https://nodemailer.com/)

### **🗄️ Database & Caching**
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma ORM v7](https://www.prisma.io/) (`@prisma/client`, `@prisma/adapter-pg`)
- **In-Memory Cache**: [Redis](https://redis.io/) (`ioredis`)

---

## 📁 Project Structure

```text
ILoveStudyApp/
├── frontend/                  # Next.js frontend & Capacitor app setup
│   ├── android/               # Native Android studio project files (Capacitor)
│   ├── capacitor.config.ts    # Capacitor configuration
│   ├── src/
│   │   ├── app/               # Next.js App Router pages, APIs, and components
│   │   └── lib/               # Shared frontend utilities & helpers
│   ├── next.config.ts         # Next.js configuration
│   └── package.json           # Frontend dependencies & scripts
│
├── backend/                   # Node.js & Express API server
│   ├── prisma/                # Prisma schema, migrations, & seeding scripts
│   │   └── schema.prisma      # Database models (User, Profile, Exam, Shift, Question, TestAttempt)
│   ├── src/
│   │   ├── api/               # API routes & handlers
│   │   ├── config/            # Server configurations (DB, Redis)
│   │   ├── controllers/       # Business logic controllers
│   │   ├── middleware/        # Authentication & middleware
│   │   └── server.js          # Express entry point
│   └── package.json           # Backend dependencies & scripts
│
└── package.json               # Monorepo root management scripts
```

---

## 📱 Mobile App Setup (Capacitor Android)

To build, sync, and launch the native Android mobile app:

```bash
cd frontend

# 1. Build Next.js web assets
npm run build

# 2. Sync web assets and Capacitor plugins to Android native project
npx cap sync android

# 3. Open in Android Studio to build APK or run on device/emulator
npx cap open android
```

---

## 🌐 Web & Backend Setup

### Prerequisites

Ensure you have the following installed:
- **Node.js**: `v18.x` or higher
- **PostgreSQL**: Running instance or database URL
- **Redis**: Running instance for caching
- *(Optional)* **Android Studio**: For running/building native Android APKs via Capacitor

---

### Installation & Execution

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd ILoveStudyApp
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   - Create a `.env` file inside the `backend` directory:
     ```env
     DATABASE_URL=postgresql://user:password@localhost:5432/ilovestudy?schema=public
     REDIS_URL=redis://localhost:6379
     JWT_SECRET=your_jwt_secret
     PORT=5000
     ```
   - Run Prisma database migrations:
     ```bash
     npx prisma db push
     # or
     npx prisma migrate dev
     ```
   - Start the backend server:
     ```bash
     npm run dev
     ```

3. **Frontend / Web Setup**
   ```bash
   cd ../frontend
   npm install
   ```
   - Start the Next.js development server:
     ```bash
     npm run dev
     ```

---

## 📄 Scripts Summary

From the root directory, you can run:

- `npm run dev`: Starts the Next.js frontend dev server (`frontend/`)
- `npm run build`: Builds the frontend production bundle (`frontend/`)
- `npm run start`: Starts the backend Express server (`backend/`)
