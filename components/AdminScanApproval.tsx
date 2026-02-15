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
}

const AdminScanApproval: React.FC = () => {
  const [scans, setScans] = useState<ScanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanInfo | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished'>('all');

  useEffect(() => {
    loadScans();
  }, []);

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

      for (const question of questions) {
        if (!question.topic) {
          unmatched++;
          continue;
        }

        // Find matching official topic (case-insensitive, partial match)
        const matchingTopic = topics.find(t =>
          t.name.toLowerCase() === question.topic.toLowerCase() ||
          t.name.toLowerCase().includes(question.topic.toLowerCase()) ||
          question.topic.toLowerCase().includes(t.name.toLowerCase())
        );

        if (matchingTopic) {
          mappings.push({
            question_id: question.id,
            topic_id: matchingTopic.id
          });
          matched++;
        } else {
          unmatched++;
        }
      }

      console.log(`📊 Mapping results: ${matched} matched, ${unmatched} unmatched`);

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

  const loadScans = async () => {
    setLoading(true);
    try {
      // Get all scans (not just completed ones - we'll filter by status more flexibly)
      const { data: scanData, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (scanError) {
        console.error('Error loading scans:', scanError);
        throw scanError;
      }

      console.log('📊 Loaded scans:', scanData);

      // Filter for completed scans (case-insensitive)
      const completedScans = (scanData || []).filter(scan =>
        scan.status?.toLowerCase() === 'complete' ||
        scan.status?.toLowerCase() === 'completed'
      );

      console.log('✅ Completed scans:', completedScans.length);

      // For each scan, get question and mapping counts
      const scansWithCounts = await Promise.all(
        completedScans.map(async (scan) => {
          // Get total questions
          const { count: totalQuestions } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('scan_id', scan.id);

          // Get question IDs for this scan
          const { data: questionIds } = await supabase
            .from('questions')
            .select('id')
            .eq('scan_id', scan.id);

          // Get mapped questions count
          let mappedQuestions = 0;
          if (questionIds && questionIds.length > 0) {
            const questionIdList = questionIds.map(q => q.id);
            const { count } = await supabase
              .from('topic_question_mapping')
              .select('question_id', { count: 'exact', head: true })
              .in('question_id', questionIdList);
            mappedQuestions = count || 0;
          }

          const questionCount = totalQuestions || 0;
          const mappedCount = mappedQuestions || 0;
          const unmappedCount = questionCount - mappedCount;
          const successRate = questionCount > 0
            ? Math.round((mappedCount / questionCount) * 100)
            : 0;

          // Check for visual/sketch notes (multiple sources)
          // Main source: topicBasedSketches from scan.analysis_data
          let sketchCount = 0;
          if (scan.analysis_data?.topicBasedSketches) {
            sketchCount = Object.keys(scan.analysis_data.topicBasedSketches).length;
          }

          // Check for flashcards from flashcards table
          // Flashcards are stored as JSONB array in the 'data' column
          let flashcardCount = 0;
          const { data: fcData, error: fcError } = await supabase
            .from('flashcards')
            .select('data')
            .eq('scan_id', scan.id)
            .single();

          // Count cards in the data array
          if (!fcError && fcData?.data && Array.isArray(fcData.data)) {
            flashcardCount = fcData.data.length;
          }

          // Check if exam analysis exists (from analysis_data field)
          const hasExamAnalysis = scan.analysis_data &&
            (scan.analysis_data.difficulty_distribution ||
             scan.analysis_data.topic_distribution ||
             scan.analysis_data.summary);

          return {
            id: scan.id,
            paper_name: scan.paper_name || 'Untitled Scan',
            subject: scan.subject,
            exam_context: scan.exam_context,
            status: scan.status,
            is_system_scan: scan.is_system_scan || false,
            created_at: scan.created_at,
            question_count: questionCount,
            mapped_count: mappedCount,
            unmapped_count: unmappedCount,
            mapping_success_rate: successRate,
            has_visual_notes: (sketchCount || 0) > 0,
            has_flashcards: (flashcardCount || 0) > 0,
            has_exam_analysis: hasExamAnalysis || false,
            visual_notes_count: sketchCount || 0,
            flashcards_count: flashcardCount || 0
          };
        })
      );

      setScans(scansWithCounts);

      if (scansWithCounts.length === 0) {
        console.warn('⚠️ No completed scans found. Total scans in DB:', scanData?.length || 0);
        if (scanData && scanData.length > 0) {
          console.log('📋 All scans:', scanData.map(s => ({ id: s.id, paper_name: s.paper_name, status: s.status })));
        }
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
      // First, unpublish any other scans for the same subject/exam
      const scan = scans.find(s => s.id === scanId);
      if (!scan) return;

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

      // Step 4: Publish this scan
      const { error: publishError } = await supabase
        .from('scans')
        .update({ is_system_scan: true })
        .eq('id', scanId);

      if (publishError) throw publishError;

      // Step 5: Automatically map questions to official topics
      console.log('🔗 Auto-mapping questions to topics...');
      await mapScanQuestionsToTopics(scanId, scan.subject);

      console.log(`✅ Published scan ${scanId} to system with auto-mapped questions`);
      await loadScans();
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
      await loadScans();
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

  const filteredScans = scans.filter(scan => {
    if (filterStatus === 'published') return scan.is_system_scan;
    if (filterStatus === 'unpublished') return !scan.is_system_scan;
    return true;
  });

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
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Scans ({scans.length})
            </button>
            <button
              onClick={() => setFilterStatus('published')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                filterStatus === 'published'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Published ({scans.filter(s => s.is_system_scan).length})
            </button>
            <button
              onClick={() => setFilterStatus('unpublished')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                filterStatus === 'unpublished'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unpublished ({scans.filter(s => !s.is_system_scan).length})
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
                className={`bg-white rounded-xl border-2 p-6 transition-all ${
                  scan.is_system_scan
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

                      <div className={`rounded-lg p-3 border ${
                        scan.unmapped_count === 0
                          ? 'bg-slate-50 border-slate-100'
                          : 'bg-orange-50 border-orange-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle size={14} className={scan.unmapped_count === 0 ? 'text-slate-400' : 'text-orange-500'} />
                          <span className={`text-xs font-bold uppercase ${
                            scan.unmapped_count === 0 ? 'text-slate-400' : 'text-orange-600'
                          }`}>Unmapped</span>
                        </div>
                        <div className={`text-2xl font-black ${
                          scan.unmapped_count === 0 ? 'text-slate-600' : 'text-orange-700'
                        }`}>
                          {scan.unmapped_count}
                        </div>
                        <div className={`text-xs ${
                          scan.unmapped_count === 0 ? 'text-slate-500' : 'text-orange-600'
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

      {/* Scan Details Modal (simplified for now) */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">Scan Details</h2>
                <button
                  onClick={() => setSelectedScan(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle size={24} className="text-slate-400" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-black text-slate-900 mb-4">{selectedScan.paper_name}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Scan ID:</span>
                  <span className="font-mono text-slate-700">{selectedScan.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-slate-900">{selectedScan.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exam Context:</span>
                  <span className="font-bold text-slate-900">{selectedScan.exam_context}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created:</span>
                  <span className="text-slate-700">{new Date(selectedScan.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-bold ${selectedScan.is_system_scan ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {selectedScan.is_system_scan ? 'Published' : 'Unpublished'}
                  </span>
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
