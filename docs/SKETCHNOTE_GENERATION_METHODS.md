# Sketchnote Generation Methods

This document explains the three different methods available for generating visual sketchnotes in the application.

## Overview

The application supports multiple AI-powered generation methods, allowing you to choose between programmatic SVG diagrams and realistic hand-drawn style images.

## Available Methods

### 1. SVG (Programmatic) 🎨

**Model**: `gemini-2.0-flash-exp`
**Output**: Scalable Vector Graphics

**Pros:**
- ✅ Scalable to any size without quality loss
- ✅ Crisp and sharp at all resolutions
- ✅ Small file size
- ✅ Editable and customizable
- ✅ Perfect for scientific diagrams

**Cons:**
- ❌ Looks programmatic, not hand-drawn
- ❌ Less engaging visually

**Best For:**
- Technical diagrams
- Scientific illustrations
- Mathematical graphs
- Circuit diagrams
- When file size matters

---

### 2. Gemini 3 Pro Image ⭐ (RECOMMENDED)

**Model**: `gemini-3-pro-image-preview`
**Output**: High-resolution realistic images

**Pros:**
- ✅ **Highest quality** output
- ✅ **Advanced text rendering** - Perfect for formulas and labels
- ✅ High-resolution options (1K, 2K, 4K)
- ✅ Google Search grounding for accuracy
- ✅ Hand-drawn sketchnote aesthetic
- ✅ Professional educational style

**Cons:**
- ❌ Slower generation time
- ❌ Higher cost per image
- ❌ Larger file sizes

**Best For:**
- **Final production sketchnotes**
- Content with complex formulas
- Detailed scientific diagrams
- When quality is paramount
- Educational content requiring professional polish

**Pricing**: Higher tier pricing (check Google AI pricing)

---

### 3. Gemini 2.5 Flash Image ⚡

**Model**: `gemini-2.5-flash-image`
**Output**: Fast, good-quality realistic images

**Pros:**
- ✅ Fast generation speed
- ✅ Cost-effective
- ✅ Good quality output
- ✅ Hand-drawn aesthetic
- ✅ Suitable for bulk generation

**Cons:**
- ❌ Lower quality than Pro model
- ❌ Simpler text rendering
- ❌ Less detail in complex diagrams

**Best For:**
- Rapid prototyping
- Bulk generation
- Testing concepts
- Cost-sensitive projects
- Simpler visuals without heavy text

**Pricing**: Mid-tier pricing

---

### 4. Imagen 3 📸 (CURRENTLY DISABLED)

**Status**: ⚠️ Not Available

**Model**: `imagen-3.0-generate-002`
**Output**: High-fidelity realistic images

**Why Disabled:**
- ❌ Not yet accessible via Gemini API
- ❌ Returns 404 errors and CORS issues
- ❌ API endpoint structure not finalized by Google

**Note**: This method will be re-enabled once Google makes Imagen 3 available through the Gemini API. Currently, the endpoint returns errors and is not functional.

**Alternative**: Use **Gemini 3 Pro Image ⭐** instead - it provides better quality for educational content with advanced text rendering.

---

## Comparison Table

| Feature | SVG | Gemini 3 Pro Image | Gemini 2.5 Flash |
|---------|-----|-------------------|------------------|
| **Quality** | High (vector) | Best | Good |
| **Speed** | Fast | Slow | Very Fast |
| **Cost** | Low | High | Medium |
| **Text Rendering** | Excellent | Best | Good |
| **Hand-drawn Style** | ❌ | ✅ | ✅ |
| **Scalability** | Perfect | Good | Good |
| **File Size** | Smallest | Large | Medium |
| **Formula Support** | Excellent | Best | Good |
| **Availability** | ✅ Active | ✅ Active | ✅ Active |

---

## How to Use

### In the UI

1. Navigate to the **Visual Blueprint** section in Sketch Gallery
2. Find the **"Generation Method"** dropdown in the top controls
3. Select your preferred method:
   - **SVG (Programmatic)** - Default method
   - **Gemini 3 Pro Image ⭐** - Best quality (recommended)
   - **Gemini 2.5 Flash Image** - Fast & balanced
4. Click **"Sync Sketch"** on any question card or **"Generate All"** for bulk generation

### Programmatically

```typescript
import { generateSketch, GenerationMethod } from '../utils/sketchGenerators';

const result = await generateSketch(
  'gemini-3-pro-image', // method
  'Newton\'s Laws of Motion', // topic
  'Explain the three laws...', // question text
  'Physics', // subject
  apiKey, // your API key
  (status) => console.log(status) // optional status callback
);

// result.imageData - Base64 data URL or SVG string
// result.isSvg - true if SVG, false if image
// result.blueprint - Pedagogical content (notes, formulas, tips, etc.)
```

---

## Hybrid Approach (Two-Step Generation)

All image-based methods use a **hybrid approach**:

### Step 1: Generate Pedagogical Content
Uses `gemini-2.0-flash-exp` with JSON schema to generate:
- Visual concept title
- Detailed first-principles notes
- Memory anchors (metaphors)
- Procedural logic (step-by-step)
- Key formulas (LaTeX)
- Exam tips
- Common pitfalls
- **Image description** (for image generators)

### Step 2: Generate Visual
Uses the selected image model to create the visual based on:
- The pedagogical content from Step 1
- Subject and topic context
- Style requirements for educational sketchnotes

This ensures you get **both** structured learning content **and** beautiful visuals.

---

## Recommendations by Use Case

### For Board Exam Students (Production)
**Use**: Gemini 3 Pro Image ⭐
- Best quality for studying
- Clear formula rendering
- Professional appearance

### For Teachers Creating Study Materials
**Use**: Gemini 3 Pro Image ⭐ or SVG
- Pro Image for final materials
- SVG for editable diagrams

### For Bulk Generation / Testing
**Use**: Gemini 2.5 Flash Image
- Fast enough for batches
- Good enough quality
- Cost-effective

### For Technical Diagrams Only
**Use**: SVG
- Perfect for circuits, graphs
- Editable for customization
- Best clarity

---

## API Configuration

Make sure your `.env.local` file has:

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

All methods use the same API key but route to different models.

---

## Caching

Generated sketches are cached using the pattern:
```
sketch_{method}_{scanId}_{questionId}
```

This allows you to experiment with different methods without losing previous generations.

---

## Troubleshooting

### Image Generation Fails
- Check API key is valid
- Ensure the model name is correct
- Check Google AI Studio for model availability
- Some models may have regional restrictions

### Low Quality Output
- Try Gemini 3 Pro Image for best results
- Ensure prompts include sufficient context
- Check that formulas are in LaTeX format

### Slow Generation
- Use Gemini 2.5 Flash for faster results
- Consider batch processing during off-peak hours
- Use SVG for instant generation

---

## Future Enhancements

Potential improvements:
- Style presets (minimalist, detailed, colorful, etc.)
- Custom aspect ratios
- Batch generation with mixed methods
- A/B testing of methods
- Quality comparison view
- Cost tracking per method

---

## Sources & Documentation

- [Gemini 3 Pro Image Documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image)
- [Gemini 2.5 Flash Image Blog](https://developers.googleblog.com/introducing-gemini-2-5-flash-image/)
- [Imagen 3 in Gemini API](https://ai.google.dev/gemini-api/docs/imagen)
- [Nano Banana Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)

---

**Last Updated**: January 2026
**Version**: 1.0
