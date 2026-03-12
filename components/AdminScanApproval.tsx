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
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Subject, ExamContext } from '../types';
import { syncScanToAITables } from '../lib/syncScanToAITables';
import { getForecastedCalibration } from '../lib/reiEvolutionEngine';
import StrategicBriefing from './StrategicBriefing';
import { useAppContext } from '../contexts/AppContext';

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
  is_combined_paper?: boolean;
  subjects?: Subject[];
  year?: string | null;
}

const AdminScanApproval: React.FC = () => {
  const [scans, setScans] = useState<ScanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanInfo | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished'>('unpublished');
  const [view, setView] = useState<'scans' | 'intelligence'>('scans');

  const [counts, setCounts] = useState({ all: 0, published: 0, unpublished: 0 });
  const [officialTopicsList, setOfficialTopicsList] = useState<{ id: string, name: string }[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false);
  const [scanYears, setScanYears] = useState<Record<string, string>>({});
  const [savingYear, setSavingYear] = useState<string | null>(null);

  // Strategic Briefing Filters (Linked to Global Context)
  const { activeSubject, activeExamContext } = useAppContext();

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

      // 3. Special Cases & Common AI Aliases (NCERT Mapping Hints)
      const mappingHints: Record<string, string> = {
        'electrostatics': 'Electric Charges and Fields',
        'capacitors': 'Electrostatic Potential and Capacitance',
        'current': 'Current Electricity',
        'magnetism': 'Moving Charges and Magnetism',
        'optics': 'Ray Optics and Optical Instruments',
        'differentiation': 'Continuity and Differentiability',
        'integration': 'Integrals',
        'reproduction': 'Sexual Reproduction in Flowering Plants',
        'genetics': 'Principles of Inheritance and Variation',
        'biotechnology': 'Biotechnology Principles and Processes',
        'ecology': 'Organisms and Populations'
      };

      if (mappingHints[qTopic] && tName === mappingHints[qTopic].toLowerCase()) return true;

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
      // 🔧 SUBJECT NORMALIZATION (Botany/Zoology -> Biology)
      let querySubject = subject;
      if (subject === 'Botany' || subject === 'Zoology') {
        querySubject = 'Biology';
      }

      // Get all official topics for this normalized subject
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name')
        .eq('subject', querySubject);

      if (!topics || topics.length === 0) {
        console.warn(`No official topics found for subject ${querySubject} (Original: ${subject})`);
        return;
      }

      // Get all questions from this scan
      const { data: questions } = await supabase
        .from('questions')
        .select('id, topic, subject')
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
        // NEW: For combined papers, only map if question subject matches current loop subject
        if (question.subject && question.subject !== subject) continue;

        // Use the smarter matching engine
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
      let query = supabase
        .from('scans')
        .select(`
          id, name, subject, exam_context, status, is_system_scan, created_at, year, analysis_data,
          is_combined_paper, subjects,
          questions:questions(count),
          visual_notes:topic_sketches(count),
          flashcards:flashcards(data)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

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

      const { data: allMappingsData, error: mappingError } = await supabase
        .from('topic_question_mapping')
        .select('question_id, questions!inner(scan_id)')
        .in('questions.scan_id', scanIds);

      if (mappingError) {
        console.error('❌ Error fetching mappings:', mappingError);
      }

      const mappingsByScan = (allMappingsData || []).reduce((acc, m: any) => {
        const scanId = m.questions?.scan_id;
        if (scanId) acc[scanId] = (acc[scanId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const scansWithCounts = completedScans.map(scan => {
        const dbQuestionCount = (scan as any).questions?.[0]?.count || 0;
        const analysisQuestions = scan.analysis_data?.questions || [];

        const questionCount = scan.is_system_scan
          ? dbQuestionCount
          : (dbQuestionCount > 0 ? dbQuestionCount : analysisQuestions.length);

        let mappedCount = mappingsByScan[scan.id] || 0;
        if (dbQuestionCount === 0 && analysisQuestions.length > 0) {
          mappedCount = analysisQuestions.filter((q: any, idx: number) => {
            // APPLY LEGACY SYNC for mapping estimate
            let qSubj = q.subject || scan.subject;
            if ((qSubj === 'Biology' || qSubj === 'Botany' || qSubj === 'Zoology') && scan.exam_context === 'NEET') {
              const idParts = (q.id || '').split(/[^0-9]/).filter(Boolean);
              const qNum = idParts.length > 0 ? parseInt(idParts[idParts.length - 1]) : (idx + 1);
              if (qNum > 100 && qNum <= 150) qSubj = 'Botany';
              else if (qNum > 150) qSubj = 'Zoology';
            }

            // Check if topic is non-generic AND matches an official topic
            const isGeneric = ['General', 'Mathematics', 'Physics', 'Biology', 'Chemistry', 'Botany', 'Zoology', 'Unknown', 'Unmapped', ''].includes(q.topic || '');

            // Map Botany/Zoology topics using the official topics list
            const matchingTopic = findMatchingOfficialTopic(q.topic, officialTopicsList);
            return !isGeneric && matchingTopic;
          }).length;
        }

        const unmappedCount = Math.max(0, questionCount - mappedCount);
        const successRate = questionCount > 0
          ? (mappedCount === questionCount ? 100 : Number(((mappedCount / questionCount) * 100).toFixed(1)))
          : 0;

        const dbVisualNotesCount = (scan as any).visual_notes?.[0]?.count || 0;
        const legacyVisualNotesCount = scan.analysis_data?.topicBasedSketches
          ? Object.keys(scan.analysis_data.topicBasedSketches).length
          : 0;

        const visualNotesCount = dbVisualNotesCount > 0 ? dbVisualNotesCount : legacyVisualNotesCount;

        const flashcardsBatch = (scan as any).flashcards?.[0];
        const flashcardsCount = flashcardsBatch?.data ? (Array.isArray(flashcardsBatch.data) ? flashcardsBatch.data.length : 0) : 0;

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
          analysis_data: scan.analysis_data,
          is_combined_paper: scan.is_combined_paper,
          subjects: scan.subjects,
          year: scan.year || scan.name?.match(/\b(20|19)\d{2}\b/)?.[0] || null
        };
      });

      setScans(scansWithCounts);
      // Seed scanYears from DB so inputs are pre-populated
      setScanYears(prev => {
        const next = { ...prev };
        scansWithCounts.forEach(s => { if (s.year && !next[s.id]) next[s.id] = s.year; });
        return next;
      });

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
      const { data: scan, error: fetchError } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (fetchError || !scan) {
        console.error('❌ Error fetching scan:', fetchError);
        return;
      }


      const extractYearFromFilename = (name: string): string | null => {
        if (!name) return null;
        const yearMatch = name.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? yearMatch[0] : null;
      };

      const extractedYear = scanYears[scanId] || scan.year || extractYearFromFilename(scan.name || '');

      const { data: updateData, error: publishError } = await supabase
        .from('scans')
        .update({
          is_system_scan: true,
          year: extractedYear,
          status: 'Complete'
        })
        .eq('id', scanId)
        .select();

      if (publishError) throw publishError;

      const { data: existingQs } = await supabase
        .from('questions')
        .select('id, sketch_svg_url, has_visual_element, visual_element_type, visual_element_description, diagram_url, question_order, metadata')
        .eq('scan_id', scanId);

      const visualMetadataMap = new Map();
      if (existingQs) {
        existingQs.forEach(eq => {
          if (eq.sketch_svg_url || eq.diagram_url || eq.has_visual_element) {
            const visualData = {
              sketch_svg_url: eq.sketch_svg_url,
              has_visual_element: eq.has_visual_element,
              visual_element_type: eq.visual_element_type,
              visual_element_description: eq.visual_element_description,
              diagram_url: eq.diagram_url
            };

            if (eq.metadata?.appId) {
              visualMetadataMap.set(eq.metadata.appId, visualData);
            }
            visualMetadataMap.set(`order-${eq.question_order}`, visualData);
          }
        });
      }

      if (existingQs && existingQs.length > 0) {
        const qIds = existingQs.map(q => q.id);
        await supabase.from('topic_question_mapping').delete().in('question_id', qIds);
        await supabase.from('questions').delete().eq('scan_id', scanId);
      }

      const questionsToInsert = scan.analysis_data?.questions || [];

      if (questionsToInsert.length > 0) {
        const normalizeDifficulty = (diff: string | undefined): 'Easy' | 'Moderate' | 'Hard' => {
          if (!diff) return 'Moderate';
          const normalized = diff.trim().toLowerCase();
          if (normalized === 'easy') return 'Easy';
          if (normalized === 'hard') return 'Hard';
          return 'Moderate';
        };

        const questionsData = questionsToInsert.map((q: any, index: number) => {
          const vData = visualMetadataMap.get(q.id) || visualMetadataMap.get(`order-${index}`) || {};
          return {
            scan_id: scanId,
            text: q.text || q.question || '',
            marks: parseInt(q.marks) || 1,
            difficulty: normalizeDifficulty(q.difficulty),
            topic: q.topic || '',
            domain: q.domain || '',
            blooms: q.blooms || 'Understanding',
            options: q.options || [],
            correct_option_index: q.correctOptionIndex ?? q.correct_option_index ?? 0,
            solution_steps: q.solutionSteps || q.solution_steps || [],
            exam_tip: q.examTip || q.exam_tip || null,
            study_tip: q.studyTip || q.study_tip || null,
            ai_reasoning: q.aiReasoning || q.ai_reasoning || (q.masteryMaterial?.logic) || null,
            historical_pattern: q.historicalPattern || q.historical_pattern || null,
            predictive_insight: q.predictiveInsight || q.predictive_insight || null,
            why_it_matters: q.whyItMatters || q.why_it_matters || null,
            key_formulas: q.keyFormulas || q.key_formulas || [],
            mastery_material: q.masteryMaterial || q.mastery_material || null,
            question_order: index,
            subject: q.subject || scan.subject,
            exam_context: scan.exam_context,
            year: extractedYear ? parseInt(extractedYear) : null,
            is_system_question: true,
            sketch_svg_url: vData.sketch_svg_url || q.sketch_svg_url || null,
            has_visual_element: vData.has_visual_element || q.has_visual_element || false,
            visual_element_type: vData.visual_element_type || q.visual_element_type || null,
            visual_element_description: vData.visual_element_description || q.visual_element_description || null,
            diagram_url: vData.diagram_url || q.diagram_url || null,
            metadata: {
              ...(q.metadata || {}),
              appId: q.id || `${scanId}-${index}`,
              published_at: new Date().toISOString()
            }
          };
        });

        await supabase
          .from('questions')
          .insert(questionsData);
      }

      // 4. MAP QUESTIONS TO TOPICS (Required for sync)
      if (scan.is_combined_paper && scan.subjects) {
        for (const subj of scan.subjects) {
          await mapScanQuestionsToTopics(scanId, subj);
        }
      } else {
        await mapScanQuestionsToTopics(scanId, scan.subject);
      }

      // 5. SYNC TO AI GENERATOR TABLES (REI v3.0 INTELLIGENCE SYNC)
      // This populates the historical patterns used for 2026 predictions
      try {
        if (scan.is_combined_paper && scan.subjects) {
          for (const subj of scan.subjects) {
            console.log(`📡 [SYNC] Starting subject fragment sync for: ${subj}`);
            await syncScanToAITables(supabase, scanId, subj, extractedYear, scan.exam_context);
          }
        } else {
          await syncScanToAITables(supabase, scanId, scan.subject, extractedYear, scan.exam_context);
        }
        console.log('✅ [SYNC] Integrated scan intelligence into AI forecasting models.');
      } catch (syncError) {
        console.warn('⚠️ [SYNC] High-level sync failed, pattern gradients might not be updated:', syncError);
      }

      await loadCounts();
      if (filterStatus !== 'published') {
        setFilterStatus('published');
      } else {
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
      const { data: questions } = await supabase
        .from('questions')
        .select('id')
        .eq('scan_id', scanId);

      if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id);
        await supabase
          .from('topic_question_mapping')
          .delete()
          .in('question_id', questionIds);
      }

      await supabase
        .from('scans')
        .update({ is_system_scan: false })
        .eq('id', scanId);

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

  const saveYearForScan = async (scanId: string, year: string) => {
    if (!year) return;
    setSavingYear(scanId);
    try {
      await supabase.from('scans').update({ year }).eq('id', scanId);
      await supabase.from('questions').update({ year: parseInt(year) }).eq('scan_id', scanId);
      setScans(prev => prev.map(s => s.id === scanId ? { ...s } : s));
    } catch (error) {
      console.error('Error saving year:', error);
      alert('Failed to save year.');
    } finally {
      setSavingYear(null);
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-4">
          <button
            onClick={() => setView('scans')}
            className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 ${view === 'scans' ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            <Upload size={18} /> Scan Management
          </button>
          <button
            onClick={() => setView('intelligence')}
            className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 ${view === 'intelligence' ? 'bg-purple-600 border-purple-600 text-white shadow-xl shadow-purple-600/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            <Brain size={18} className={view === 'intelligence' ? 'animate-pulse' : ''} /> REI v4.0 Intelligence
          </button>
        </div>
      </div>

      {view === 'scans' ? (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
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

          {/* Scans List */}
          <div className="mt-8">
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

                        <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">
                          {scan.paper_name}
                        </h3>
                        {scan.is_combined_paper && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded uppercase tracking-wider border border-indigo-200">
                              Combined Paper
                            </span>
                            {(scan.subjects || []).map(s => (
                              <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase tracking-wider border border-slate-200">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-slate-500 font-medium mb-3">
                          <span className="font-bold text-slate-700">{scan.is_combined_paper ? 'NEET Combined' : scan.subject}</span>
                          <span>•</span>
                          <span className="font-bold text-slate-700">{scan.exam_context}</span>
                          <span>•</span>
                          <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                        </div>
                        {/* Year Editor */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Exam Year:</span>
                          <input
                            type="number"
                            min="2010"
                            max="2030"
                            placeholder="e.g. 2023"
                            value={scanYears[scan.id] || ''}
                            onChange={e => setScanYears(prev => ({ ...prev, [scan.id]: e.target.value }))}
                            className="w-24 px-2 py-1 text-sm font-black border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800"
                          />
                          {scan.year && scanYears[scan.id] === scan.year && (
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">✓ Saved</span>
                          )}
                          {scan.year && !scanYears[scan.id] && (
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Auto: {scan.year}</span>
                          )}
                          <button
                            onClick={() => saveYearForScan(scan.id, scanYears[scan.id] || '')}
                            disabled={savingYear === scan.id || !scanYears[scan.id]}
                            className="px-3 py-1 text-xs font-black bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            {savingYear === scan.id ? 'Saving...' : 'Set Year'}
                          </button>
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

                        {/* REI Cognitive Synthesis - Main Card Progress */}
                        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-lg relative overflow-hidden group">
                          {/* Animated background glow */}
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-50 group-hover:opacity-100 transition-opacity" />

                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                  <Brain size={14} className="text-indigo-400" />
                                </div>
                                <div>
                                  <h4 className="text-[11px] font-black text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                                    REI Cognitive Engine <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  </h4>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedScan(scan)}
                                className="text-[10px] font-black text-indigo-200 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest transition-colors flex items-center gap-1.5 border border-white/10 cursor-pointer"
                              >
                                Synthesized {scan.analysis_data?.questions?.length || 0} / {scan.question_count} <Eye size={10} className="opacity-70" />
                              </button>
                            </div>

                            <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden shadow-inner w-full">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                style={{ width: `${Math.min(100, ((scan.analysis_data?.questions?.length || 0) / (Math.max(scan.question_count, 1))) * 100)}%` }}
                              />
                            </div>
                            {scan.question_count > 0 && scan.analysis_data?.questions?.length === scan.question_count ? (
                              <p className="text-[10px] text-indigo-300 font-medium mt-2 flex items-center gap-1.5">
                                <CheckCircle2 size={10} className="text-emerald-400" /> Auto-Reasoning & Predictive Insights Ready. Click to view details.
                              </p>
                            ) : (
                              <p className="text-[10px] text-indigo-300/70 font-medium mt-2">
                                System actively mapping insights in background...
                              </p>
                            )}
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

            {/* Scan Details Modal */}
            {selectedScan && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
                <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                  {/* Modal Header */}
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedScan.paper_name}</h2>
                      <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
                        <span className="text-primary-600">
                          {selectedScan.is_combined_paper && selectedScan.subjects ? selectedScan.subjects.join(', ') : selectedScan.subject}
                        </span>
                        <span>•</span>
                        <span>{selectedScan.exam_context}</span>
                        <span>•</span>
                        <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] uppercase">{selectedScan.id.substring(0, 8)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedScan(null);
                        setShowOnlyUnmapped(false);
                      }}
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
                          <span className="text-sm font-bold text-slate-500 mb-1.5 whitespace-nowrap">
                            {selectedScan.mapping_success_rate === 100 ? 'Mapped to Topics' : 'Partial Match'}
                          </span>
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

                    {/* REI Cognitive Synthesis Engine v4.0 */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Brain size={20} className="text-purple-600" />
                          REI Cognitive Synthesis Engine v4.0
                        </h3>
                        <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5 uppercase tracking-wide">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </div>
                      </div>

                      <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 bg-slate-50 border-b border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mapping Progress</span>
                              <button
                                onClick={() => setShowOnlyUnmapped(!showOnlyUnmapped)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 ${showOnlyUnmapped ? 'bg-orange-500 text-white border-orange-400 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                              >
                                {showOnlyUnmapped ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                {showOnlyUnmapped ? 'Showing Unmapped Only' : 'Filter Unmapped'}
                              </button>
                            </div>
                            <span className="text-xs font-black text-slate-900 bg-white px-3 py-1 rounded-full border border-slate-200">
                              Synthesized {selectedScan.analysis_data?.questions?.length || 0} / {selectedScan.question_count} Questions
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min(100, ((selectedScan.analysis_data?.questions?.length || 0) / (Math.max(selectedScan.question_count, 1))) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="divide-y divide-slate-50 max-h-[450px] overflow-y-auto">
                          {(() => {
                            const questions = selectedScan.analysis_data?.questions || [];
                            if (questions.length === 0) {
                              return (
                                <div className="p-8 text-center">
                                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Brain size={20} className="text-slate-400" />
                                  </div>
                                  <p className="text-sm text-slate-500 font-bold">No questions synthesized yet.</p>
                                </div>
                              );
                            }

                            return questions.map((q: any, idx: number) => {
                              const topic = q.topic || '';
                              const matchingTopic = findMatchingOfficialTopic(topic, officialTopicsList);
                              const isUnmapped = ['General', 'Mathematics', 'Physics', 'Biology', 'Chemistry', 'Botany', 'Zoology', 'Unknown', 'Unmapped', ''].includes(topic) || !matchingTopic;

                              if (showOnlyUnmapped && !isUnmapped) return null;

                              const isExpanded = expandedQuestions[idx] || false;
                              return (
                                <div key={idx} className={`hover:bg-slate-50 transition-colors border-l-4 ${isUnmapped ? 'border-orange-500 bg-orange-50/10' : 'border-transparent'}`}>
                                  <div
                                    className="p-4 flex items-center gap-4 cursor-pointer select-none group"
                                    onClick={() => setExpandedQuestions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black transition-colors ${isExpanded ? 'bg-purple-100 text-purple-700' : isUnmapped ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-4">
                                      <p className={`text-sm font-bold truncate transition-colors ${isExpanded ? 'text-purple-900' : isUnmapped ? 'text-orange-900' : 'text-slate-700'}`}>
                                        {q.text || q.question || 'No question text provided'}
                                      </p>
                                      <div className="flex items-center gap-3 mt-1.5">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase border ${isUnmapped ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-purple-600 bg-purple-50 border-purple-100'}`}>
                                          Topic: {q.topic || 'Unclassified'}
                                        </span>
                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100">
                                          Difficulty: {q.difficulty || 'Medium'}
                                        </span>
                                        {selectedScan.is_combined_paper && (q.subject || selectedScan.subject) && (
                                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase border ${(q.subject === 'Botany' || (idx + 1 > 100 && idx + 1 <= 150)) ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                            (q.subject === 'Zoology' || idx + 1 > 150) ? 'text-orange-600 bg-orange-50 border-orange-100' :
                                              'text-rose-600 bg-rose-50 border-rose-100'
                                            }`}>
                                            Subject: {(() => {
                                              let subj = q.subject || selectedScan.subject;
                                              if (subj === 'Biology' && selectedScan.exam_context === 'NEET') {
                                                const idParts = (q.id || '').split(/[^0-9]/).filter(Boolean);
                                                const qNum = idParts.length > 0 ? parseInt(idParts[idParts.length - 1]) : (idx + 1);
                                                if (qNum > 100 && qNum <= 150) return 'Botany';
                                                if (qNum > 150) return 'Zoology';
                                              }
                                              return subj;
                                            })()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className={`flex-shrink-0 p-2 rounded-full transition-colors ${isExpanded ? 'bg-purple-100 text-purple-600' : 'text-slate-400 group-hover:bg-slate-200'}`}>
                                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3">
                                      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-300" />
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                          <Brain size={12} /> AI Reasoning Engine
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                          {q.ai_reasoning || q.explanation || 'No deep reasoning generated for this question yet. System will regenerate in next pass.'}
                                        </p>
                                      </div>
                                      <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 relative overflow-hidden shadow-sm">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400" />
                                        <div className="flex items-center gap-1.5 mb-1.5 text-indigo-600">
                                          <Zap size={12} fill="currentColor" />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Predictive Insight</span>
                                        </div>
                                        <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                                          {q.predictive_insight || q.masteryMaterial?.coreConcept || 'No specific predictive anchors mapped. Suggest triggering REI deep-scan.'}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
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
                            const genericTopics = ['General', 'Mathematics', 'Physics', 'Biology', 'Chemistry', 'Botany', 'Zoology', 'Unknown', ''];

                            return questions.filter((q: any) => {
                              const topic = q.topic || '';
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
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-12 min-h-[600px] shadow-3xl">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase font-outfit text-white">REI Prediction Oracle</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">Tactical Strategy Forecast v4.0 (March 2026 Edition)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {activeExamContext}
                  </div>
                  <div className="px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {activeSubject}
                  </div>
                </div>
              </div>

              <StrategicBriefing exam={activeExamContext} subject={activeSubject} />
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default AdminScanApproval;
