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
      // EXCLUDE AI practice placeholder scans (used only for satisfying questions.scan_id foreign key)
      // These are internal system scans, not user-uploaded exam papers
      const isPlaceholder = scan.metadata?.is_ai_practice_placeholder === true ||
                           scan.metadata?.hidden_from_scans_list === true;
      if (isPlaceholder) {
        return false; // Don't show placeholder scans in main scans list
      }

      // Filter by subject (required)
      const subjectMatch = scan.subject === activeSubject;

      // Filter by exam context - if scan has no examContext, include it
      // This handles legacy scans that were uploaded before exam context was added
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
  const { scans: filteredScans } = useFilteredScans(allScans);

  const stats = useMemo(() => {
    const totalScans = filteredScans.length;
    const completedScans = filteredScans.filter(s => s.status === 'Complete').length;
    const processingScans = filteredScans.filter(s => s.status === 'Processing').length;
    const failedScans = filteredScans.filter(s => s.status === 'Failed').length;

    // Count total questions
    const totalQuestions = filteredScans.reduce((sum, scan) => {
      return sum + (scan.analysisData?.questions?.length || 0);
    }, 0);

    // Get unique topics
    const uniqueTopics = new Set<string>();
    filteredScans.forEach(scan => {
      scan.analysisData?.questions?.forEach(q => {
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
  }, [filteredScans]);

  return stats;
};
