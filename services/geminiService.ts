import { GoogleGenAI, Type } from "@google/genai";
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

export const getGameDataOfTheDay = async (): Promise<{ word: string, hint: string }> => {
    const dateKey = getGameDateKey();
    const genAI = getAi();
    if (!genAI) {
        const word = selectDeterministicFallback(dateKey);
        const hint = await getWordHint(word);
        return { word, hint };
    }

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `For the date ${dateKey}, generate a single, common, 5-letter English word in lowercase. This must be the same word every time for the same date. Also, generate a short, cryptic, puzzle-like hint for this word. The hint should be a single sentence and must not include the word itself or any of its letters. For example, for 'CLOCK', a good hint is 'I have a face but no eyes, and hands but no arms.'`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        word: {
                            type: Type.STRING,
                            description: "A 5-letter common English word in lowercase."
                        },
                        hint: {
                            type: Type.STRING,
                            description: "A cryptic hint for the word."
                        }
                    }
                }
            }
        });
        
        const jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Empty response from Gemini");

        const data = JSON.parse(jsonStr);
        const { word, hint } = data;

        if (word && word.length === 5 && /^[a-z]{5}$/.test(word) && hint) {
            return { word, hint };
        } else {
            console.error("Gemini did not return valid data, using fallback. Response:", data);
            const fallbackWord = selectDeterministicFallback(dateKey);
            const fallbackHint = await getWordHint(fallbackWord);
            return { word: fallbackWord, hint: fallbackHint };
        }
    } catch (error) {
        console.error("Error fetching game data from Gemini API:", error);
        const fallbackWord = selectDeterministicFallback(dateKey);
        const fallbackHint = await getWordHint(fallbackWord);
        return { word: fallbackWord, hint: fallbackHint };
    }
};