# AI Notes Studio

> Riorganizza i tuoi appunti con l'AI - Transform your notes into clear, concise summaries using AI

A modern web application built with Next.js 15 that helps you organize and summarize your notes, documents, and images using Google's Gemini AI. Features a beautiful dark Apple-style interface, Firebase authentication, and support for multiple file formats.

![Next.js](https://img.shields.io/badge/Next.js-15.0-black)
![React](https://img.shields.io/badge/React-19.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Firebase](https://img.shields.io/badge/Firebase-12.7-orange)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## ✨ Features

- 🤖 **AI-Powered Summarization**: Transform long notes into concise summaries using Google Gemini AI
- 📄 **Multi-Format Support**: Upload and process text files (.txt, .md), PDFs, and images (.jpg, .png)
- 🔐 **Authentication**: Secure user authentication with Firebase (email/password or anonymous)
- 📱 **Responsive Design**: Beautiful dark Apple-style UI that works seamlessly on desktop and mobile
- 💾 **Cloud Storage**: Save and manage your summaries with Firebase Firestore
- 📥 **Export Options**: Download summaries as .txt, .md, or .pdf files
- 📚 **History**: View and manage your summarization history
- 🌐 **Multi-language**: Italian interface with support for Italian text processing

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **AI**: Google Gemini API
- **PDF Processing**: pdf-parse, jsPDF
- **Styling**: Tailwind CSS with custom dark theme

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Firebase account** with a project set up ([Firebase Console](https://console.firebase.google.com/))
- **Google Gemini API key** ([Get API Key](https://aistudio.google.com/app/apikey))

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-notes-studio.git
cd ai-notes-studio
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration (from Firebase Console > Project Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Gemini API Key (for AI summarization)
FIREBASE_API_KEY_FOR_AI=your_gemini_api_key
```

> **Note**: The `FIREBASE_API_KEY_FOR_AI` variable name is used for the Gemini API key. You can rename it to `GEMINI_API_KEY` if preferred (just update the code accordingly).

### 4. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable **Authentication** with Email/Password provider
4. Create a **Firestore Database** (production or test mode)
5. Copy your Firebase configuration to `.env.local`

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
ai-notes-studio/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── summarize/     # Text summarization endpoint
│   │   └── upload-and-summarize/  # File upload & summarization
│   ├── dashboard/         # Main dashboard page
│   ├── history/           # Summaries history page
│   ├── settings/          # User settings page
│   ├── register/          # Registration page
│   ├── verify-email/      # Email verification page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── AppShell.tsx       # Main app layout wrapper
│   ├── Sidebar.tsx        # Navigation sidebar
│   ├── Navbar.tsx         # Top navigation bar
│   ├── AuthForm.tsx       # Login form
│   ├── RegisterForm.tsx   # Registration form
│   ├── Card.tsx           # Reusable card component
│   ├── PrimaryButton.tsx  # Primary button component
│   └── ...
├── lib/                   # Utility libraries
│   ├── firebase.ts        # Firebase initialization
│   ├── gemini.ts          # Gemini API integration
│   ├── summaries.ts       # Firestore summaries operations
│   └── types.ts           # TypeScript type definitions
└── public/                # Static assets
```

## 🔧 Configuration

### Firebase Setup

1. **Authentication**:
   - Enable Email/Password authentication
   - Enable Anonymous authentication (optional)
   - Configure email templates in Firebase Console

2. **Firestore Database**:
   - Create a Firestore database
   - Set up security rules (example below)

Example Firestore Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /summaries/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### API Limits

- **Text Input**: Maximum 50,000 characters
- **File Size**: Maximum 10MB per file
- **Supported Formats**: .txt, .md, .pdf, .jpg, .jpeg, .png

## 🎨 Customization

### Theme

The app uses a dark Apple-style theme with Tailwind CSS. You can customize colors in `tailwind.config.ts`:

```typescript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Customize your color palette
      },
    },
  },
}
```

## 📝 Development Notes

### Hydration warnings in auth forms

If you see a hydration mismatch on `/register` or `/login` mentioning a node like:

```html
<div data-lastpass-icon-root="..."></div>
```

this is caused by a browser extension (e.g. LastPass, password managers) injecting DOM into the form on the client only.

Disable those extensions (or use an incognito window without extensions) when developing to avoid the warning.

## 🐛 Troubleshooting

### Firestore NOT_FOUND Errors

If you see Firestore `NOT_FOUND` errors, make sure:
1. Firestore Database is created in Firebase Console
2. The database is properly initialized
3. Security rules allow authenticated access

The app will continue to work even if Firestore isn't configured (it just won't save summaries).

### API Key Issues

- Make sure all environment variables are set in `.env.local`
- Restart the development server after changing environment variables
- Verify your Gemini API key is valid and has quota available

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👤 Author

Your Name - [GitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Firebase](https://firebase.google.com/) - Backend services
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI capabilities
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

---

⭐ If you found this project helpful, please consider giving it a star!
