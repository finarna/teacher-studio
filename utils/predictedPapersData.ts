import mathSetA from '../flagship_final.json';
import mathSetB from '../flagship_final_b.json';
import physicsSetA from '../flagship_physics_final.json';
import physicsSetB from '../flagship_physics_final_b.json';
import chemistrySetA from '../flagship_chemistry_final.json';
import chemistrySetB from '../flagship_chemistry_final_b.json';
import biologySetA from '../flagship_biology_final.json';
import biologySetB from '../flagship_biology_final_b.json';

// NEET 2026 Flagship Papers
import neetPhysicsSetA from '../flagship_neet_physics_2026_set_a.json';
import neetPhysicsSetB from '../flagship_neet_physics_2026_set_b.json';
import neetChemistrySetA from '../flagship_neet_chemistry_2026_set_a.json';
import neetChemistrySetB from '../flagship_neet_chemistry_2026_set_b.json';

export interface Question {
    id: string;
    text: string;
    options: string[];
    marks: number;
    difficulty: string;
    topic: string;
}

export interface PaperSet {
    id: string;
    title: string;
    subject: string;
    setName: string;
    examContext?: string; // KCET, NEET, etc.
    questions: Question[];
}

/**
 * Aggregates all flagged prediction data into a consistent format for the UI.
 */
export const getPredictedPapers = (): PaperSet[] => {
    const papers: PaperSet[] = [
        // KCET 2026 Papers
        {
            id: 'math-a',
            title: 'PLUS2AI OFFICIAL MATH PREDICTION 2026: SET-A',
            subject: 'Mathematics',
            setName: 'A',
            examContext: 'KCET',
            questions: (mathSetA as any).test_config?.questions || (mathSetA as any).questions || []
        },
        {
            id: 'math-b',
            title: 'PLUS2AI OFFICIAL MATH PREDICTION 2026: SET-B',
            subject: 'Mathematics',
            setName: 'B',
            examContext: 'KCET',
            questions: (mathSetB as any).test_config?.questions || (mathSetB as any).questions || []
        },
        {
            id: 'physics-a',
            title: 'PLUS2AI OFFICIAL PHYSICS PREDICTION 2026: SET-A',
            subject: 'Physics',
            setName: 'A',
            examContext: 'KCET',
            questions: (physicsSetA as any).test_config?.questions || (physicsSetA as any).questions || []
        },
        {
            id: 'physics-b',
            title: 'PLUS2AI OFFICIAL PHYSICS PREDICTION 2026: SET-B',
            subject: 'Physics',
            setName: 'B',
            examContext: 'KCET',
            questions: (physicsSetB as any).test_config?.questions || (physicsSetB as any).questions || []
        },
        {
            id: 'chemistry-a',
            title: 'PLUS2AI OFFICIAL CHEMISTRY PREDICTION 2026: SET-A',
            subject: 'Chemistry',
            setName: 'A',
            examContext: 'KCET',
            questions: (chemistrySetA as any).test_config?.questions || (chemistrySetA as any).questions || []
        },
        {
            id: 'chemistry-b',
            title: 'PLUS2AI OFFICIAL CHEMISTRY PREDICTION 2026: SET-B',
            subject: 'Chemistry',
            setName: 'B',
            examContext: 'KCET',
            questions: (chemistrySetB as any).test_config?.questions || (chemistrySetB as any).questions || []
        },
        {
            id: 'biology-a',
            title: 'PLUS2AI OFFICIAL BIOLOGY PREDICTION 2026: SET-A',
            subject: 'Biology',
            setName: 'A',
            examContext: 'KCET',
            questions: (biologySetA as any).test_config?.questions || (biologySetA as any).questions || []
        },
        {
            id: 'biology-b',
            title: 'PLUS2AI OFFICIAL BIOLOGY PREDICTION 2026: SET-B',
            subject: 'Biology',
            setName: 'B',
            examContext: 'KCET',
            questions: (biologySetB as any).test_config?.questions || (biologySetB as any).questions || []
        },

        // NEET 2026 Papers
        {
            id: 'neet-physics-a',
            title: 'PLUS2AI OFFICIAL NEET PHYSICS PREDICTION 2026: SET-A',
            subject: 'Physics',
            setName: 'A',
            examContext: 'NEET',
            questions: (neetPhysicsSetA as any).test_config?.questions || []
        },
        {
            id: 'neet-physics-b',
            title: 'PLUS2AI OFFICIAL NEET PHYSICS PREDICTION 2026: SET-B',
            subject: 'Physics',
            setName: 'B',
            examContext: 'NEET',
            questions: (neetPhysicsSetB as any).test_config?.questions || []
        },
        {
            id: 'neet-chemistry-a',
            title: 'PLUS2AI OFFICIAL NEET CHEMISTRY PREDICTION 2026: SET-A',
            subject: 'Chemistry',
            setName: 'A',
            examContext: 'NEET',
            questions: (neetChemistrySetA as any).test_config?.questions || []
        },
        {
            id: 'neet-chemistry-b',
            title: 'PLUS2AI OFFICIAL NEET CHEMISTRY PREDICTION 2026: SET-B',
            subject: 'Chemistry',
            setName: 'B',
            examContext: 'NEET',
            questions: (neetChemistrySetB as any).test_config?.questions || []
        },
        {
            id: 'neet-biology-a',
            title: 'PLUS2AI OFFICIAL NEET BIOLOGY PREDICTION 2026: SET-A',
            subject: 'Biology',
            setName: 'A',
            examContext: 'NEET',
            questions: (biologySetA as any).test_config?.questions || (biologySetA as any).questions || []
        },
        {
            id: 'neet-biology-b',
            title: 'PLUS2AI OFFICIAL NEET BIOLOGY PREDICTION 2026: SET-B',
            subject: 'Biology',
            setName: 'B',
            examContext: 'NEET',
            questions: (biologySetB as any).test_config?.questions || (biologySetB as any).questions || []
        }
    ];

    // Create a consolidated "Full Length Mock paper" (Mock 1)
    const mock1Questions = [
        ...papers.find(p => p.id === 'math-b')?.questions.slice(0, 20) || [],
        ...papers.find(p => p.id === 'physics-b')?.questions.slice(0, 20) || [],
        ...papers.find(p => p.id === 'chemistry-b')?.questions.slice(0, 20) || []
    ];

    papers.push({
        id: 'mock-1',
        title: 'PLUS2AI OFFICIAL KCET FULL-LENGTH MOCK 2026',
        subject: 'PCM Consolidated',
        setName: 'M1',
        examContext: 'KCET',
        questions: mock1Questions
    });

    // Mock 2: PCB (Physics/Chemistry/Biology)
    const mock2Questions = [
        ...papers.find(p => p.id === 'physics-a')?.questions.slice(30, 50) || [],
        ...papers.find(p => p.id === 'chemistry-b')?.questions.slice(30, 50) || [],
        ...papers.find(p => p.id === 'biology-b')?.questions.slice(30, 50) || []
    ];

    papers.push({
        id: 'mock-2',
        title: 'PLUS2AI OFFICIAL KCET FULL-LENGTH MOCK 2026',
        subject: 'PCB Consolidated',
        setName: 'M2',
        examContext: 'KCET',
        questions: mock2Questions
    });

    // Mock 3: NEET PCB Consolidated
    const mockNeet1Questions = [
        ...papers.find(p => p.id === 'neet-physics-a')?.questions.slice(0, 25) || [],
        ...papers.find(p => p.id === 'neet-chemistry-a')?.questions.slice(0, 25) || [],
        ...papers.find(p => p.id === 'neet-biology-a')?.questions.slice(0, 40) || []
    ];

    papers.push({
        id: 'mock-neet-1',
        title: 'PLUS2AI OFFICIAL NEET FULL-LENGTH MOCK 2026',
        subject: 'PCB Consolidated',
        setName: 'N1',
        examContext: 'NEET',
        questions: mockNeet1Questions
    });

    return papers;
};
