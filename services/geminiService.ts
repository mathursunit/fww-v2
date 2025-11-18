import { GoogleGenAI } from "@google/genai";
import { getGameDateKey } from '../utils/dateUtils';

const FALLBACK_WORDS = ['REACT', 'WORLD', 'HELLO', 'GREAT', 'PARTY', 'HOUSE', 'CHAIR', 'MUSIC', 'WATER', 'EARTH'];

let ai: GoogleGenAI | null = null;
const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            console.warn("API_KEY environment variable not set. Using fallback words.");
            return null;
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

const selectDeterministicFallback = (dateKey: string): string => {
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
        const char = dateKey.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % FALLBACK_WORDS.length;
    return FALLBACK_WORDS[index];
}

export const getWordOfTheDay = async (): Promise<string> => {
    const dateKey = getGameDateKey();
    const genAI = getAi();
    if (!genAI) {
        return selectDeterministicFallback(dateKey);
    }

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a single, common, 5-letter English word in lowercase for the date ${dateKey}. This must be the same word every time for the same date. Do not include any explanation, punctuation, or formatting. Just the word.`,
        });
        
        const word = response.text?.trim().toLowerCase();

        if (word && word.length === 5 && /^[a-z]{5}$/.test(word)) {
            return word;
        } else {
            console.error("Gemini did not return a valid 5-letter word, using fallback. Response:", response.text);
            return selectDeterministicFallback(dateKey);
        }
    } catch (error) {
        console.error("Error fetching word from Gemini API:", error);
        return selectDeterministicFallback(dateKey);
    }
};

export const getWordHint = async (word: string): Promise<string> => {
    const genAI = getAi();
    if (!genAI) {
        return "Sorry, the hint service is unavailable right now.";
    }

    try {
        const prompt = `Generate a short, cryptic, puzzle-like hint for the 5-letter word "${word.toUpperCase()}". The hint should be a single sentence and must not include the word itself or any of its letters. For example, for 'CLOCK', a good hint is 'I have a face but no eyes, and hands but no arms.'`;
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const hint = response.text?.trim();
        if (hint) {
            return hint;
        } else {
            console.error("Gemini did not return a valid hint, using fallback.", response.text);
            return "A mysterious force prevents a hint from appearing.";
        }
    } catch (error) {
        console.error("Error fetching hint from Gemini API:", error);
        return "A mysterious force prevents a hint from appearing.";
    }
};