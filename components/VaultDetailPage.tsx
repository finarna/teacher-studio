import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Scan } from '../types';
import ExamAnalysis from './ExamAnalysis';

interface VaultDetailPageProps {
  scanId: string;
  onBack: () => void;
}

const VaultDetailPage: React.FC<VaultDetailPageProps> = ({ scanId, onBack }) => {
  const [scan, setScan] = useState<Scan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);

  useEffect(() => {
    fetchScanData();
  }, [scanId]);

  const fetchScanData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch the full scan with all data
      const { data: scanData, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (scanError) throw scanError;

      if (!scanData) {
        throw new Error('Scan not found');
      }

      // Map database columns to Scan type format
      const mappedScan: Scan = {
        id: scanData.id,
        name: scanData.name,
        date: scanData.scan_date || scanData.created_at || '',
        timestamp: scanData.created_at ? new Date(scanData.created_at).getTime() : Date.now(),
        status: scanData.status,
        grade: scanData.grade,
        subject: scanData.subject,
        examContext: scanData.exam_context,
        analysisData: scanData.analysis_data
      };

      setScan(mappedScan);

      // Extract year from questions for this scan
      const { data: questionData } = await supabase
        .from('questions')
        .select('year')
        .eq('scan_id', scanId)
        .not('year', 'is', null)
        .limit(1)
        .single();

      if (questionData?.year) {
        setYear(questionData.year);
      }
    } catch (err) {
      console.error('Error fetching scan:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scan');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-600">Loading exam paper...</p>
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border-2 border-red-200 rounded-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="font-black text-xl text-slate-900 mb-2">Failed to Load</h2>
            <p className="text-sm text-slate-600 mb-6">{error || 'Scan not found'}</p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg text-sm font-black hover:bg-slate-800 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExamAnalysis
      onBack={onBack}
      scan={scan}
      recentScans={[scan]}
      showOnlyVault={true}
      year={year || undefined}
    />
  );
};

export default VaultDetailPage;
