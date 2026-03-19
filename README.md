<div align="center">


# DreamBookGenie

The #1 Magical Storyteller for Kids — create personalized picture books, learn new topics, and practice reading with your very own AI coach.

---

## Run Locally 

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   ```bash
   npm run dev
   ```

---

## Architecture Overview

**Type:** Single-page application (SPA)  
**Stack:** React 19 + TypeScript + Vite  
**Pattern:** Component-based UI with a service layer and centralized state in `App.tsx`

### Project Structure

```
DreamBookGenie/
├── index.tsx              # Entry point, mounts App
├── App.tsx                # Root component, app state, routing
├── types.ts               # Shared TypeScript interfaces
├── components/            # UI components
│   ├── StoryForm.tsx
│   ├── StoryReader.tsx
│   ├── ChatWidget.tsx
│   ├── BrainstormingScreen.tsx
│   ├── TrackingView.tsx
│   └── ColoringBookGenerator.tsx
├── services/              # Business logic & external APIs
│   ├── geminiService.ts
│   ├── storageService.ts
│   ├── pdfService.ts
│   ├── liveCoachService.ts
│   └── firebase.ts
├── server/Code.js         # Backend (Google Apps Script)
└── vite.config.ts
```

### Components

| Component | Purpose |
|-----------|---------|
| **StoryForm** | Story creation form: topic, character, style, age group, page count, voice, photo upload, brainstorming entry |
| **StoryReader** | Story reading: page navigation, TTS, Magic Wand (word lookup), Reading Coach, PDF export, progress tracking |
| **ChatWidget** | Floating chat assistant powered by Gemini |
| **BrainstormingScreen** | Voice-based brainstorming with LiveCoachSession (Gemini Live API) |
| **TrackingView** | Reading journal: badges, skills, timeline (currently uses mock data) |
| **ColoringBookGenerator** | Generates coloring pages via Gemini and exports PDF |

### Application States

```typescript
enum AppState {
  HOME,             // Tabbed home (Home, Create Story, Learn Topic, Coloring, Library, Journal)
  BRAINSTORMING,    // Voice brainstorming
  GENERATING_STORY, // Loading story generation
  READING           // Viewing a story
}
```

### Services Layer

| Service | Responsibility |
|---------|----------------|
| **geminiService** | Story generation, image generation, TTS, word lookup, chat, reading analysis, coloring images |
| **storageService** | Google Drive/Apps Script storage, library cache, progress persistence |
| **pdfService** | PDF export for stories and coloring books (jsPDF) |
| **liveCoachService** | Real-time voice coaching via Gemini Live API |
| **firebase** | Firebase integration (currently disabled) |

### Data Flow

1. **Story creation:** `StoryForm` → `handleCreateStory` → `geminiService.generateStoryStructure` → `generateImageForPage` → `generateSpeech` → `StoryReader`
2. **Storage:** `storageService` → Google Apps Script (Web App URL) → Google Drive/Sheets
3. **API:** Gemini API key from `localStorage` (paid mode) or `GEMINI_API_KEY` env (default)

### Architecture Notes

- **State:** Centralized in `App.tsx` (~80+ state variables)
- **Styling:** Tailwind CSS with custom animations
- **Icons:** Lucide React
- **Backend:** Google Apps Script for storage (no Node backend server)
- **AI:** Google Gemini (text, image, voice)
