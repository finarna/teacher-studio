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
    visionModel: 'gemini-3-flash-preview',

    // Alternative models for specific use cases
    models: {
        flash: 'gemini-3-flash-preview',
        pro: 'gemini-3-pro',
        vision: 'gemini-3-flash-preview',
        ultra: 'gemini-3-pro',
        exp: 'gemini-2.0-pro-exp'
    },

    // Models to show in UI selectors
    displayModels: [
        { id: 'gemini-3-flash-preview', label: 'GEMINI 3 FLASH PREVIEW ⚡ (DEFAULT)' },
        { id: 'gemini-3-flash-preview-001', label: 'GEMINI 2.0 FLASH (FAST)' },
        { id: 'gemini-1.5-pro', label: 'GEMINI 1.5 PRO (SMART)' },
        { id: 'gemini-3-pro', label: 'GEMINI 3 PRO (QUALITY)' },
        { id: 'gemini-2.0-pro-exp', label: 'GEMINI 2.0 PRO EXP' }
    ],

    // Model settings
    settings: {
        temperature: 0.1, // Low for consistency
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048
    }
} as const;
