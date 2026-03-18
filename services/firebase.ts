import { Story, ProgressEntry } from "../types";

// Firebase features are disabled as requested
let db: any = null;

const STORIES_COLLECTION = "stories";
const PROGRESS_COLLECTION = "progress";

// Helper to remove undefined fields and handle nested arrays
const sanitizeForFirestore = (obj: any): any => {
    return obj;
};

export const saveStoryToFirestore = async (story: Story): Promise<Story> => {
    // Ensure story has an ID
    const storyToSave = { ...story };
    if (!storyToSave.id) {
        storyToSave.id = crypto.randomUUID();
    }
    return storyToSave;
};

export const getStoriesFromFirestore = async (): Promise<Story[]> => {
    return [];
};

export const deleteStoryFromFirestore = async (id: string): Promise<void> => {
    return;
};

export const saveProgressToFirestore = async (progress: ProgressEntry): Promise<void> => {
    return;
};

export const getProgressFromFirestore = async (): Promise<ProgressEntry[]> => {
    return [];
};

export const testFirebaseConnection = async (): Promise<boolean> => {
    return false;
};

export const writeTestDocument = async (): Promise<{ success: boolean; message?: string }> => {
    return { success: false, message: "Firebase is disabled" };
};

export const saveBookMetadataToFirestore = async (story: Story): Promise<void> => {
    return;
};
