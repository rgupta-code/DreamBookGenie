
export interface StoryPage {
  page_number: number;
  text: string;
  image_prompt: string;
  imageUrl?: string; // Generated URL (Base64)
  audioUrl?: string; // Blob URL (Temporary)
  audioBase64?: string; // Persistent storage
}

export interface StoryThemeColors {
  primary: string;
  secondary: string;
}

export interface Story {
  id?: string; // Unique ID for storage
  createdAt?: number; // Timestamp
  title: string;
  theme_colors: StoryThemeColors;
  pages: StoryPage[];
  characterImage?: string; // Base64 string of the uploaded photo
  characterDescription?: string; // Generated visual description for consistency
  mode?: 'story' | 'learning'; // Saved mode
  ageGroup?: string; // Target age group for styling
  voiceGender?: 'male' | 'female';
  voiceTone?: string;
  language?: string; // e.g., 'en-US', 'es-ES'
  // Metadata for Firestore
  characterName?: string;
  topic?: string;
  style?: string;
  pageCount?: number;
}

export interface StoryRequest {
  topic: string;
  characterName: string;
  characterDescription: string;
  style: string;
  characterImage?: string; // Base64 string
  ageGroup: string;
  mode: 'story' | 'learning';
  voiceGender: 'male' | 'female';
  voiceTone: string;
  pageCount: number;
}

export enum AppState {
  HOME = 'HOME',
  BRAINSTORMING = 'BRAINSTORMING',
  GENERATING_STORY = 'GENERATING_STORY',
  READING = 'READING',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Interface for tracking child's reading progress over time
 */
export interface ProgressEntry {
  id: string;
  date: number;
  summary: string;
  practiceTopic: string;
  booksRead: string[];
}
