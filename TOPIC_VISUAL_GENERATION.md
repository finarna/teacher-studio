# Topic Visual Generation System

This system uses Gemini AI to automatically generate representative symbols and images for **all subjects** (Math, Physics, Chemistry, Biology), enhancing the visual experience in the Topic Mastery Heatmap.

## Overview

Each topic now has:
1. **Representative Symbol**: Subject-appropriate symbols, formulas, or emojis
   - **Math**: `∫`, `f'(x)`, `sin θ`, `P(A)`
   - **Physics**: `F=ma`, `E=F/q`, `ℏ`, `⚛️`
   - **Chemistry**: `pH`, `⇌`, `Na⁺Cl⁻`, `🧪`
   - **Biology**: `🧬`, `🔬`, `2n→2n`, `🌿`
2. **Representative Image**: AI-generated educational illustrations tailored to each subject

These visuals are:
- Generated once using Gemini AI
- Stored in the database and Supabase Storage
- Displayed in the Topic Mastery Heatmap cards
- Automatically used when topics are loaded
- Subject-aware and contextually appropriate

## Architecture

### Database Schema

**`topics` table** (Master data):
- `representative_symbol` (TEXT): The symbol/emoji/text
- `symbol_type` (TEXT): Type of symbol ('math', 'emoji', 'text')
- `representative_image_url` (TEXT): URL to the AI-generated image

**`topic_resources` table** (User-specific):
- Same fields as above, can override master data if needed

### Files

1. **`utils/topicSymbolGenerator.ts`**
   - `generateTopicSymbol()`: Generates a symbol using Gemini AI
   - `generateTopicImage()`: Generates an image using Gemini AI image generation
   - `generateTopicVisuals()`: Generates both symbol and image
   - `batchGenerateTopicSymbols()`: Batch generation for multiple topics

2. **`migrations/014_add_topic_symbols.sql`**
   - Adds necessary columns to both `topics` and `topic_resources` tables

3. **`scripts/generateTopicImages.ts`**
   - Script to generate visuals for all existing topics
   - Uploads images to Supabase Storage
   - Updates database with generated data

4. **`components/TopicDashboardPage.tsx`**
   - Updated to display images or fallback to symbols
   - Shows images with smooth transitions and error handling

5. **`lib/topicAggregator.ts`**
   - Updated to pull visual data from topics table
   - Passes visual data to TopicResource objects

## Setup

### 1. Apply Database Migration

```bash
# Connect to your Supabase instance
psql <your-supabase-connection-string>

# Run the migration
\i migrations/014_add_topic_symbols.sql
```

### 2. Create Storage Bucket

In Supabase Dashboard:
1. Go to Storage
2. Create a new bucket called `public-assets` (if not exists)
3. Make it public
4. Set permissions for uploads

### 3. Set Environment Variables

Ensure you have:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

## Usage

### Generate Visuals for All Topics

Run the generation script:

```bash
# Install dependencies
npm install

# Run the script
npx tsx scripts/generateTopicImages.ts
```

This will:
1. Fetch all topics from the database
2. For each topic:
   - Generate a representative symbol using Gemini AI
   - Generate a representative image using Gemini AI
   - Upload the image to Supabase Storage
   - Update the topic record with symbol and image URL
3. Show progress and summary

**Note**: This can take time (2s per topic) due to API rate limiting.

### Generate Visuals for New Topics

When creating new topics programmatically:

```typescript
import { generateTopicVisuals } from './utils/topicSymbolGenerator';
import { createClient } from '@supabase/supabase-js';

const geminiApiKey = process.env.VITE_GEMINI_API_KEY!;
const supabase = createClient(...);

// Generate visuals
const visuals = await generateTopicVisuals(
  'Determinants',
  'Math',
  'KCET',
  geminiApiKey
);

// Upload image to storage
const buffer = Buffer.from(visuals.imageBase64, 'base64');
const { data } = await supabase.storage
  .from('public-assets')
  .upload(`topic-images/topic-${topicId}.png`, buffer);

const imageUrl = supabase.storage
  .from('public-assets')
  .getPublicUrl(`topic-images/topic-${topicId}.png`).data.publicUrl;

// Update topic
await supabase
  .from('topics')
  .update({
    representative_symbol: visuals.symbol,
    symbol_type: visuals.symbolType,
    representative_image_url: imageUrl
  })
  .eq('id', topicId);
```

## How It Works

### Symbol Generation

Gemini AI analyzes the topic name and generates an appropriate symbol:

**Examples**:
- Determinants → `|A|`
- Integrals → `∫`
- Derivatives → `f'(x)`
- Trigonometry → `sin θ`
- Probability → `P(A)`
- Vectors → `v⃗`

### Image Generation

Gemini AI generates a clean, minimalist educational illustration:

**Prompt includes**:
- Topic name and subject
- Style requirements (modern, flat design)
- Color requirements (2-3 colors)
- Size requirements (256x256px square)
- Educational context (exam-appropriate)

**Output**: Base64 PNG image

### Display in Heatmap

The Topic Mastery Heatmap:
1. Checks if topic has `representativeImageUrl`
2. If yes, displays the image
3. If no, falls back to `representativeSymbol`
4. If image fails to load, shows symbol as fallback

## Benefits

1. **Visual Recognition**: Students can quickly identify topics by visual cues
2. **Modern UX**: Beautiful, consistent design across all topics
3. **AI-Powered**: Accurate, contextual representations
4. **Automatic**: Generated once, used everywhere
5. **Fallback Support**: Always shows something (symbol if no image)

## Customization

### Change Image Style

Edit the prompt in `utils/topicSymbolGenerator.ts`:

```typescript
const prompt = `Create a clean, minimalist educational icon...
// Add your custom requirements here
`;
```

### Use Different AI Model

Change the model in `generateTopicImage()`:

```typescript
const model = genAI.getGenerativeModel({
  model: 'your-preferred-model' // e.g., gemini-2.5-flash-image
});
```

### Batch Size and Rate Limiting

Adjust in `scripts/generateTopicImages.ts`:

```typescript
// Wait time between requests (default: 2000ms)
await new Promise(resolve => setTimeout(resolve, 2000));
```

## Troubleshooting

### Images Not Showing

1. **Check Database**: Verify `representative_image_url` is populated
2. **Check Storage**: Verify images exist in Supabase Storage
3. **Check Permissions**: Ensure storage bucket is public
4. **Check Console**: Look for image load errors in browser

### Generation Fails

1. **API Key**: Verify `VITE_GEMINI_API_KEY` is set correctly
2. **Rate Limits**: Gemini API has rate limits, script adds delays
3. **Model Access**: Ensure you have access to image generation models
4. **Network**: Check internet connection and API availability

### Symbol Fallbacks Not Working

1. **Check fallbackSymbol()**: Verify logic in `topicSymbolGenerator.ts`
2. **Check Topic Names**: Ensure topic names match expected keywords
3. **Default Symbol**: System uses `📐` as ultimate fallback

## Future Enhancements

- [ ] Regenerate images button in admin panel
- [ ] Custom image upload for topics
- [ ] Image variations for different exam contexts
- [ ] Vector SVG generation instead of PNG
- [ ] Caching and CDN integration
- [ ] Batch regeneration with progress UI

## API Reference

### `generateTopicSymbol()`
Generates a single symbol for a topic.

**Parameters**:
- `topicName` (string): Name of the topic
- `subject` (string): Subject (Math, Physics, etc.)
- `examContext` (string): Exam context (KCET, NEET, etc.)
- `apiKey` (string): Gemini API key

**Returns**: `Promise<TopicSymbol>`

### `generateTopicImage()`
Generates an AI image for a topic.

**Parameters**: Same as above

**Returns**: `Promise<string | null>` (Base64 PNG)

### `generateTopicVisuals()`
Generates both symbol and image.

**Parameters**: Same as above

**Returns**: `Promise<TopicVisuals>`

### `batchGenerateTopicSymbols()`
Batch generates symbols for multiple topics.

**Parameters**:
- `topics` (Array): Array of topic objects
- `apiKey` (string): Gemini API key
- `onProgress` (function): Optional progress callback

**Returns**: `Promise<TopicSymbol[]>`

## License

Part of the EduJourney Universal Teacher Studio platform.
