# Hybrid Question Architecture

## Problem Statement

The system had two conflicting architectures for storing questions:

1. **Old System** (what Learning Journey expected):
   - Questions in `questions` table
   - Topic mappings in `topic_question_mapping` table

2. **New System** (what BoardMastermind creates):
   - Questions in `scans.analysis_data.questions` (JSON)
   - No topic mappings

This caused:
- ❌ Topics not showing up (only 2 instead of 13 for Biology)
- ❌ Need to manually sync each subject's scans to questions table
- ❌ Potential collision between original and practice questions

## Concrete Solution: Hybrid Architecture

### Two Separate Question Stores

#### 1. Original Scan Questions (Immutable)
- **Location**: `scans.analysis_data.questions` (JSON field)
- **Source**: BoardMastermind PDF extraction
- **Purpose**: Past Year Exam papers (original, never modified)
- **Tagged as**: `source: 'past_year'`
- **Used by**:
  - Past Year Exams page
  - Vault view in ExamAnalysis
  - Topic Dashboard (combined view)

#### 2. Practice Questions (Generated/Editable)
- **Location**: `questions` table (separate rows)
- **Source**: AI-generated for topic practice
- **Purpose**: Topic-wise preparation, custom practice
- **Tagged as**: `source: 'practice'`
- **Used by**:
  - Topic Dashboard practice mode
  - Quiz generation
  - Custom Mock Tests

### How It Works

#### Topic Aggregator (`lib/topicAggregator.ts`)

```typescript
// 1. Extract original questions from scans
scans.forEach(scan => {
  const scanQuestions = scan.analysis_data?.questions || [];
  scanQuestions.forEach(q => {
    allQuestions.push({
      ...q,
      source: 'past_year', // TAG
      id: `${scan.id}-${q.id}`
    });
  });
});

// 2. Get practice questions from table
const practiceQuestions = await supabase
  .from('questions')
  .select('*')
  .in('scan_id', scanIds);

practiceQuestions.forEach(q => {
  allQuestions.push({
    ...q,
    source: 'practice' // TAG
  });
});

// 3. Map both to topics
// - Practice questions: use topic_question_mapping table
// - Past year questions: map domain field to topic name
```

#### Domain-to-Topic Mapping

Past year questions are automatically mapped to topics by matching their `domain` field to topic names:

```typescript
const domainToTopicId = new Map();

// Exact matches
domainToTopicId.set('evolution', topicId);

// Fuzzy matches for variations
if (topicName.includes('evolution')) {
  domainToTopicId.set('genetics and evolution', topicId);
  domainToTopicId.set('evolution', topicId);
}
```

**Supported mappings** (Biology example):
- "Biology in Human Welfare" → "Microbes in Human Welfare"
- "Genetics and Evolution" → "Evolution"
- "Ecology" → "Ecosystem"
- "Reproduction" → "Sexual Reproduction in Flowering Plants"
- "Biotechnology" → "Biotechnology and its Applications"

### Benefits

✅ **No Collision**: Original scans never touched, practice questions separate
✅ **Works for ALL Subjects**: Math, Physics, Chemistry, Biology - all use same architecture
✅ **No Manual Syncing**: Questions automatically extracted from `analysis_data`
✅ **Future-Proof**: New scans work immediately without migration scripts
✅ **Flexible**: Can filter by source type (`past_year` vs `practice`)
✅ **Preserves Original Data**: Scanned PDFs remain immutable in `analysis_data`

### Topic Dashboard Display

When a user opens a topic (e.g., "Evolution"):

```
Evolution
├─ 27 Past Year Questions (from scans)
│  └─ Source: KCET 2024, KCET 2023, etc.
├─ 50 Practice Questions (from AI)
│  └─ Source: Generated for practice
└─ Total: 77 questions
```

User can filter:
- **All Questions** (default)
- **Past Year Only**
- **Practice Only**

### Database Schema

No changes required! Uses existing structure:

```sql
-- Original questions (immutable)
scans {
  id UUID
  analysis_data JSONB  -- contains questions array
}

-- Practice questions (editable)
questions {
  id UUID
  scan_id UUID
  question_text TEXT
  source TEXT  -- 'practice' or 'past_year'
}

-- Topic mappings (practice questions only)
topic_question_mapping {
  topic_id UUID
  question_id UUID
}
```

### Migration Path

**No migration needed!** The system now:
1. Reads existing scans with `analysis_data.questions`
2. Automatically maps domains to topics
3. Shows topics with questions immediately

### For Developers

#### Adding a New Subject

1. Upload scan via BoardMastermind
2. Questions automatically extracted to `analysis_data.questions`
3. Domain field populated during extraction
4. Learning Journey automatically picks up and maps to topics
5. **No manual work required!**

#### Adding Practice Questions

1. AI generates questions for a topic
2. Insert into `questions` table with `source: 'practice'`
3. Create mapping in `topic_question_mapping`
4. Topic Dashboard shows combined count

#### Extending Domain Mappings

Edit `lib/topicAggregator.ts` fuzzy matching section:

```typescript
if (topicName.includes('your-topic')) {
  domainToTopicId.set('your-domain-variation', topic.id);
}
```

## Testing

Verify the solution works:

1. **Check Biology topics**: Should show 5+ topics instead of 2
2. **Check question counts**: Each topic shows questions from scans
3. **Check other subjects**: Math, Physics should work without changes
4. **Console logs**: Look for:
   - `📊 [TOPIC AGGREGATOR] Extracted X past year questions`
   - `🗺️ [TOPIC AGGREGATOR] Mapped X questions to topics`

## Troubleshooting

**Topics still showing 2 instead of 13?**
- Check console for "Extracted X past year questions"
- Verify scans have `analysis_data.questions` populated
- Check domain field values in questions match topic names

**Questions not mapped to topics?**
- Add domain variations to fuzzy matching section
- Check topic names in database match domain values
- Verify `exam_weightage` for the exam context > 0

**Practice questions not showing?**
- Check `topic_question_mapping` table has entries
- Verify `source` field is set correctly
- Check scan_id matches

## Summary

This hybrid architecture provides a **concrete, universal solution** that:
- Works for all subjects without per-subject patches
- Preserves data integrity (no collisions)
- Requires zero manual syncing
- Scales automatically with new scans
- Maintains separation between original and generated content
