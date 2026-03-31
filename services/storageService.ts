
import { Story, ProgressEntry } from "../types";

const URL_KEY = 'magic_storybook_script_url';
const LIBRARY_CACHE_KEY = 'magic_storybook_library_cache';

const getDefaultUrl = () => (import.meta as any).env.VITE_DEFAULT_SCRIPT_URL || "";

export const isConfigured = () => !!(localStorage.getItem(URL_KEY) || getDefaultUrl());
export const hasCustomUrl = () => !!localStorage.getItem(URL_KEY);
export const getStoredUrl = () => localStorage.getItem(URL_KEY) || getDefaultUrl();

const formatDriveUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    try {
        // Check if it's a Google Drive URL that needs formatting
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
             // If it's already a view link (lh3), leave it
             if (url.includes('lh3.googleusercontent.com')) return url;

             let id = '';
             // Pattern 1: /file/d/ID/view
             if (url.includes('/file/d/')) {
                 const parts = url.split('/file/d/');
                 if (parts.length > 1) {
                     id = parts[1].split('/')[0];
                 }
             } 
             // Pattern 2: id=ID
             else if (url.includes('id=')) {
                 const match = url.match(/id=([a-zA-Z0-9_-]+)/);
                 if (match) id = match[1];
             }

             if (id) {
                 // Use lh3.googleusercontent.com/d/ID for direct image access
                 return `https://lh3.googleusercontent.com/d/${id}`;
             }
        }
    } catch (e) {
        console.warn("Error formatting Drive URL", e);
    }
    return url;
};

const updateStoryCache = (stories: Story[]) => {
    try {
        // Cache only the latest 5 stories to avoid localStorage quota limits
        // Aggressively strip all large data (base64 images, audio)
        const toCache = stories.slice(0, 5).map(s => ({
            ...s,
            characterImage: undefined, // Remove character image
            pages: s.pages.map(p => ({
                ...p,
                audioUrl: undefined, 
                audioBase64: undefined,
                imageUrl: undefined // Remove all page images including cover
            }))
        }));
        localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(toCache));
    } catch (e) {
        console.warn("Failed to update library cache", e);
    }
};

export const getCachedStories = (): Story[] => {
    try {
        const cached = localStorage.getItem(LIBRARY_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    } catch (e) {
        return [];
    }
};

export const configureDrive = (url: string) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.includes("script.google.com")) {
        throw new Error("Invalid URL. It should be a Google Apps Script URL.");
    }
    if (cleanUrl.endsWith('/edit')) {
        throw new Error("Please use the Web App URL (ends in /exec), not the editor URL.");
    }
    if (!cleanUrl.includes('/exec')) {
        throw new Error("URL must contain '/exec'. Did you copy the Web App URL?");
    }
    localStorage.setItem(URL_KEY, cleanUrl);
    localStorage.removeItem(LIBRARY_CACHE_KEY); // Clear cache on new connection
    window.dispatchEvent(new Event('magic_drive_config_updated'));
};

export const disconnectDrive = () => {
    localStorage.removeItem(URL_KEY);
    localStorage.removeItem(LIBRARY_CACHE_KEY); // Clear cache on disconnect
    window.dispatchEvent(new Event('magic_drive_config_updated'));
};

export const testConnection = async (url: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const pingUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping`;
        const response = await fetch(pingUrl, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'application/json' },
            redirect: 'follow',
            credentials: 'omit'
        });
        
        if (response.status === 401 || response.status === 403) {
            return { success: false, message: "Permission Denied: Ensure 'Who has access' is set to 'Anyone' in your script deployment." };
        }
        
        if (!response.ok) return { success: false, message: `Server error: ${response.status}` };
        
        const text = await response.text();
        const json = JSON.parse(text); 
        return json.success ? { success: true } : { success: false, message: json.error || "Unknown error" };
    } catch (e: any) {
        if (e.message === "Failed to fetch") {
            return { success: false, message: "Connection blocked. Check your Script URL and ensure it's deployed as a Web App to 'Anyone'." };
        }
        return { success: false, message: e.message || "Connection failed." };
    }
};

export const saveStoryToLibrary = async (story: Story, skipDrive: boolean = false): Promise<Story> => {
    const url = getStoredUrl();
    
    const storyToSave: Story = { 
        ...story, 
        id: story.id || crypto.randomUUID(), 
        createdAt: story.createdAt || Date.now(),
        pages: story.pages.map(p => ({ ...p, audioUrl: undefined }))
    };

    // Optimistically update cache
    try {
        const currentCache = getCachedStories();
        // Remove existing version if any, add new to top
        const newCache = [storyToSave, ...currentCache.filter(s => s.id !== storyToSave.id)].slice(0, 5);
        updateStoryCache(newCache);
    } catch (e) { console.error("Cache update error", e); }

    if (!url || skipDrive) {
        // Return local version if no URL is configured or if skipping drive
        return storyToSave;
    }

    try {
        // Save to Drive
        const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain', 'Accept': 'application/json' },
                body: JSON.stringify({ action: 'save', story: storyToSave }),
                redirect: 'follow',
                credentials: 'omit'
            });

        if (response.status === 401 || response.status === 403) {
            throw new Error("Permission Denied: Check your Google Script deployment settings (must be 'Anyone').");
        }

        const text = await response.text();
        const result = JSON.parse(text);
        if (result.error) throw new Error(result.error);
        return storyToSave;
    } catch (e: any) {
        if (e.message === "Failed to fetch") {
            throw new Error("Could not reach your library. Check your Script URL.");
        }
        throw e;
    }
};

export const getAllStories = async (): Promise<Story[]> => {
    const url = getStoredUrl();
    
    if (!url) {
        // Return cached stories if no URL is configured
        return getCachedStories();
    }
    
    try {
        const response = await fetch(url, { credentials: 'omit' });
        if (!response.ok) throw new Error("Failed to fetch library");
        
        const json = await response.json();
        const stories = json.stories || [];
        
        // Transform Drive URLs
        const processedStories = stories.map((s: Story) => ({
            ...s,
            characterImage: formatDriveUrl(s.characterImage),
            pages: s.pages.map(p => ({
                ...p,
                imageUrl: formatDriveUrl(p.imageUrl),
                audioBase64: p.audioBase64 // Keep the voice data!
            }))
        }));

        // Update local cache with fresh data from cloud
        if (processedStories.length > 0) {
            updateStoryCache(processedStories);
        }

        return processedStories;
    } catch (e) {
        // Library fetch failed, relying on cache/state
        return getCachedStories();
    }
};

export const deleteStory = async (id: string): Promise<void> => {
    // Optimistically update cache
    try {
        const currentCache = getCachedStories();
        const newCache = currentCache.filter(s => s.id !== id);
        updateStoryCache(newCache);
    } catch (e) { console.error("Cache update error", e); }

    const url = getStoredUrl();
    if (!url) {
        return;
    }

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'delete', id }),
            credentials: 'omit'
        });
    } catch (e) {}
};

export const getAllProgress = async (): Promise<ProgressEntry[]> => {
    const url = getStoredUrl();
    if (!url) {
        return [];
    }
    try {
        const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}action=getProgress`, { credentials: 'omit' });
        const json = await response.json();
        return json.progress || [];
    } catch (e) { return []; }
};

export const saveProgressToLibrary = async (progress: ProgressEntry): Promise<void> => {
    const url = getStoredUrl();
    if (!url) {
        return;
    }
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'saveProgress', progress }),
            credentials: 'omit'
        });
    } catch (e) {}
};
