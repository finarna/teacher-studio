import { GoogleGenAI } from "@google/genai";

/**
 * Common Gemini Client Utility for Vertex AI
 * 
 * This consolidates the new @google/genai SDK configuration
 * to ensure vertexai=true is used everywhere for billing/credits.
 */

// Helper to get environment variables across Vite and Node.js
export const getEnv = (name: string) => {
  // Check Node.js process.env
  if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env) {
    if ((globalThis as any).process.env[name]) return (globalThis as any).process.env[name];
    // Fallback for VITE_ prefix in Node
    if (name.startsWith('VITE_') && (globalThis as any).process.env[name.substring(5)]) return (globalThis as any).process.env[name.substring(5)];
  }
  // Check Vite import.meta.env
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[name]) return metaEnv[name];
  } catch (e) {
    // import.meta might not be available in all environments
  }
  return undefined;
};

const isBrowser = typeof window !== 'undefined';

// Helper to trim quotes and whitespace
const cleanEnv = (val: any) => {
  if (typeof val !== 'string') return val;
  return val.replace(/^["']|["']$/g, '').trim();
};

export const getGeminiClient = (apiKey?: string) => {
  // Try various keys: provided, VITE_GEMINI_API_KEY, then GEMINI_API_KEY
  const key = cleanEnv(apiKey || getEnv('VITE_GEMINI_API_KEY') || getEnv('GEMINI_API_KEY'));

  // Try various project/location keys
  const project = cleanEnv(getEnv('VITE_VERTEX_PROJECT') || getEnv('VERTEX_PROJECT') || "usdproj");
  const location = cleanEnv(getEnv('VITE_VERTEX_LOCATION') || getEnv('VERTEX_LOCATION') || "us-central1");

  if (!key) {
    console.warn("⚠️ [GEMINI_CLIENT] No API Key provided. Will rely on Application Default Credentials (ADC) if in Node.");
  }

  // 🚨 VERTEX AI vs AI STUDIO LOGIC:
  // Vertex AI Platform (aiplatform.googleapis.com) DOES NOT support API Key authentication in the browser.
  // It only supports OAuth2 tokens (Service Accounts/User Auth).
  // Using an API Key with `vertexai: true` results in a 401 (Unauthorized).
  //
  // SOLUTION: To use your $300 credits with an API Key, we must use `vertexai: false` (AI Studio Endpoint).
  // As long as the API Key was created in the "usdproj" Google Cloud project, it will bill to your credits.
  const options: any = {
    vertexai: (isBrowser && key) ? false : true 
  };

  if (key) {
    options.apiKey = key;
  } else {
    options.project = project;
    options.location = location;
  }

  const client = new GoogleGenAI(options);

  // Wrap generateContent to handle model path expansion correctly for the chosen endpoint
  const originalModels = client.models;
  const wrapFunc = (fn: any) => {
    return async (params: any) => {
      let model = params.model || "";
      const currentVertex = options.vertexai;

      // Handle model path expansion
      if (typeof model === 'string' && !model.includes('/')) {
        if (currentVertex) {
          model = `projects/${project}/locations/${location}/publishers/google/models/${model}`;
        } else {
          model = `models/${model}`;
        }
        console.debug(`🌐 [GEMINI_CLIENT] Path adjusted: ${model} (Vertex: ${currentVertex})`);
      } else if (typeof model === 'string' && model.startsWith('projects/') && !currentVertex) {
        // Strip project path if we switched to AI Studio mode
        model = `models/${model.split('/').pop()}`;
        console.debug(`🌐 [GEMINI_CLIENT] Path stripped for AI Studio: ${model}`);
      }
      
      return await fn.call(originalModels, { ...params, model });
    };
  };

  (client.models as any).generateContent = wrapFunc(originalModels.generateContent);
  (client.models as any).generateContentStream = wrapFunc(originalModels.generateContentStream);

  console.log(`📡 [GEMINI_CLIENT] Initialized for ${isBrowser ? 'Browser' : 'Node.js'} | VertexAI: ${options.vertexai} | Project: ${project}`);

  return client;
};

/**
 * Helper for generating content with standard Vertex AI parameters
 */
export const generateGeminiContent = async (
  client: any,
  modelName: string,
  contents: any[],
  config: any = {}
) => {
  const startTime = Date.now();
  console.log(`📤 [GEMINI_CONTENT] Starting generation with ${modelName}...`);

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 65536,
        ...config
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`📥 [GEMINI_CONTENT] Generation complete (${duration}s). Result length: ${response.text?.length || 0} chars.`);
    return response;
  } catch (error: any) {
    console.error(`❌ [GEMINI_CONTENT] Error after ${((Date.now() - startTime) / 1000).toFixed(1)}s:`, error.message);
    throw error;
  }
};

/**
 * Common Retry wrapper with exponential backoff
 */
export const withGeminiRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorText = error?.message || error?.stack || "";

      // Standardize error checks
      const isQuota = errorText.includes("429") || errorText.includes("QUOTA_EXCEEDED");
      const isModelNotFound = errorText.includes("404");

      if (isQuota) {
        console.error("🚨 [GEMINI_CLIENT] Quota Exceeded (429). Check Vertex AI billing.");
        if (i === maxRetries - 1) throw error;
      }
      if (isModelNotFound) {
        console.error("🚨 [GEMINI_CLIENT] Model not found (404). Check Vertex AI project configuration.");
        throw error;
      }

      onRetry?.(i + 1, error);
      const wait = Math.pow(2, i) * 2000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  throw lastError;
};
