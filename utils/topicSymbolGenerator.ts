/**
 * Topic Symbol and Image Generator
 * Uses Gemini AI to generate representative symbols and images for topics
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface TopicSymbol {
  symbol: string;
  type: 'math' | 'emoji' | 'text';
}

export interface TopicVisuals {
  symbol: string;
  symbolType: 'math' | 'emoji' | 'text';
  imageBase64?: string; // Base64 encoded image
}

/**
 * Generate a representative symbol for a topic using Gemini AI
 * @param topicName The name of the topic
 * @param subject The subject (Math, Physics, Chemistry, Biology)
 * @param examContext The exam context (KCET, NEET, JEE, CBSE)
 * @param apiKey Gemini API key
 * @returns TopicSymbol object with symbol and type
 */
export async function generateTopicSymbol(
  topicName: string,
  subject: string,
  examContext: string,
  apiKey: string
): Promise<TopicSymbol> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview'
    });

    const prompt = `You are an expert in ${subject} education for ${examContext} exams.

For the topic "${topicName}", provide a SINGLE, CLEAR visual representation that best captures the essence of this topic.

Rules:
1. Choose ONE of the following types:
   - 'math': Mathematical notation, formulas, or scientific symbols
   - 'emoji': A relevant emoji that represents the concept
   - 'text': A short text representation (2-3 characters max)

2. The symbol MUST be:
   - Instantly recognizable
   - Commonly used in ${subject}
   - Specific to "${topicName}"
   - Clear when displayed in a small space (64x64 pixels)

3. Examples of GOOD symbols by subject:

MATHEMATICS:
   - Determinants → |A|
   - Matrices → [A]
   - Integrals → ∫
   - Vectors → v→
   - Trigonometry → sin θ
   - Inverse Trigonometric Functions → sin⁻¹
   - Probability → P(A)
   - Derivatives → f'(x)
   - Applications of Derivatives → max/min
   - Applications of Integrals → ∫A
   - Differential Equations → dy/dx
   - Continuity and Differentiability → ε-δ
   - Three Dimensional Geometry → (x,y,z)
   - Linear Programming → max Z

PHYSICS:
   - Newton's Laws → F=ma
   - Kinematics → v=u+at
   - Energy → W=Fd
   - Electric Field → E=F/q
   - Magnetic Field → B⃗
   - Thermodynamics → Q=mcΔT
   - Quantum → ℏ
   - Nuclear → ⚛️

CHEMISTRY:
   - Mole Concept → n=m/M
   - pH → pH
   - Redox → e⁻
   - Equilibrium → ⇌
   - Organic Chemistry → 🧪
   - Ionic Bonding → Na⁺Cl⁻
   - Hydrocarbons → CₙH₂ₙ
   - Thermochemistry → ΔH

BIOLOGY:
   - DNA/RNA → 🧬
   - Cell → 🔬
   - Photosynthesis → ☀️→C₆H₁₂O₆
   - Mitosis → 2n→2n
   - Genetics → Aa×Aa
   - Evolution → 🦎
   - Ecology → 🌿
   - Nervous System → 🧠

4. Respond ONLY in this JSON format (no markdown, no extra text):
{"symbol": "your_symbol_here", "type": "math"}

Generate the symbol now:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = response;
    if (response.includes('```json')) {
      cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (response.includes('```')) {
      cleanedResponse = response.replace(/```\n?/g, '').trim();
    }

    // Parse JSON response
    const parsed: TopicSymbol = JSON.parse(cleanedResponse);

    // Validate response
    if (!parsed.symbol || !parsed.type) {
      throw new Error('Invalid response from Gemini AI');
    }

    if (!['math', 'emoji', 'text'].includes(parsed.type)) {
      parsed.type = 'math'; // Default to math if invalid type
    }

    return parsed;
  } catch (error) {
    console.error(`Error generating symbol for topic "${topicName}":`, error);

    // Fallback: Return a default symbol based on topic name
    return getFallbackSymbol(topicName);
  }
}

/**
 * Get a fallback symbol when AI generation fails
 * Minimal fallbacks - AI should handle most cases
 */
function getFallbackSymbol(topicName: string): TopicSymbol {
  const lowerTopic = topicName.toLowerCase();

  // Only essential fallbacks - let AI decide the rest
  if (lowerTopic.includes('integral')) return { symbol: '∫', type: 'math' };
  if (lowerTopic.includes('derivative')) return { symbol: "f'(x)", type: 'math' };
  if (lowerTopic.includes('matrix')) return { symbol: '[A]', type: 'math' };
  if (lowerTopic.includes('determinant')) return { symbol: '|A|', type: 'math' };
  if (lowerTopic.includes('vector')) return { symbol: 'v→', type: 'math' };
  if (lowerTopic.includes('probability')) return { symbol: 'P(A)', type: 'math' };

  // Subject-based defaults
  if (lowerTopic.includes('chemistry') || lowerTopic.includes('chemical')) return { symbol: '🧪', type: 'emoji' };
  if (lowerTopic.includes('biology') || lowerTopic.includes('cell')) return { symbol: '🔬', type: 'emoji' };
  if (lowerTopic.includes('dna') || lowerTopic.includes('gene')) return { symbol: '🧬', type: 'emoji' };
  if (lowerTopic.includes('physics') || lowerTopic.includes('electric')) return { symbol: '⚡', type: 'emoji' };

  // Ultimate fallback
  return { symbol: '📚', type: 'emoji' };
}

/**
 * Batch generate symbols for multiple topics
 * @param topics Array of topic objects with name, subject, and examContext
 * @param apiKey Gemini API key
 * @param onProgress Optional callback for progress updates
 * @returns Array of TopicSymbol objects
 */
export async function batchGenerateTopicSymbols(
  topics: Array<{ name: string; subject: string; examContext: string }>,
  apiKey: string,
  onProgress?: (current: number, total: number) => void
): Promise<TopicSymbol[]> {
  const results: TopicSymbol[] = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const symbol = await generateTopicSymbol(
      topic.name,
      topic.subject,
      topic.examContext,
      apiKey
    );
    results.push(symbol);

    // Call progress callback
    if (onProgress) {
      onProgress(i + 1, topics.length);
    }

    // Rate limiting: wait 1 second between requests to avoid hitting API limits
    if (i < topics.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Generate a visual image for a topic using Gemini AI image generation
 * @param topicName The name of the topic
 * @param subject The subject (Math, Physics, Chemistry, Biology)
 * @param examContext The exam context (KCET, NEET, JEE, CBSE)
 * @param apiKey Gemini API key
 * @returns Base64 encoded PNG image
 */
export async function generateTopicImage(
  topicName: string,
  subject: string,
  examContext: string,
  apiKey: string
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini's image generation model
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview' // Image generation model
    });

    const prompt = `Create a clean, minimalist educational icon/illustration representing the ${subject} topic: "${topicName}"

Requirements:
- Style: Modern, flat design with clean lines
- Colors: Use 2-3 complementary colors maximum
- Background: White or transparent
- Focus: The core concept of "${topicName}"
- Size: Square aspect ratio (suitable for 256x256px display)
- Detail level: Simple and clear, recognizable at small sizes
- Educational: Should be appropriate for ${examContext} exam students

The image should be instantly recognizable and help students visually identify this topic.

Examples of good representations by subject:

MATHEMATICS:
- Determinants: Matrix with det() notation
- Integrals: Integration symbol with curve
- Applications of Integrals: Area under curve or volume of revolution
- Vectors: Arrow with coordinate axes
- Trigonometry: Unit circle or triangle with angles
- Inverse Trigonometric Functions: Arc with angle measurement
- Probability: Dice, coins, or probability tree
- Differential Equations: Graph with tangent lines
- Applications of Derivatives: Curve with max/min points marked
- Continuity and Differentiability: Graph showing continuous curve with tangent
- Three Dimensional Geometry: 3D coordinate system with axes
- Linear Programming: Feasible region with constraint lines
- Matrices: Grid of numbers in matrix form

PHYSICS:
- Newton's Laws: Force diagram with arrows
- Kinematics: Position-time graph
- Energy: Springs or pendulum
- Electric Field: Charges with field lines
- Optics: Ray diagram with lenses
- Waves: Sine wave pattern
- Thermodynamics: Heat flow diagram

CHEMISTRY:
- Periodic Table: Grid with element blocks
- Mole Concept: Molecular diagram
- Chemical Bonding: Atoms with electrons
- pH: pH scale gradient
- Organic Chemistry: Benzene ring structure
- Redox: Electron transfer arrows
- Equilibrium: Double arrows with molecules

BIOLOGY:
- DNA/RNA: Double helix structure
- Cell: Simple cell diagram with organelles
- Photosynthesis: Leaf with sun and chloroplast
- Mitosis: Cell division stages
- Genetics: Punnett square
- Evolution: Species progression
- Ecology: Food chain or ecosystem
- Human Systems: Organ diagrams

Generate a professional, educational illustration now.`;

    const result = await model.generateContent([prompt]);
    const response = result.response;

    // Extract image data from response
    if (response && response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data; // Return base64 image data
          }
        }
      }
    }

    console.warn(`No image generated for topic "${topicName}"`);
    return null;
  } catch (error) {
    console.error(`Error generating image for topic "${topicName}":`, error);
    return null;
  }
}

/**
 * Generate both symbol and image for a topic
 * @param topicName The name of the topic
 * @param subject The subject (Math, Physics, Chemistry, Biology)
 * @param examContext The exam context (KCET, NEET, JEE, CBSE)
 * @param apiKey Gemini API key
 * @returns TopicVisuals object with symbol, type, and optional image
 */
export async function generateTopicVisuals(
  topicName: string,
  subject: string,
  examContext: string,
  apiKey: string
): Promise<TopicVisuals> {
  // Generate symbol first (faster)
  const symbolData = await generateTopicSymbol(topicName, subject, examContext, apiKey);

  // Then generate image (slower)
  const imageBase64 = await generateTopicImage(topicName, subject, examContext, apiKey);

  return {
    symbol: symbolData.symbol,
    symbolType: symbolData.type,
    imageBase64: imageBase64 || undefined
  };
}
