import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Upload,
  Download,
  AlertCircle,
  Clock,
  BookOpen,
  Target,
  TrendingUp,
  RefreshCw,
  Globe,
  Lock,
  FileQuestion,
  Brain,
  Palette,
  BarChart3,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Subject, ExamContext } from '../types';

interface ScanInfo {
  id: string;
  paper_name: string;
  subject: Subject;
  exam_context: ExamContext;
  status: string;
  is_system_scan: boolean;
  created_at: string;
  question_count: number;
  mapped_count: number;
  unmapped_count: number;
  mapping_success_rate: number;
  // Generated content status
  has_visual_notes: boolean;
  has_flashcards: boolean;
  has_exam_analysis: boolean;
  visual_notes_count: number;
  flashcards_count: number;
  analysis_data?: any;
}

const AdminScanApproval: React.FC = () => {
  const [scans, setScans] = useState<ScanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanInfo | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished'>('unpublished');

  const [counts, setCounts] = useState({ all: 0, published: 0, unpublished: 0 });
  const [officialTopicsList, setOfficialTopicsList] = useState<{ id: string, name: string }[]>([]);

  // 🧠 SMARTER MATCHING ENGINE (Shared between mapper and UI)
  const findMatchingOfficialTopic = (rawTopic: string, officialTopics: { name: string, id: string }[]) => {
    if (!rawTopic) return null;
    const qTopic = rawTopic.toLowerCase().trim();

    return officialTopics.find(t => {
      const tName = t.name.toLowerCase().trim();

      // 1. Direct or substring
      if (tName === qTopic || tName.includes(qTopic) || qTopic.includes(tName)) return true;

      // 2. Plural/Singular fuzzy match (e.g. "Application" vs "Applications")
      const singularT = tName.replace(/s\b/g, '');
      const singularQ = qTopic.replace(/s\b/g, '');
      if (singularT === singularQ || (singularQ.length > 3 && (singularT.includes(singularQ) || singularQ.includes(singularT)))) return true;

      // 3. Special Cases & Common AI Aliases
      if (qTopic === 'differentiation' && tName.includes('differentiability')) return true;
      if (qTopic === 'integration' && tName.includes('integral')) return true;
      if (qTopic.includes('vector') && tName.includes('vector')) return true;

      return false;
    });
  };

  useEffect(() => {
    loadCounts();
    loadOfficialTopics();
  }, []);

  const loadOfficialTopics = async () => {
    const { data } = await supabase.from('topics').select('id, name');
    setOfficialTopicsList(data || []);
  };

  useEffect(() => {
    loadScans();
  }, [filterStatus]);

  /**
   * Map questions from a scan to official topics
   * This runs automatically when publishing a scan
   */
  const mapScanQuestionsToTopics = async (scanId: string, subject: Subject) => {
    try {
      // Get all official topics for this subject
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name')
        .eq('subject', subject);

      if (!topics || topics.length === 0) {
        console.warn(`No official topics found for subject ${subject}`);
        return;
      }

      // Get all questions from this scan
      const { data: questions } = await supabase
        .from('questions')
        .select('id, topic')
        .eq('scan_id', scanId);

      if (!questions || questions.length === 0) {
        console.warn('No questions found in scan');
        return;
      }

      // Create mappings
      const mappings: { question_id: string; topic_id: string }[] = [];
      let matched = 0;
      let unmatched = 0;
      let genericMapped = 0;

      // Find the fallback topic ("General [Subject]")
      const generalTopic = topics.find(t =>
        t.name.toLowerCase() === `general ${subject.toLowerCase()}` ||
        t.name.toLowerCase() === 'general'
      );

      for (const question of questions) {
        const matchingTopic = findMatchingOfficialTopic(question.topic, topics);

        if (matchingTopic) {
          mappings.push({
            question_id: question.id,
            topic_id: matchingTopic.id
          });
          matched++;
        } else if (generalTopic) {
          // 🛡️ FALLBACK: Map to Generic/General bucket if no specific topic match
          mappings.push({
            question_id: question.id,
            topic_id: generalTopic.id
          });
          genericMapped++;
        } else {
          unmatched++;
        }
      }
      console.log(`📊 Mapping results: ${matched} specific matches, ${genericMapped} general fallbacks, ${unmatched} failures`);

      if (mappings.length === 0) {
        console.warn('No mappings created - check topic name matching');
        return;
      }

      // Insert mappings
      const { error } = await supabase
        .from('topic_question_mapping')
        .upsert(mappings, {
          onConflict: 'question_id,topic_id',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('Error inserting mappings:', error);
        throw error;
      }

      console.log(`✅ Created ${mappings.length} question-topic mappings`);
    } catch (error) {
      console.error('Error mapping questions:', error);
      throw error;
    }
  };

  const loadCounts = async () => {
    try {
      // Get counts for all, published, unpublished in a single query by grouping
      // OR use a optimized count strategy. Here we'll use a single rpc or selective fetch.
      // Easiest optimized way with PostgREST:
      const { data, error } = await supabase
        .from('scans')
        .select('is_system_scan');

      if (error) throw error;

      const counts = (data || []).reduce((acc, scan) => {
        acc.all++;
        if (scan.is_system_scan) acc.published++;
        else acc.unpublished++;
        return acc;
      }, { all: 0, published: 0, unpublished: 0 });

      setCounts(counts);
    } catch (err) {
      console.error('Error loading counts:', err);
    }
  };

  const loadScans = async () => {
    setLoading(true);
    try {
      // Fetch scan metadata based on current filterStatus
      // OPTIMIZATION: Include counts in the main query using PostgREST nested count
      let query = supabase
        .from('scans')
        .select(`
          id, name, subject, exam_context, status, is_system_scan, created_at, year, analysis_data,
          questions:questions(count),
          visual_notes:topic_sketches(count)
        `)
        .order('created_at', { ascending: false })
        .limit(20); // LIMIT: only fetch top 20 to keep stats fetch efficient

      if (filterStatus === 'published') {
        query = query.eq('is_system_scan', true);
      } else if (filterStatus === 'unpublished') {
        query = query.eq('is_system_scan', false);
      }

      const { data: scanData, error: scanError } = await query;

      if (scanError) {
        console.error('Error loading scans:', scanError);
        throw scanError;
      }

      const completedScans = (scanData || []).filter(scan =>
        scan.status?.toLowerCase() === 'complete' ||
        scan.status?.toLowerCase() === 'completed'
      );

      if (completedScans.length === 0) {
        setScans([]);
        setLoading(false);
        return;
      }

      const scanIds = completedScans.map(s => s.id);

      // OPTIMIZATION: Get ALL mappings for these scans in ONE query using a join
      // This is much faster than fetching all questions first and then their mappings
      const { data: allMappingsData, error: mappingError } = await supabase
        .from('topic_question_mapping')
        .select('question_id, questions!inner(scan_id)')
        .in('questions.scan_id', scanIds);

      if (mappingError) {
        console.error('❌ Error fetching mappings:', mappingError);
      }

      // Group mappings by scan_id
      const mappingsByScan = (allMappingsData || []).reduce((acc, m: any) => {
        const scanId = m.questions?.scan_id;
        if (scanId) acc[scanId] = (acc[scanId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📊 Stats counts retrieved via optimized queries');

      // Build scan info with counts (no per-scan queries!)
      const scansWithCounts = completedScans.map(scan => {
        // Extract counts from the nested query results
        // Supabase returns these as arrays: [{ count: X }]
        const dbQuestionCount = (scan as any).questions?.[0]?.count || 0;
        const analysisQuestions = scan.analysis_data?.questions || [];

        const questionCount = scan.is_system_scan
          ? dbQuestionCount
          : (dbQuestionCount > 0 ? dbQuestionCount : analysisQuestions.length);

        // For mapped count:
        // 1. If in DB, use mappingsByScan
        // 2. If holographic (only in analysis_data), check if they have topics assigned
        let mappedCount = mappingsByScan[scan.id] || 0;
        if (dbQuestionCount === 0 && analysisQuestions.length > 0) {
          mappedCount = analysisQuestions.filter((q: any) =>
            q.topic && q.topic !== 'General' && q.topic !== 'Mathematics' && q.topic !== 'Physics'
          ).length;
        }

        const unmappedCount = Math.max(0, questionCount - mappedCount);
        const successRate = questionCount > 0
          ? Math.round((mappedCount / questionCount) * 100)
          : 0;

        // Calculate visual notes count:
        // 1. First priority: From the dedicated topic_sketches table (new standard)
        // 2. Fallback: From scan.analysis_data (legacy)
        const dbVisualNotesCount = (scan as any).visual_notes?.[0]?.count || 0;
        const legacyVisualNotesCount = scan.analysis_data?.topicBasedSketches
          ? Object.keys(scan.analysis_data.topicBasedSketches).length
          : 0;

        const visualNotesCount = dbVisualNotesCount > 0 ? dbVisualNotesCount : legacyVisualNotesCount;

        // Calculate flashcards count (TODO: implement when flashcards are added)
        const flashcardsCount = 0;

        return {
          id: scan.id,
          paper_name: scan.name || 'Untitled Scan',
          subject: scan.subject,
          exam_context: scan.exam_context,
          status: scan.status,
          is_system_scan: scan.is_system_scan || false,
          created_at: scan.created_at,
          question_count: questionCount,
          mapped_count: mappedCount,
          unmapped_count: unmappedCount,
          mapping_success_rate: successRate,
          has_visual_notes: visualNotesCount > 0,
          has_flashcards: flashcardsCount > 0,
          has_exam_analysis: questionCount > 0,
          visual_notes_count: visualNotesCount,
          flashcards_count: flashcardsCount,
          analysis_data: scan.analysis_data
        };
      });

      setScans(scansWithCounts);

      // Update counts if we're on 'all' view to keep badges fresh
      if (filterStatus === 'all') {
        const pubCount = scansWithCounts.filter(s => s.is_system_scan).length;
        setCounts(prev => ({
          ...prev,
          all: scansWithCounts.length,
          published: pubCount,
          unpublished: scansWithCounts.length - pubCount
        }));
      }
    } catch (error) {
      console.error('❌ Error loading scans:', error);
      alert('Failed to load scans. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const publishScan = async (scanId: string) => {
    setPublishing(scanId);
    try {
      // Fetch fresh scan data from database (with all fields)
      const { data: scan, error: fetchError } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (fetchError || !scan) {
        console.error('❌ Error fetching scan:', fetchError);
        return;
      }

      console.log(`📤 Publishing scan ${scanId}...`);

      // Step 1: Get other published scans for same subject/exam
      const { data: otherScans } = await supabase
        .from('scans')
        .select('id')
        .eq('subject', scan.subject)
        .eq('exam_context', scan.exam_context)
        .eq('is_system_scan', true)
        .neq('id', scanId);

      // Step 2: Remove mappings from other scans
      if (otherScans && otherScans.length > 0) {
        for (const otherScan of otherScans) {
          const { data: otherQuestions } = await supabase
            .from('questions')
            .select('id')
            .eq('scan_id', otherScan.id);

          if (otherQuestions && otherQuestions.length > 0) {
            const questionIds = otherQuestions.map(q => q.id);
            await supabase
              .from('topic_question_mapping')
              .delete()
              .in('question_id', questionIds);
            console.log(`🗑️ Removed ${questionIds.length} mappings from old published scan`);
          }
        }
      }

      // Step 3: Unpublish other scans
      await supabase
        .from('scans')
        .update({ is_system_scan: false })
        .eq('subject', scan.subject)
        .eq('exam_context', scan.exam_context)
        .neq('id', scanId);

      // Step 4: Extract year from filename (if not already set)
      const extractYearFromFilename = (name: string): string | null => {
        if (!name) return null;
        // Match 4-digit year (1900-2099)
        const yearMatch = name.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? yearMatch[0] : null;
      };

      console.log(`📋 Scan object:`, { id: scan.id, name: scan.name, year: scan.year, analysis_data_exists: !!scan.analysis_data });
      const extractedYear = scan.year || extractYearFromFilename(scan.name || '');
      console.log(`📅 Year extracted: ${extractedYear} from filename: ${scan.name}`);

      // Step 3: Publish this scan with year field
      console.log(`📡 Updating scan ${scanId} status to published...`);
      const { data: updateData, error: publishError } = await supabase
        .from('scans')
        .update({
          is_system_scan: true,
          year: extractedYear,  // ✅ Set year field
          status: 'Complete'   // Ensure status is correctly set
        })
        .eq('id', scanId)
        .select();

      if (publishError) {
        console.error('❌ Error updating scan status:', publishError);
        throw new Error(`Failed to update scan status: ${publishError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        console.error('❌ Update failed: No rows affected. Check RLS policies.');
        throw new Error('Update failed: Permisson denied or scan not found. Ensure you are an Admin and have run Migration 020.');
      }

      // NEW STEP: Cleanup existing questions/mappings for this scan before re-inserting
      // This prevents doubling if publish is clicked multiple times
      console.log('🧹 Cleaning up existing data for this scan...');
      const { data: existingQs } = await supabase
        .from('questions')
        .select('id')
        .eq('scan_id', scanId);

      if (existingQs && existingQs.length > 0) {
        const qIds = existingQs.map(q => q.id);
        const { error: delMapError } = await supabase.from('topic_question_mapping').delete().in('question_id', qIds);
        const { error: delQError } = await supabase.from('questions').delete().eq('scan_id', scanId);

        if (delMapError || delQError) {
          console.error('❌ Cleanup failed:', { delMapError, delQError });
          throw new Error('Cleanup failed. Cannot proceed with publishing as it would create duplicates.');
        }
        console.log(`🗑️ Removed ${qIds.length} existing duplicate questions/mappings`);
      }

      // Step 5: Copy questions from analysis_data.questions to questions table
      console.log('📋 Copying questions from analysis_data to questions table...');
      const questionsToInsert = scan.analysis_data?.questions || [];

      if (questionsToInsert.length > 0) {
        // Helper function to normalize difficulty values
        const normalizeDifficulty = (diff: string | undefined): 'Easy' | 'Moderate' | 'Hard' => {
          if (!diff) return 'Moderate';
          const normalized = diff.trim().toLowerCase();
          if (normalized === 'easy') return 'Easy';
          if (normalized === 'hard') return 'Hard';
          if (normalized === 'moderate' || normalized === 'medium' || normalized === 'average') return 'Moderate';
          return 'Moderate'; // Default fallback
        };

        // Transform analysis_data questions to match questions table schema
        const questionsData = questionsToInsert.map((q: any, index: number) => ({
          scan_id: scanId,
          text: q.text || q.question || '',
          marks: parseInt(q.marks) || 1,
          difficulty: normalizeDifficulty(q.difficulty),
          topic: q.topic || '',
          domain: q.domain || '',
          blooms: q.blooms || 'Understanding',
          options: q.options || [],
          solution_steps: q.solutionSteps || q.solution_steps || [],
          exam_tip: q.examTip || q.exam_tip || null,
          question_order: index,
          subject: scan.subject,
          exam_context: scan.exam_context,
          year: extractedYear || null,
          is_system_question: true,  // ✅ Mark as system question (bypasses RLS user ownership)
        }));

        // Insert questions into questions table
        const { data: insertedQuestions, error: insertError } = await supabase
          .from('questions')
          .insert(questionsData)
          .select('id, topic');

        if (insertError) {
          console.error('❌ Error inserting questions:', insertError);
          throw insertError;
        }

        console.log(`✅ Inserted ${insertedQuestions?.length || 0} questions into questions table`);
      }

      // Step 6: Automatically map questions to official topics
      console.log('🔗 Auto-mapping questions to topics...');
      await mapScanQuestionsToTopics(scanId, scan.subject);

      console.log(`✅ Published scan ${scanId} to system with auto-mapped questions`);

      // Update counts and switch to the 'Published' tab for confirmation
      await loadCounts();
      // Only set status if not already published - this will trigger useEffect -> loadScans
      if (filterStatus !== 'published') {
        setFilterStatus('published');
      } else {
        // If already on published tab, trigger manual reload
        await loadScans();
      }
    } catch (error) {
      console.error('Error publishing scan:', error);
      alert('Failed to publish scan. Check console for details.');
    } finally {
      setPublishing(null);
    }
  };

  const unpublishScan = async (scanId: string) => {
    setPublishing(scanId);
    try {
      console.log(`🔒 Unpublishing scan ${scanId}...`);

      // Step 1: Get all question IDs from this scan
      const { data: questions } = await supabase
        .from('questions')
        .select('id')
        .eq('scan_id', scanId);

      // Step 2: Remove mappings for these questions
      if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id);
        const { error: mappingError } = await supabase
          .from('topic_question_mapping')
          .delete()
          .in('question_id', questionIds);

        if (mappingError) {
          console.error('Error removing mappings:', mappingError);
        } else {
          console.log(`🗑️ Removed ${questions.length} question mappings`);
        }
      }

      // Step 3: Unpublish the scan
      const { error } = await supabase
        .from('scans')
        .update({ is_system_scan: false })
        .eq('id', scanId);

      if (error) throw error;

      console.log(`✅ Unpublished scan ${scanId} from system and removed mappings`);

      // Update counts and switch back to the 'Unpublished' tab
      await loadCounts();
      if (filterStatus !== 'unpublished') {
        setFilterStatus('unpublished');
      } else {
        await loadScans();
      }
    } catch (error) {
      console.error('Error unpublishing scan:', error);
      alert('Failed to unpublish scan. Check console for details.');
    } finally {
      setPublishing(null);
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (rate >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const filteredScans = scans;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-primary-500" size={32} />
          <p className="text-slate-600 font-medium">Loading scans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-instrument">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">
                Admin Scan Approval
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Review and publish scans to make them available to all users
              </p>
            </div>
            <button
              onClick={loadScans}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-bold transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              All Scans ({counts.all})
            </button>
            <button
              onClick={() => setFilterStatus('published')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'published'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Published ({counts.published})
            </button>
            <button
              onClick={() => setFilterStatus('unpublished')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'unpublished'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Unpublished ({counts.unpublished})
            </button>
          </div>
        </div>
      </div>

      {/* Scans List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredScans.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-black text-slate-900 mb-2">No Scans Found</h3>
            <p className="text-slate-500">
              {filterStatus === 'all' && 'No completed scans available.'}
              {filterStatus === 'published' && 'No scans are currently published.'}
              {filterStatus === 'unpublished' && 'All scans are already published.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredScans.map((scan) => (
              <div
                key={scan.id}
                className={`bg-white rounded-xl border-2 p-6 transition-all ${scan.is_system_scan
                  ? 'border-emerald-200 shadow-emerald-100 shadow-lg'
                  : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left Section - Scan Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {/* Published Badge */}
                      {scan.is_system_scan ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-emerald-100 text-emerald-700 border-2 border-emerald-300">
                          <Globe size={12} />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-slate-100 text-slate-600 border-2 border-slate-200">
                          <Lock size={12} />
                          Unpublished
                        </span>
                      )}

                      {/* Quality Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border-2 ${getSuccessRateColor(scan.mapping_success_rate)}`}>
                        <Target size={12} />
                        {scan.mapping_success_rate}% Mapped
                      </span>

                      {/* Content Generated Badge */}
                      {(() => {
                        const contentCount = [
                          scan.question_count > 0,
                          scan.has_exam_analysis,
                          scan.has_visual_notes,
                          scan.has_flashcards
                        ].filter(Boolean).length;
                        return contentCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-blue-100 text-blue-700 border-2 border-blue-300">
                            <Zap size={12} />
                            {contentCount}/4 Content Types
                          </span>
                        );
                      })()}
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mb-1">
                      {scan.paper_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500 font-medium mb-4">
                      <span className="font-bold text-slate-700">{scan.subject}</span>
                      <span>•</span>
                      <span className="font-bold text-slate-700">{scan.exam_context}</span>
                      <span>•</span>
                      <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen size={14} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {scan.question_count}
                        </div>
                        <div className="text-xs text-slate-500">Questions</div>
                      </div>

                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="text-xs font-bold text-emerald-600 uppercase">Mapped</span>
                        </div>
                        <div className="text-2xl font-black text-emerald-700">
                          {scan.mapped_count}
                        </div>
                        <div className="text-xs text-emerald-600">To topics</div>
                      </div>

                      <div className={`rounded-lg p-3 border ${scan.unmapped_count === 0
                        ? 'bg-slate-50 border-slate-100'
                        : 'bg-orange-50 border-orange-100'
                        }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle size={14} className={scan.unmapped_count === 0 ? 'text-slate-400' : 'text-orange-500'} />
                          <span className={`text-xs font-bold uppercase ${scan.unmapped_count === 0 ? 'text-slate-400' : 'text-orange-600'
                            }`}>Unmapped</span>
                        </div>
                        <div className={`text-2xl font-black ${scan.unmapped_count === 0 ? 'text-slate-600' : 'text-orange-700'
                          }`}>
                          {scan.unmapped_count}
                        </div>
                        <div className={`text-xs ${scan.unmapped_count === 0 ? 'text-slate-500' : 'text-orange-600'
                          }`}>Need review</div>
                      </div>
                    </div>

                    {/* Generated Content Status - Premium Cards */}
                    <div className="mt-4">
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Generated Content</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Question Bank */}
                        <div className="relative bg-white rounded-2xl p-4 border border-slate-200 overflow-hidden">
                          {/* Decorative background icon */}
                          <div className="absolute top-2 right-2 opacity-5">
                            <FileQuestion size={80} className="text-indigo-600" />
                          </div>

                          <div className="relative">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <FileQuestion size={16} className="text-indigo-600" />
                              </div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Question Bank</span>
                            </div>

                            {/* Value */}
                            <div className="mb-2">
                              <div className="text-4xl font-black text-slate-900 leading-none mb-1">
                                {scan.question_count}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {scan.question_count > 0 ? 'questions' : 'not generated'}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all"
                                style={{ width: scan.question_count > 0 ? '100%' : '0%' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Exam Analysis */}
                        <div className="relative bg-white rounded-2xl p-4 border border-slate-200 overflow-hidden">
                          {/* Decorative background icon */}
                          <div className="absolute top-2 right-2 opacity-5">
                            <BarChart3 size={80} className="text-emerald-600" />
                          </div>

                          <div className="relative">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <BarChart3 size={16} className="text-emerald-600" />
                              </div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Exam Analysis</span>
                            </div>

                            {/* Value */}
                            <div className="mb-2">
                              <div className="text-4xl font-black text-slate-900 leading-none mb-1">
                                {scan.has_exam_analysis ? '✓' : '—'}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {scan.has_exam_analysis ? 'available' : 'not generated'}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all"
                                style={{ width: scan.has_exam_analysis ? '100%' : '0%' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Visual Notes */}
                        <div className="relative bg-white rounded-2xl p-4 border border-slate-200 overflow-hidden">
                          {/* Decorative background icon */}
                          <div className="absolute top-2 right-2 opacity-5">
                            <Palette size={80} className="text-amber-600" />
                          </div>

                          <div className="relative">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Palette size={16} className="text-amber-600" />
                              </div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Visual Notes</span>
                            </div>

                            {/* Value */}
                            <div className="mb-2">
                              <div className="text-4xl font-black text-slate-900 leading-none mb-1">
                                {scan.visual_notes_count}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {scan.has_visual_notes ? 'sketches' : 'not generated'}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all"
                                style={{ width: scan.has_visual_notes ? '100%' : '0%' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Rapid Recall */}
                        <div className="relative bg-white rounded-2xl p-4 border border-slate-200 overflow-hidden">
                          {/* Decorative background icon */}
                          <div className="absolute top-2 right-2 opacity-5">
                            <Brain size={80} className="text-purple-600" />
                          </div>

                          <div className="relative">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                                <Brain size={16} className="text-purple-600" />
                              </div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Rapid Recall</span>
                            </div>

                            {/* Value */}
                            <div className="mb-2">
                              <div className="text-4xl font-black text-slate-900 leading-none mb-1">
                                {scan.flashcards_count}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {scan.has_flashcards ? 'flashcards' : 'not generated'}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                                style={{ width: scan.has_flashcards ? '100%' : '0%' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex flex-col gap-3">
                    {scan.is_system_scan ? (
                      <button
                        onClick={() => unpublishScan(scan.id)}
                        disabled={publishing === scan.id}
                        className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                      >
                        {publishing === scan.id ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Unpublishing...
                          </>
                        ) : (
                          <>
                            <Lock size={16} />
                            Unpublish
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => publishScan(scan.id)}
                        disabled={publishing === scan.id}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                      >
                        {publishing === scan.id ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Globe size={16} />
                            Publish to System
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedScan(scan)}
                      className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 rounded-lg font-black transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                  </div>
                </div>

                {/* Warning for low mapping rate */}
                {scan.mapping_success_rate < 50 && (
                  <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-black text-orange-900 mb-1">Low Mapping Success Rate</h4>
                        <p className="text-sm text-orange-700">
                          Only {scan.mapping_success_rate}% of questions were mapped to topics.
                          Review extraction quality before publishing. Consider re-scanning with improved prompts.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan Details Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedScan.paper_name}</h2>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
                  <span className="text-primary-600">{selectedScan.subject}</span>
                  <span>•</span>
                  <span>{selectedScan.exam_context}</span>
                  <span>•</span>
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] uppercase">{selectedScan.id.substring(0, 8)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedScan(null)}
                className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-slate-100"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Status Card */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quality Score</h4>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-black text-slate-900">{selectedScan.mapping_success_rate}%</span>
                    <span className="text-sm font-bold text-slate-500 mb-1.5 whitespace-nowrap">Mapped to Topics</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${selectedScan.mapping_success_rate > 80 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      style={{ width: `${selectedScan.mapping_success_rate}%` }}
                    />
                  </div>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <div className="text-xs font-black text-emerald-600 uppercase mb-1">Successfully Mapped</div>
                    <div className="text-2xl font-black text-emerald-700">{selectedScan.mapped_count}</div>
                    <div className="text-xs text-emerald-600/70 font-medium">Questions connected to official syllabus</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                    <div className="text-xs font-black text-orange-600 uppercase mb-1">Unmapped / Review</div>
                    <div className="text-2xl font-black text-orange-700">{selectedScan.unmapped_count}</div>
                    <div className="text-xs text-orange-600/70 font-medium">Questions needing manual topic assignment</div>
                  </div>
                </div>
              </div>

              {/* Curriculum Distribution Analysis */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Globe size={20} className="text-primary-500" />
                    Curriculum Distribution Analysis
                  </h3>
                  <div className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                    Syllabus Coverage: 100%
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                  Questions that don't match specific syllabus topics are automatically mapped to the <span className="text-slate-900 font-bold">General {selectedScan.subject}</span> bucket.
                  This ensures students can still practice them in the Learning Journey under a general category.
                </p>

                <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="col-span-1">#</div>
                    <div className="col-span-7">Question Content preview</div>
                    <div className="col-span-4">AI Suggested Topic</div>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                    {(() => {
                      const questions = selectedScan.analysis_data?.questions || [];
                      const genericTopics = ['General', 'Mathematics', 'Physics', 'Unknown', ''];

                      return questions.filter((q: any) => {
                        const topic = q.topic || '';
                        // Sync with the same matching engine used for the count
                        const matchingTopic = findMatchingOfficialTopic(topic, officialTopicsList);
                        return genericTopics.includes(topic) || !matchingTopic;
                      }).map((q: any, idx: number) => (
                        <div key={idx} className="p-4 grid grid-cols-12 gap-4 hover:bg-slate-50 transition-colors">
                          <div className="col-span-1 text-sm font-bold text-slate-400">{idx + 1}</div>
                          <div className="col-span-7">
                            <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                              {q.text || q.question}
                            </p>
                          </div>
                          <div className="col-span-4 text-right">
                            <span className="inline-flex px-2 py-1 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200 uppercase">
                              {q.topic || 'Unclassified'}
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="mt-6 p-6 bg-slate-900 rounded-2xl text-white">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-white mb-1">Recommended Action</h4>
                      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                        The mapping failed because these topics aren't in the official syllabus yet (e.g., Statistics, Straight Lines) or have pluralization differences.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => publishScan(selectedScan.id)}
                          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all"
                        >
                          Update Syllabus & Remap
                        </button>
                        <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all">
                          Export List to CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScanApproval;
