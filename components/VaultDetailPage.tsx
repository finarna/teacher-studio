import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Scan } from '../types';
import { TestResultsPage } from './TestResultsPage';
import { transformScanToAttempt } from '../utils/scanTransformers';
import { useLearningJourney } from '../contexts/LearningJourneyContext';

interface VaultDetailPageProps {
  scanId: string;
  onBack: () => void;
  filterSubject?: string; // When opening from a subject hub, filter to show only this subject's questions
}

const VaultDetailPage: React.FC<VaultDetailPageProps> = ({ scanId, onBack, filterSubject }) => {
  const { startVaultPractice } = useLearningJourney();
  const [data, setData] = useState<{
    scan: Scan;
    attempt: any;
    questions: any[];
    responses: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScanAndPracticeData();
  }, [scanId]);

  const fetchScanAndPracticeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch User ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // 2. Fetch the full scan with all data
      const { data: scanData, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (scanError) throw scanError;
      if (!scanData) throw new Error('Scan not found');

      // 3. Fetch practice answers for this scan to show solved status
      const { data: practiceData } = await supabase
        .from('practice_answers')
        .select('question_id')
        .eq('user_id', userId)
        .eq('is_correct', true);

      const solvedQuestionIds = new Set(practiceData?.map(p => p.question_id) || []);

      // 4. Map database columns to Scan type format
      const mappedScan: Scan = {
        id: scanData.id,
        name: scanData.name,
        date: scanData.scan_date || scanData.created_at || '',
        timestamp: scanData.created_at ? new Date(scanData.created_at).getTime() : Date.now(),
        status: scanData.status,
        grade: scanData.grade,
        subject: scanData.subject,
        examContext: scanData.exam_context,
        analysisData: scanData.analysis_data,
        year: scanData.year,
        isCombinedPaper: !!scanData.is_combined_paper, // Ensure this is mapped!
      } as any;

      if (filterSubject && mappedScan.analysisData?.questions) {
        const isCombined = !!mappedScan.isCombinedPaper;
        
        // CRITICAL FIRST STEP: Ensure each question has its true paper order
        const questionsWithOrder = mappedScan.analysisData.questions.map((q: any, idx: number) => ({
          ...q,
          question_order: Number(q.question_order ?? q.questionOrder ?? idx)
        }));

        // Now filter based on the Hub subject
        const filteredQuestions = (mappedScan.subject === filterSubject && !isCombined)
          ? questionsWithOrder
          : questionsWithOrder.filter(
            (q: any) => {
              // Direct subject tag match (Priority)
              if (q.subject === filterSubject) return true;
              
              // Positional match for NEET combined scans
              if (mappedScan.examContext === 'NEET' && isCombined) {
                const qNum = q.question_order;
                if (filterSubject === 'Physics') return qNum < 50;
                if (filterSubject === 'Chemistry') return qNum >= 50 && qNum < 100;
                if (filterSubject === 'Botany') return qNum >= 100 && qNum < 150;
                if (filterSubject === 'Zoology') return qNum >= 150 && qNum < 200;
              }
              return false;
            }
          );

        mappedScan.analysisData = {
          ...mappedScan.analysisData,
          questions: filteredQuestions
        };
      }

      const transformed = transformScanToAttempt(mappedScan, userId, solvedQuestionIds);

      setData({
        scan: mappedScan,
        attempt: transformed.attempt,
        questions: transformed.questions,
        responses: transformed.responses,
      });

      console.log('🏛️ [VaultDetailPage] Scan & Practice data loaded:', mappedScan.id);
    } catch (err) {
      console.error('Error fetching scan data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vault item');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-in fade-in zoom-in duration-700">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/10 relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-[2rem] animate-ping" />
            <Loader2 size={32} className="text-indigo-400 animate-spin relative z-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tighter mb-1">Looking into the Vault</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Wait until you see what's hidden inside...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="font-black text-xl text-slate-900 mb-2 font-outfit uppercase tracking-tight">Access Error</h2>
            <p className="text-sm text-slate-600 mb-8 font-instrument">{error || 'Vault item not found'}</p>
            <button
              onClick={onBack}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              Back to Archive
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleStartPractice = () => {
    if (data && scanId) {
      void startVaultPractice(scanId, data.questions);
    }
  };

  return (
    <TestResultsPage
      attempt={data.attempt}
      questions={data.questions}
      responses={data.responses}
      onBack={onBack}
      mode="vault"
      onStartPractice={handleStartPractice}
    />
  );
};

export default VaultDetailPage;
