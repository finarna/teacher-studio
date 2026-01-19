import { useState, useCallback } from 'react';
import { MasteryState } from '../types';

export const useAdaptiveLogic = () => {
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [showRemediation, setShowRemediation] = useState(false);
  const [state, setState] = useState<MasteryState>('LEARNING');

  const processAnswer = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      setConsecutiveWrong(0);
      setConsecutiveCorrect(prev => prev + 1);
      setShowRemediation(false);
      
      // State transition rule: 3 correct in a row in Assessment phase -> Mastered
      if (state === 'ASSESSING' && consecutiveCorrect + 1 >= 3) {
         setState('MASTERED');
      }
    } else {
      setConsecutiveCorrect(0);
      setConsecutiveWrong(prev => {
        const newVal = prev + 1;
        // Rule: 2 wrong -> Remediation
        if (newVal >= 2) {
          setShowRemediation(true);
        }
        return newVal;
      });
    }
  }, [state, consecutiveCorrect]);

  const clearRemediation = useCallback(() => {
    setShowRemediation(false);
    setConsecutiveWrong(0);
  }, []);

  const shouldUnlockExam = useCallback((score: number) => {
    return score >= 80;
  }, []);

  return {
    masteryState: state,
    showRemediation,
    processAnswer,
    clearRemediation,
    shouldUnlockExam
  };
};