import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/flashcards - Save flashcards to database
export async function saveFlashcards(req, res) {
  try {
    const { scanId, cards } = req.body;

    if (!scanId || !cards || !Array.isArray(cards)) {
      return res.status(400).json({
        error: 'Missing required fields: scanId and cards array'
      });
    }

    // Delete existing flashcards for this scan
    await supabase
      .from('flashcards')
      .delete()
      .eq('scan_id', scanId);

    // Insert new flashcards
    const flashcardsToInsert = cards.map(card => ({
      scan_id: scanId,
      front: card.front,
      back: card.back,
      topic: card.topic || null
    }));

    const { data, error } = await supabase
      .from('flashcards')
      .insert(flashcardsToInsert)
      .select();

    if (error) {
      console.error('Error saving flashcards:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      count: data.length,
      message: `Saved ${data.length} flashcards`
    });
  } catch (error) {
    console.error('Error in saveFlashcards:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/flashcards/:scanId - Get flashcards for a scan
export async function getFlashcards(req, res) {
  try {
    const { scanId } = req.params;

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching flashcards:', error);
      return res.status(500).json({ error: error.message });
    }

    // Transform to match the expected format
    const cards = data.map(fc => ({
      front: fc.front,
      back: fc.back,
      topic: fc.topic
    }));

    res.json({ cards });
  } catch (error) {
    console.error('Error in getFlashcards:', error);
    res.status(500).json({ error: error.message });
  }
}
