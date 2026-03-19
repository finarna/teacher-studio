import type { Scan, TestAttempt, TestResponse, AnalyzedQuestion } from '../types';

/**
 * Converts a raw scan filename like "02-KCET-BOARD-EXAM-MATHS-20-05-2023-M7 [14:40]"
 * into a clean, human-readable display name like "KCET 2023 Paper" 
 */
export const formatScanDisplayName = (
    name: string,
    examContext?: string,
    subject?: string
): string => {
    // Extract year from the filename (e.g. 2023 from "...20-05-2023...")
    const yearMatch = name.match(/20\d{2}/);
    const year = yearMatch ? yearMatch[0] : null;

    // Extract paper number/set if present (e.g. M7, Set-A, P2)
    const setMatch = name.match(/\b([A-Z]\d+|Set[- ]?[A-Z\d]+|P\d+|Q\d+)\b/i);
    const paperSet = setMatch ? ` (Set ${setMatch[1].replace(/^(Set[- ]?)/i, '')})` : '';

    const exam = examContext?.toUpperCase() || '';
    const sub = subject ? ` ${subject}` : '';

    if (year) {
        return `${exam}${sub} ${year} Paper${paperSet}`.trim();
    }
    // Fallback: capitalise the raw name cleanly
    return name.replace(/[\[\(].*?[\]\)]/g, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
};


/**
 * Converts a Scan (exam paper) and user's practice history into a format 
 * compatible with the TestResultsPage / PerformanceAnalysis components.
 */
export const transformScanToAttempt = (
    scan: Scan,
    userId: string,
    solvedQuestionIds: Set<string> = new Set()
): {
    attempt: TestAttempt;
    questions: AnalyzedQuestion[];
    responses: TestResponse[];
} => {
    const isCombined = !!(scan as any).isCombinedPaper || (scan.analysisData?.questions?.length || 0) > 100 || scan.subject === 'Combined';
    
    // INFER SUBJECTS/SECTIONS FOR NEET COMBINED PAPERS
    const rawQuestions = scan.analysisData?.questions || [];
    const questions: AnalyzedQuestion[] = rawQuestions.map((q: any, idx: number) => {
        let inferredSubject = q.subject || scan.subject;
        let inferredSection = q.section || 'Section A';
        const qOrder = Number(q.question_order ?? q.questionOrder ?? idx);

        if (scan.examContext === 'NEET' && isCombined && (!inferredSubject || inferredSubject === 'Combined' || inferredSubject === 'Biology')) {
            if (qOrder < 50) {
                inferredSubject = 'Physics';
                inferredSection = qOrder < 35 ? 'Section A' : 'Section B';
            } else if (qOrder >= 50 && qOrder < 100) {
                inferredSubject = 'Chemistry';
                inferredSection = (qOrder - 50) < 35 ? 'Section A' : 'Section B';
            } else if (qOrder >= 100 && qOrder < 150) {
                inferredSubject = 'Botany';
                inferredSection = (qOrder - 100) < 35 ? 'Section A' : 'Section B';
            } else if (qOrder >= 150) {
                inferredSubject = 'Zoology';
                inferredSection = (qOrder - 150) < 35 ? 'Section A' : 'Section B';
            }
        }

        return {
            ...q,
            subject: inferredSubject,
            section: inferredSection
        };
    });

    // Calculate paper insights
    const totalMarks = questions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 1), 0);

    const bloomsCounts: Record<string, number> = {};
    questions.forEach((q: any) => {
        const blooms = q.blooms || 'Understanding';
        bloomsCounts[blooms] = (bloomsCounts[blooms] || 0) + 1;
    });

    const bloomsDistribution = Object.entries(bloomsCounts).map(([name, count]) => ({
        name,
        percentage: questions.length > 0 ? Math.round((count / questions.length) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);

    const domainMarks: Record<string, number> = {};
    questions.forEach((q: any) => {
        const domain = q.domain || 'General';
        domainMarks[domain] = (domainMarks[domain] || 0) + (Number(q.marks) || 1);
    });

    const topDomains = Object.entries(domainMarks)
        .map(([name, marks]) => ({ name, marks }))
        .sort((a, b) => b.marks - a.marks)
        .slice(0, 3);

    // Create a virtual attempt object
    // Extract year from scan metadata first, then fall back to name parsing
    const yearFromName = scan.name?.match(/20\d{2}/)?.[0];
    const displayYear = (scan as any).year || yearFromName;
    const displayName = displayYear
        ? `${(scan.examContext || '').toUpperCase()} ${scan.subject} ${displayYear} PYQ`
        : formatScanDisplayName(scan.name, scan.examContext, scan.subject);

    const attempt: TestAttempt = {
        id: `scan-${scan.id}`,
        userId: userId,
        testType: 'full_mock', // Treat it as a full paper
        testName: displayName,
        subject: scan.subject as any,
        examContext: scan.examContext as any,
        totalQuestions: questions.length,
        durationMinutes: 200, // Official NEET duration
        startTime: new Date(scan.timestamp),
        completedAt: new Date(scan.timestamp),
        status: 'completed',
        questionsAttempted: solvedQuestionIds.size,
        analysisInsights: {
            totalMarks,
            avgDifficulty: 0,
            bloomsDistribution,
            topDomains
        },
        aiReport: (scan.analysisData?.ai_report && !((scan as any).isCombinedPaper && scan.subject !== 'Combined')) ? {
            ...scan.analysisData.ai_report,
            isBlueprint: true
        } : (scan.analysisData?.summary ? {
            verdict: scan.analysisData?.summary || "Official paper analysis for " + scan.name,
            strengths: (scan.analysisData?.trends || []).map((t: any) => ({
                title: t.title,
                detail: t.description
            })),
            weaknesses: (scan.analysisData?.chapterInsights || []).slice(0, 3).map((ci: any) => ({
                title: `Focus: ${ci.topic}`,
                detail: ci.description
            })),
            studyPlan: Array.isArray(scan.analysisData?.strategy)
                ? scan.analysisData.strategy.join('\n')
                : (scan.analysisData?.strategy || "No strategy defined for this paper."),
            isBlueprint: true
        } : null), // Return null if nothing meaningful to show, forcing re-fetch in PerformanceAnalysis
        createdAt: new Date(scan.timestamp)
    };

    // Map solved questions to responses
    const responses: TestResponse[] = questions.map(q => {
        // Check if user solved this specific question
        const isSolved = solvedQuestionIds.has(q.id) || solvedQuestionIds.has(`${scan.id}-${q.id}`);

        return {
            id: `resp-${q.id}-${userId}`,
            attemptId: attempt.id,
            questionId: q.id,
            selectedOption: isSolved ? q.correctOptionIndex : undefined,
            isCorrect: isSolved,
            timeSpent: 0,
            markedForReview: false,
            topic: q.topic,
            difficulty: q.difficulty,
            marks: typeof q.marks === 'number' ? q.marks : parseInt(q.marks || '0'),
            createdAt: new Date()
        };
    });

    return { attempt, questions, responses };
};
