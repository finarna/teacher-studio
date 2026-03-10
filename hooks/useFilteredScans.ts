import { useMemo } from 'react';
import { Scan } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface FilteredScansResult {
  scans: Scan[];
  count: number;
  hasScans: boolean;
  totalScans: number;
}

/**
 * Custom hook to filter scans by active subject and exam context
 *
 * @param allScans - Array of all scans
 * @returns Filtered scans matching the active subject and exam context
 */
export const useFilteredScans = (allScans: Scan[]): FilteredScansResult => {
  const { activeSubject, activeExamContext } = useAppContext();

  const filteredScans = useMemo(() => {
    if (!allScans || allScans.length === 0) {
      return [];
    }

    return allScans.filter(scan => {
      // EXCLUDE AI practice placeholder scans
      const isPlaceholder = scan.metadata?.is_ai_practice_placeholder === true ||
        scan.metadata?.hidden_from_scans_list === true;
      if (isPlaceholder) {
        return false;
      }

      // NEW: Combined paper — match if activeSubject is one of its subjects
      if (scan.isCombinedPaper && Array.isArray(scan.subjects)) {
        const hasSubject = scan.subjects.includes(activeSubject as any);
        const examMatch = !scan.examContext || scan.examContext === activeExamContext;
        return hasSubject && examMatch;
      }

      // EXISTING: Single subject scans
      const subjectMatch = scan.subject === activeSubject;
      const examMatch = !scan.examContext || scan.examContext === activeExamContext;

      return subjectMatch && examMatch;
    });
  }, [allScans, activeSubject, activeExamContext]);

  return {
    scans: filteredScans,
    count: filteredScans.length,
    hasScans: filteredScans.length > 0,
    totalScans: allScans?.length || 0
  };
};

/**
 * Custom hook to get statistics about filtered scans
 *
 * @param allScans - Array of all scans
 * @returns Statistics about the scans
 */
export const useSubjectStats = (allScans: Scan[]) => {
  const { activeSubject } = useAppContext();
  const { scans: filteredScans } = useFilteredScans(allScans);

  const stats = useMemo(() => {
    const totalScans = filteredScans.length;
    const completedScans = filteredScans.filter(s => s.status === 'Complete').length;
    const processingScans = filteredScans.filter(s => s.status === 'Processing').length;
    const failedScans = filteredScans.filter(s => s.status === 'Failed').length;

    // Helper to get questions for the specific subject
    const getTargetQuestions = (scan: Scan) => {
      const allQs = scan.analysisData?.questions || [];
      if (!scan.isCombinedPaper) return allQs;
      // For combined papers, only count questions tagged with this subject
      return allQs.filter(q => (q as any).subject === activeSubject);
    };

    // Count total questions for this subject
    const totalQuestions = filteredScans.reduce((sum, scan) => {
      return sum + getTargetQuestions(scan).length;
    }, 0);

    // Get unique topics for this subject
    const uniqueTopics = new Set<string>();
    filteredScans.forEach(scan => {
      getTargetQuestions(scan).forEach(q => {
        if (q.topic) {
          uniqueTopics.add(q.topic);
        }
      });
    });

    return {
      totalScans,
      completedScans,
      processingScans,
      failedScans,
      totalQuestions,
      uniqueTopics: uniqueTopics.size
    };
  }, [filteredScans, activeSubject]);

  return stats;
};
