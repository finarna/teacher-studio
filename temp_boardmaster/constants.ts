
import { Question } from './types';

const r = String.raw;

export const EXAM_DATA: Question[] = [
  {
    id: 1001,
    text: r`KCET Physics Elite: Two charges $+4e$ and $+e$ are placed at a distance $x$ apart. At what point on the line joining them should a third charge $q$ be placed so that the whole system remains in equilibrium?`,
    subject: 'Physics',
    options: [
      { id: "A", text: r`At a distance $x/3$ from $+e$`, isCorrect: true },
      { id: "B", text: r`At a distance $2x/3$ from $+e$`, isCorrect: false },
      { id: "C", text: r`At a distance $x/4$ from $+e$`, isCorrect: false },
      { id: "D", text: r`At a distance $x/2$ from $+4e$`, isCorrect: false },
    ],
    metadata: { 
      topic: "Electrostatics", 
      isPastYear: true, 
      year: "2024", 
      source: "KCET Official Track",
      difficulty: "medium",
      bloomLevel: "Applying"
    },
    strategicHook: "Mentor's Shortcut: For charges $Q_1$ and $Q_2$, the null point is always at distance $d = \frac{x}{\sqrt{Q_1/Q_2} + 1}$ from the smaller charge $Q_2$. Memorize this for CET speed!",
    solutionData: {
      steps: [
        {
          text: r`We start by setting the net force on the third charge $q$ to zero. Let it be at distance $r$ from $+e$ and $(x-r)$ from $+4e$.`,
          pitfall: r`Placing the charge outside the line segment. For like charges, the equilibrium point is always 'between' them.`,
          reminder: r`Equilibrium requires forces from both charges to be equal and opposite.`
        },
        {
          text: r`Equation setup: $\frac{k(e)q}{r^2} = \frac{k(4e)q}{(x-r)^2}$. Simplify by canceling $k, e, q$.`,
          pitfall: r`Forgetting to square the distances in the denominator of Coulomb's Law.`,
          reminder: r`$\frac{1}{r^2} = \frac{4}{(x-r)^2}$ is the core resulting ratio.`
        },
        {
          text: r`Take the square root of both sides: $\frac{1}{r} = \frac{2}{x-r} \implies x - r = 2r \implies x = 3r$.`,
          pitfall: r`Taking the negative root $\frac{-2}{x-r}$ leads to a point outside the segment, which is not stable for like charges.`,
          reminder: r`$r = x/3$ is the distance from the charge $e$.`
        }
      ],
      finalTip: r`In multiple choice, always solve for the distance from the 'smaller' charge first. It avoids messy quadratic calculations and usually matches the options directly.`
    },
    smartNotes: {
      topicTitle: "Equilibrium of Charges",
      visualConcept: "Balanced vectors at the null point between like charges.",
      keyPoints: [
        r`Stable Equilibrium: $F_{net} = 0$`,
        r`Coulomb's Law: $F = k\frac{q_1q_2}{r^2}$`,
        r`Null point closer to the smaller magnitude charge.`
      ],
      steps: [
        { title: "Identify Charges", content: "Check signs; if same, null point is in between." },
        { title: "Apply Ratio", content: "Distance ratio is proportional to square root of charge ratio." }
      ],
      mentalAnchor: "Smaller charge, larger influence on the null point's location.",
      quickRef: r`$r = \frac{x}{\sqrt{Q_{big}/Q_{small}} + 1}$`
    }
  },
  {
    id: 2001,
    text: r`NEET Biology Challenge: In a DNA molecule, if Cytosine is 18%, what is the percentage of Adenine according to Chargaff's rule?`,
    subject: 'Biology',
    options: [
      { id: "A", text: r`18%`, isCorrect: false },
      { id: "B", text: r`32%`, isCorrect: true },
      { id: "C", text: r`36%`, isCorrect: false },
      { id: "D", text: r`64%`, isCorrect: false },
    ],
    metadata: { 
      topic: "Molecular Basis of Inheritance", 
      isPastYear: true, 
      year: "2023", 
      source: "NEET Exam",
      difficulty: "easy",
      bloomLevel: "Understanding"
    },
    strategicHook: "Mentor's Rule: $A+G = T+C = 50\%$. If you know one, you know them all in seconds!",
    solutionData: {
      steps: [
        {
          text: r`Chargaff's rule states that in double-stranded DNA, $G = C$ and $A = T$.`,
          pitfall: r`Applying this to single-stranded RNA; it ONLY works for double-stranded DNA.`,
          reminder: r`Base pairing is complementary: Purines = Pyrimidines.`
        },
        {
          text: r`If $C = 18\%$, then $G$ must also be $18\%$. Total $G+C = 36\%$.`,
          pitfall: r`Stopping after calculating $G+C$ and looking for $36$ in the options.`,
          reminder: r`$100\% - 36\% = 64\%$ belongs to the $A+T$ pool.`
        },
        {
          text: r`Since $A = T$, we divide the remaining percentage by 2: $64\% / 2 = 32\%$.`,
          pitfall: r`Dividing $36\%$ by 2 by mistake.`,
          reminder: r`$A = 32\%$ and $T = 32\%$.`
        }
      ],
      finalTip: r`A quick check: $(A+T) + (G+C)$ must always sum to 100%. $32+32+18+18 = 100$. Verified.`
    },
    smartNotes: {
      topicTitle: "Chargaff's Rules",
      visualConcept: "Equal bars for A-T and G-C in the DNA ladder.",
      keyPoints: [
        r`$[A] = [T]$`,
        r`$[G] = [C]$`,
        r`$[A+G] = [T+C] = 50\%$`
      ],
      steps: [
        { title: "Pair Up", content: "Given $X$, then its partner is also $X$." },
        { title: "Subtract", content: "Substract $2X$ from 100 to find the remaining pair total." }
      ],
      mentalAnchor: "The rule of symmetry in the double helix.",
      quickRef: r`$A\% = 50\% - C\%$`
    }
  }
];
