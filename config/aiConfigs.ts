/**
 * AI CONFIGURATION
 * 
 * Centralized settings for AI models and provider configurations.
 */

export const AI_CONFIG = {
    // Default model for most tasks (Synthesis, Generation, Analysis)
    defaultModel: 'gemini-3-flash-preview',

    // Model specifically for high-reliability extraction tasks
    extractionModel: 'gemini-3-flash-preview',

    // Model for image generation/reasoning
    visionModel: 'gemini-2.0-flash-exp-image-01',

    // Alternative models for specific use cases
    models: {
        flash: 'gemini-3-flash-preview',
        pro: 'gemini-1.5-pro',
        vision: 'gemini-1.5-flash',
        ultra: 'gemini-2.0-flash-lite'
    },

    // Models to show in UI selectors
    displayModels: [
        { id: 'gemini-3-flash-preview', label: 'GEMINI 3 FLASH PREVIEW ⚡' },
        { id: 'gemini-1.5-pro', label: 'GEMINI 1.5 PRO (SMART)' },
        { id: 'gemini-1.5-flash', label: 'GEMINI 1.5 FLASH (STABLE)' },
        { id: 'gemini-2.0-flash-lite', label: 'GEMINI 2.0 FLASH LITE (FAST)' },
        { id: 'gemini-2.5-flash-latest', label: 'GEMINI 2.5 FLASH' },
        { id: 'gemini-3-pro', label: 'GEMINI 3 PRO' }
    ],

    // Model settings
    settings: {
        temperature: 0.1, // Low for consistency
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048
    }
} as const;
