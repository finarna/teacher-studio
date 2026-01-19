import { LessonContract, ModuleType, LessonPreview, ExamAnalysisData } from '../types';

// --- CUSTOM SVG DIAGRAMS FOR SKETCH GALLERY ---

const SVG_MICROSCOPE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" style="background-color: #f8fafc;">
  <!-- Optical Axis -->
  <line x1="20" y1="150" x2="380" y2="150" stroke="#94a3b8" stroke-dasharray="4,4" />
  
  <!-- Objective Lens (Small) -->
  <ellipse cx="100" cy="150" rx="5" ry="40" fill="#e2e8f0" stroke="#334155" />
  <text x="90" y="100" font-family="sans-serif" font-size="10" fill="#64748b">Objective (fo)</text>

  <!-- Eyepiece Lens (Large) -->
  <ellipse cx="300" cy="150" rx="8" ry="70" fill="#e2e8f0" stroke="#334155" />
  <text x="290" y="70" font-family="sans-serif" font-size="10" fill="#64748b">Eyepiece (fe)</text>

  <!-- Object AB -->
  <line x1="60" y1="150" x2="60" y2="130" stroke="#ef4444" stroke-width="2" />
  <text x="55" y="125" font-family="sans-serif" font-size="12" fill="#ef4444" font-weight="bold">AB</text>

  <!-- Rays through Objective -->
  <path d="M60,130 L100,130 L240,180" fill="none" stroke="#ef4444" stroke-width="1" />
  <path d="M60,130 L100,150 L240,180" fill="none" stroke="#ef4444" stroke-width="1" />

  <!-- Intermediate Image A'B' -->
  <line x1="240" y1="150" x2="240" y2="180" stroke="#0ea5e9" stroke-width="2" />
  <text x="235" y="195" font-family="sans-serif" font-size="12" fill="#0ea5e9" font-weight="bold">A'B'</text>

  <!-- Rays through Eyepiece to Eye -->
  <path d="M240,180 L300,150 L360,110" fill="none" stroke="#0ea5e9" stroke-width="1" stroke-dasharray="2,2" />
  <path d="M240,180 L300,200 L360,240" fill="none" stroke="#0ea5e9" stroke-width="1" stroke-dasharray="2,2" />

  <!-- Final Image (Virtual) -->
  <line x1="180" y1="150" x2="180" y2="250" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="4,2" />
  <text x="170" y="270" font-family="sans-serif" font-size="14" fill="#8b5cf6" font-weight="bold">A''B'' (Final)</text>
</svg>`)}`;

const SVG_PRISM = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" style="background-color: #fff;">
  <!-- Prism -->
  <path d="M100,250 L300,250 L200,50 Z" fill="rgba(14, 165, 233, 0.1)" stroke="#334155" stroke-width="2" />
  <text x="195" y="45" font-family="sans-serif" font-size="14" font-weight="bold">A</text>

  <!-- Incident Ray -->
  <line x1="40" y1="180" x2="135" y2="180" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow)" />
  <text x="40" y="170" font-family="sans-serif" font-size="12" fill="#ef4444">Incident (i)</text>

  <!-- Refracted Ray -->
  <line x1="135" y1="180" x2="265" y2="180" stroke="#ef4444" stroke-width="2" />
  
  <!-- Emergent Ray -->
  <line x1="265" y1="180" x2="360" y2="240" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow)" />
  <text x="330" y="230" font-family="sans-serif" font-size="12" fill="#ef4444">Emergent (e)</text>

  <!-- Normals -->
  <line x1="100" y1="140" x2="170" y2="220" stroke="#94a3b8" stroke-dasharray="4,4" />
  <line x1="300" y1="140" x2="230" y2="220" stroke="#94a3b8" stroke-dasharray="4,4" />

  <!-- Deviation -->
  <path d="M135,180 L300,180" stroke="#cbd5e1" stroke-dasharray="4,4" />
  <path d="M265,180 L150,110" stroke="#cbd5e1" stroke-dasharray="4,4" />
  <text x="280" y="170" font-family="sans-serif" font-size="14" fill="#8b5cf6" font-weight="bold">δ</text>
</svg>`)}`;

const SVG_WHEATSTONE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" style="background-color: #f8fafc;">
  <!-- Diamond Shape -->
  <path d="M200,50 L350,150 L200,250 L50,150 Z" fill="none" stroke="#334155" stroke-width="2" />
  
  <!-- Resistors -->
  <rect x="110" y="85" width="30" height="15" fill="#fff" stroke="#334155" transform="rotate(-35 125,92)" />
  <text x="100" y="70" font-family="sans-serif" font-size="12">P</text>

  <rect x="260" y="85" width="30" height="15" fill="#fff" stroke="#334155" transform="rotate(35 275,92)" />
  <text x="280" y="70" font-family="sans-serif" font-size="12">Q</text>

  <rect x="110" y="195" width="30" height="15" fill="#fff" stroke="#334155" transform="rotate(35 125,202)" />
  <text x="100" y="230" font-family="sans-serif" font-size="12">R</text>

  <rect x="260" y="195" width="30" height="15" fill="#fff" stroke="#334155" transform="rotate(-35 275,202)" />
  <text x="280" y="230" font-family="sans-serif" font-size="12">S</text>

  <!-- Galvanometer -->
  <line x1="200" y1="50" x2="200" y2="250" stroke="#334155" stroke-width="2" />
  <circle cx="200" cy="150" r="15" fill="#fff" stroke="#334155" />
  <text x="195" y="155" font-family="sans-serif" font-size="14" font-weight="bold">G</text>

  <!-- Battery -->
  <line x1="50" y1="150" x2="50" y2="280" stroke="#94a3b8" />
  <line x1="350" y1="150" x2="350" y2="280" stroke="#94a3b8" />
  <line x1="50" y1="280" x2="180" y2="280" stroke="#94a3b8" />
  <line x1="220" y1="280" x2="350" y2="280" stroke="#94a3b8" />
  <line x1="180" y1="270" x2="180" y2="290" stroke="#334155" stroke-width="2" /> <!-- Long -->
  <line x1="220" y1="275" x2="220" y2="285" stroke="#334155" stroke-width="2" /> <!-- Short -->
</svg>`)}`;

const SVG_GAUSS = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" style="background-color: #fff;">
  <!-- Charged Wire -->
  <line x1="200" y1="20" x2="200" y2="280" stroke="#ef4444" stroke-width="4" />
  <text x="210" y="40" font-family="sans-serif" fill="#ef4444" font-weight="bold">+</text>
  <text x="210" y="100" font-family="sans-serif" fill="#ef4444" font-weight="bold">+</text>
  <text x="210" y="160" font-family="sans-serif" fill="#ef4444" font-weight="bold">+</text>
  <text x="210" y="220" font-family="sans-serif" fill="#ef4444" font-weight="bold">+</text>

  <!-- Gaussian Cylinder -->
  <ellipse cx="200" cy="80" rx="60" ry="15" fill="none" stroke="#0ea5e9" stroke-dasharray="4,4" />
  <ellipse cx="200" cy="220" rx="60" ry="15" fill="none" stroke="#0ea5e9" stroke-dasharray="4,4" />
  <line x1="140" y1="80" x2="140" y2="220" stroke="#0ea5e9" stroke-dasharray="4,4" />
  <line x1="260" y1="80" x2="260" y2="220" stroke="#0ea5e9" stroke-dasharray="4,4" />

  <!-- Field Vectors -->
  <line x1="200" y1="150" x2="320" y2="150" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow)" />
  <text x="330" y="155" font-family="sans-serif" fill="#ef4444">E</text>

  <text x="270" y="240" font-family="sans-serif" fill="#0ea5e9" font-size="12">Gaussian Surface</text>
</svg>`)}`;

const SVG_PHOTOELECTRIC = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" style="background-color: #fff;">
  <!-- Axes -->
  <line x1="50" y1="250" x2="350" y2="250" stroke="#334155" stroke-width="2" />
  <line x1="50" y1="250" x2="50" y2="50" stroke="#334155" stroke-width="2" />
  
  <text x="340" y="270" font-family="sans-serif" font-size="12">Frequency (ν)</text>
  <text x="20" y="40" font-family="sans-serif" font-size="12" style="writing-mode: vertical-rl">Stopping Potential (V₀)</text>

  <!-- Metal A -->
  <line x1="100" y1="250" x2="300" y2="50" stroke="#ef4444" stroke-width="3" />
  <text x="100" y="270" font-family="sans-serif" font-size="12" fill="#ef4444" font-weight="bold">ν₀ (Metal A)</text>
  <text x="250" y="80" font-family="sans-serif" font-size="12" fill="#ef4444">Metal A</text>

  <!-- Metal B -->
  <line x1="180" y1="250" x2="340" y2="90" stroke="#0ea5e9" stroke-width="3" />
  <text x="180" y="270" font-family="sans-serif" font-size="12" fill="#0ea5e9" font-weight="bold">ν₀' (Metal B)</text>
  <text x="310" y="120" font-family="sans-serif" font-size="12" fill="#0ea5e9">Metal B</text>

  <!-- Parallel Lines Note -->
  <text x="60" y="150" font-family="sans-serif" font-size="10" fill="#64748b">Slopes are equal (= h/e)</text>
</svg>`)}`;

// ----------------------------------------------------

// Existing Mock Diagrams for Lessons
const SVG_ANATOMY = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" style="background-color: #f8fafc;">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#64748b"/></marker>
  </defs>
  <path d="M100,500 L700,500 L700,100 Z" fill="rgba(14, 165, 233, 0.1)" stroke="#0ea5e9" stroke-width="6" stroke-linejoin="round"/>
  <path d="M700,460 L660,460 L660,500" fill="none" stroke="#94a3b8" stroke-width="3"/>
  <path d="M180,500 A80,80 0 0,1 195,455" fill="none" stroke="#ef4444" stroke-width="4"/>
  <text x="220" y="480" font-family="sans-serif" font-size="40" font-weight="bold" fill="#ef4444">θ</text>
  <text x="400" y="550" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a" text-anchor="middle">ADJACENT (Next to θ)</text>
  <text x="740" y="300" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a" style="writing-mode: vertical-rl; text-orientation: mixed;">OPPOSITE (Across θ)</text>
  <text x="350" y="280" font-family="sans-serif" font-size="24" font-weight="bold" fill="#64748b" transform="rotate(-34 380,280)" text-anchor="middle">HYPOTENUSE (Longest Side)</text>
</svg>`)}`;

const SVG_PERSPECTIVE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" style="background-color: #f8fafc;">
  <g transform="translate(50, 150)">
    <text x="150" y="-50" font-family="sans-serif" font-size="24" font-weight="bold" fill="#334155" text-anchor="middle">Case A: Angle at Bottom</text>
    <path d="M0,300 L300,300 L300,0 Z" fill="rgba(14, 165, 233, 0.1)" stroke="#0ea5e9" stroke-width="4"/>
    <text x="90" y="280" font-family="sans-serif" font-size="24" fill="#ef4444">θ</text>
  </g>
  <g transform="translate(450, 150)">
    <text x="150" y="-50" font-family="sans-serif" font-size="24" font-weight="bold" fill="#334155" text-anchor="middle">Case B: Angle at Top</text>
    <path d="M0,300 L300,300 L300,0 Z" fill="rgba(139, 92, 246, 0.1)" stroke="#8b5cf6" stroke-width="4"/>
    <text x="270" y="110" font-family="sans-serif" font-size="24" fill="#ef4444">θ</text>
  </g>
</svg>`)}`;

const SVG_TANGENT = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" style="background-color: #f8fafc;">
  <rect x="550" y="100" width="100" height="400" fill="#cbd5e1" stroke="#475569" stroke-width="4"/>
  <line x1="50" y1="500" x2="750" y2="500" stroke="#475569" stroke-width="4"/>
  <path d="M150,500 L550,500 L550,100 Z" fill="none" stroke="#ef4444" stroke-width="4" stroke-dasharray="10,5"/>
  <text x="680" y="300" font-family="sans-serif" font-size="30" font-weight="bold" fill="#0f172a">Height (?)</text>
  <text x="350" y="540" font-family="sans-serif" font-size="30" font-weight="bold" fill="#0f172a">Known Distance</text>
</svg>`)}`;

const SVG_LOS = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" style="background-color: #f8fafc;">
  <line x1="100" y1="400" x2="700" y2="400" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8,8"/>
  <line x1="130" y1="400" x2="680" y2="115" stroke="#ef4444" stroke-width="4"/>
  <text x="450" y="240" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ef4444" transform="rotate(-28 450,240)">Line of Sight</text>
</svg>`)}`;

const SVG_ELEV_DEP = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" style="background-color: #f8fafc;">
  <line x1="50" y1="100" x2="750" y2="100" stroke="#94a3b8" stroke-width="3" stroke-dasharray="10,5"/>
  <line x1="50" y1="500" x2="750" y2="500" stroke="#94a3b8" stroke-width="3" stroke-dasharray="10,5"/>
  <line x1="150" y1="100" x2="650" y2="500" stroke="#0f172a" stroke-width="4"/>
  <rect x="250" y="250" width="300" height="100" rx="20" fill="#fff" stroke="#f59e0b" stroke-width="3" filter="drop-shadow(3px 5px 2px rgb(0 0 0 / 0.1))"/>
  <text x="400" y="310" font-family="sans-serif" font-size="32" font-weight="bold" fill="#f59e0b" text-anchor="middle">Angle D = Angle E</text>
</svg>`)}`;

const SVG_HOOK = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" style="background-color: #f1f5f9;">
  <circle cx="100" cy="100" r="60" fill="#f59e0b" opacity="0.8"/>
  <rect x="500" y="150" width="80" height="350" fill="#1e293b"/>
  <polygon points="500,500 580,500 200,500" fill="rgba(0,0,0,0.2)"/>
  <text x="400" y="100" font-family="sans-serif" font-size="48" font-weight="bold" fill="#0f172a">How tall is it?</text>
</svg>`)}`;


export const MOCK_EXAM_ANALYSIS: ExamAnalysisData = {
  summary: "Comprehensive Analysis of Physics Pre-Board. The paper tests conceptual depth in Electromagnetism and derivation skills in Optics. Section C (3-mark questions) is the critical differentiator.",
  overallDifficulty: 'Moderate',
  difficultyDistribution: [
    { name: 'Easy', percentage: 20, color: '#10b981' },
    { name: 'Medium', percentage: 50, color: '#f59e0b' },
    { name: 'Hard', percentage: 30, color: '#ef4444' }
  ],
  bloomsTaxonomy: [
    { name: 'Remembering', percentage: 15, color: '#60a5fa' },
    { name: 'Understanding', percentage: 30, color: '#3b82f6' },
    { name: 'Applying', percentage: 35, color: '#8b5cf6' },
    { name: 'Analyzing', percentage: 20, color: '#a855f7' }
  ],
  topicWeightage: [
    { name: 'Ray Optics & Instruments', marks: 14, color: '#10b981' },
    { name: 'Moving Charges & Magnetism', marks: 13, color: '#f59e0b' },
    { name: 'Current Electricity', marks: 12, color: '#10b981' },
    { name: 'Electrostatics', marks: 10, color: '#6366f1' },
    { name: 'Modern Physics', marks: 6, color: '#ec4899' },
  ],
  chapterInsights: [
    {
      topic: 'Ray Optics & Instruments',
      totalMarks: 14,
      difficulty: 'Hard',
      description: 'Focus is on large derivations (Lens Maker, Prism) and optical instrument diagrams. Sign convention errors are the #1 cause of lost marks here.',
      keyConcepts: ['Total Internal Reflection', 'Lens Maker Formula', 'Prism Minimum Deviation', 'Compound Microscope', 'Telescope'],
      importantFormulas: ['1/f = (μ-1)(1/R₁ - 1/R₂)', 'μ = sin((A+δm)/2) / sin(A/2)', 'm = v/u'],
      studyResources: ['NCERT Ex 9.1-9.5', 'Ray Diagram Cheat Sheet'],
      visualSummary: "Draw ray diagrams for Microscope (Near Point vs Normal Adjustment). Arrows are mandatory.",
      preparationChecklist: [
        "Practice Microscope ray diagrams (5 times)",
        "Derive Prism Formula without looking",
        "Solve 2 numericals on Lens Combination"
      ]
    },
    {
      topic: 'Current Electricity',
      totalMarks: 12,
      difficulty: 'Medium',
      description: 'High scoring if Kirchhoff laws are applied correctly. Wheatstone bridge sensitivity and Potentiometer conceptual questions are frequent.',
      keyConcepts: ['Drift Velocity', 'Kirchhoff Rules (KVL/KCL)', 'Wheatstone Bridge', 'Potentiometer', 'Internal Resistance'],
      importantFormulas: ['V = E - Ir', 'ΣI = 0', 'ΣV = 0', 'R = ρl/A'],
      studyResources: ['Circuit Solving Drills', 'Potentiometer Viva Questions'],
      visualSummary: "Circuit diagrams must show current direction arrows at every junction.",
      preparationChecklist: [
        "Master sign convention for KVL loops",
        "Explain Potentiometer superiority over Voltmeter",
        "Derive I = nAevd relation"
      ]
    },
    {
      topic: 'Moving Charges & Magnetism',
      totalMarks: 13,
      difficulty: 'Medium',
      description: 'Heavily conceptual. Direction of forces (Right Hand Rule) and path of particles in B-fields are standard question types.',
      keyConcepts: ['Biot-Savart Law', 'Ampere Circuital Law', 'Cyclotron Frequency', 'Force between Parallel Wires', 'Galvanometer Conversion'],
      importantFormulas: ['F = q(v × B)', 'B = μ₀nI', 'F/l = (μ₀ I₁ I₂) / 2πd'],
      studyResources: ['Right Hand Rule Practice', 'Solenoid vs Toroid'],
      visualSummary: "3D visualization of magnetic field lines around current loops. Cyclotron spiral path.",
      preparationChecklist: [
        "Practice converting Galvanometer to Ammeter/Voltmeter",
        "Derive force between parallel conductors",
        "Draw magnetic field due to circular loop"
      ]
    },
    {
      topic: 'Electrostatics',
      totalMarks: 10,
      difficulty: 'Medium',
      description: 'Foundation chapter. Gauss Law applications (Shell, Sheet, Line) are guaranteed 3-5 mark derivation questions.',
      keyConcepts: ['Electric Field Lines', 'Gauss Law Applications', 'Electric Dipole', 'Capacitance with Dielectric', 'Equipotential Surfaces'],
      importantFormulas: ['E = λ / 2πε₀r', 'V = kq/r', 'C = Kε₀A/d', 'τ = p × E'],
      studyResources: ['Gauss Law Derivation Flowchart'],
      visualSummary: "Field lines for +ve, -ve, and Dipole. Equipotential surfaces for point charge vs uniform field.",
      preparationChecklist: [
        "Derive Electric Field due to Dipole (Axial/Equatorial)",
        "State and Prove Gauss Law",
        "Calculate Energy stored in Capacitor network"
      ]
    },
    {
      topic: 'Modern Physics',
      totalMarks: 6,
      difficulty: 'Easy',
      description: 'The easiest section to score full marks. Questions are direct formula-based or standard reasoning (Photoelectric effect graphs).',
      keyConcepts: ['Photoelectric Effect', 'Einstein Equation', 'De-Broglie Wavelength', 'Bohr Model Postulates'],
      importantFormulas: ['E = hν = φ + KE_max', 'λ = h/p = h/√(2meV)', 'L = nh/2π'],
      studyResources: ['Photoelectric Graphs', 'Spectrum Series'],
      visualSummary: "Graph of Stopping Potential vs Frequency. Energy level diagram of Hydrogen.",
      preparationChecklist: [
        "Plot graphs for Photoelectric effect",
        "Memorize Hydrogen spectrum series (Lyman, Balmer...)",
        "Calculate De-Broglie wavelength of electron"
      ]
    }
  ],
  trends: [
    { title: "Derivation Heavy", description: "40% of marks allocated to direct derivations (Prism, Lens Maker, Gauss).", type: "neutral" }
  ],
  predictiveTopics: [
    { topic: "AC Generator", probability: 85, reason: "Due for recurrence." },
    { topic: "Optical Fibers", probability: 70, reason: "Trending in sets." }
  ],
  faq: [
    { question: "Do I need to draw diagrams for 2 mark questions?", answer: "Yes, a rough schematic adds value and clarifies your answer." },
  ],
  strategy: [
    "Attempt Section D (Long Answer) first to secure high-value derivations.",
    "Use pencil for ray diagrams, pen for labeling."
  ],
  questions: [
    // --- RAY OPTICS ---
    {
      id: "Q1",
      text: "Draw a ray diagram of a compound microscope for the final image formed at least distance of distinct vision? Derive an expression for its magnifying power.",
      marks: 5, difficulty: "Hard", topic: "Ray Optics & Instruments", blooms: "Understanding",
      solutionSteps: ["Objective forms real image within focus of eyepiece.", "Eyepiece acts as simple magnifier.", "Derive M = m_o × m_e."],
      keyFormulas: ["M = (L/f_o)(D/f_e)"],
      pitfalls: ["Forgetting arrows on light rays.", "Incorrect placement of intermediate image."],
      visualConcept: "Compound Microscope Ray Diagram",
      examTip: "Practice the diagram to fit within 5-7 minutes.",
      diagramUrl: SVG_MICROSCOPE
    },
    {
      id: "Q2",
      text: "A prism of angle 60° produces a minimum deviation of 30°. Calculate the refractive index of the prism material.",
      marks: 3, difficulty: "Medium", topic: "Ray Optics & Instruments", blooms: "Applying",
      solutionSteps: ["Use prism formula: μ = sin((A+δm)/2) / sin(A/2)", "Substitute A=60, δm=30", "Calculate result."],
      keyFormulas: ["μ = sin((A+δm)/2) / sin(A/2)"],
      visualConcept: "Prism Deviation",
      examTip: "Value of sin(45) and sin(30) must be memorized.",
      diagramUrl: SVG_PRISM
    },
    {
      id: "Q3",
      text: "Why does the sky appear blue?",
      marks: 2, difficulty: "Easy", topic: "Ray Optics & Instruments", blooms: "Remembering",
      solutionSteps: ["Scattering of light by atmospheric particles.", "Rayleigh scattering intensity I ∝ 1/λ⁴.", "Blue has shorter wavelength, scatters more."],
      keyFormulas: ["I ∝ 1/λ⁴"],
      visualConcept: "Scattering",
      examTip: "Mention 'Rayleigh Criterion'.",
      diagramUrl: null
    },
    {
      id: "Q4",
      text: "Define total internal reflection. State the conditions for it to occur.",
      marks: 2, difficulty: "Easy", topic: "Ray Optics & Instruments", blooms: "Remembering",
      solutionSteps: ["Light travels from denser to rarer medium.", "Angle of incidence > Critical angle."],
      visualConcept: "TIR Interface",
      examTip: "Draw a simple diagram showing the critical angle case.",
      diagramUrl: null
    },

    // --- CURRENT ELECTRICITY ---
    {
      id: "Q5",
      text: "Use Kirchhoff's rules to determine the potential difference between points A and B in the given network.",
      marks: 3, difficulty: "Medium", topic: "Current Electricity", blooms: "Applying",
      solutionSteps: ["Identify loops.", "Apply KVL (Loop Rule).", "Solve simultaneous equations."],
      keyFormulas: ["ΣV = 0"],
      pitfalls: ["Sign errors when moving across batteries against current."],
      visualConcept: "Complex Circuit",
      examTip: "Mark current directions clearly before starting equations.",
      diagramUrl: null
    },
    {
      id: "Q6",
      text: "Explain the principle of a Potentiometer. Why is it preferred over a voltmeter?",
      marks: 3, difficulty: "Medium", topic: "Current Electricity", blooms: "Understanding",
      solutionSteps: ["Principle: V ∝ l (constant current).", "Null deflection method means no current drawn from source.", "Measures EMF accurately."],
      keyFormulas: ["E1/E2 = l1/l2"],
      visualConcept: "Potentiometer Setup",
      examTip: "Keywords: 'Null Point', 'Infinite Resistance'.",
      diagramUrl: null
    },
    {
      id: "Q7",
      text: "Define drift velocity and relaxation time.",
      marks: 2, difficulty: "Easy", topic: "Current Electricity", blooms: "Remembering",
      solutionSteps: ["Average velocity in presence of E-field.", "Time between successive collisions."],
      visualConcept: "Electron Path",
      examTip: "Write the formula Vd = -eEτ/m.",
      diagramUrl: null
    },
    {
      id: "Q8",
      text: "Calculate the equivalent resistance of a Wheatstone bridge if R1=10, R2=20, R3=5, R4=10. Is it balanced?",
      marks: 4, difficulty: "Hard", topic: "Current Electricity", blooms: "Analyzing",
      solutionSteps: ["Check balance condition: R1/R2 = R3/R4?", "10/20 = 0.5; 5/10 = 0.5. Balanced.", "Remove galvanometer arm.", "Solve parallel combination."],
      keyFormulas: ["P/Q = R/S"],
      visualConcept: "Wheatstone Bridge",
      examTip: "Always check balance condition first before doing delta-star transformation.",
      diagramUrl: SVG_WHEATSTONE
    },

    // --- MOVING CHARGES ---
    {
      id: "Q9",
      text: "Derive the expression for the force per unit length between two long straight parallel conductors carrying currents in the same direction.",
      marks: 5, difficulty: "Hard", topic: "Moving Charges & Magnetism", blooms: "Understanding",
      solutionSteps: ["Find B1 due to I1 at wire 2.", "Force F2 = I2(l x B1).", "Direction attractive."],
      keyFormulas: ["F/l = μ₀I₁I₂/2πd"],
      pitfalls: ["Confusing attractive vs repulsive cases."],
      visualConcept: "Parallel Wires Force",
      examTip: "State the definition of 'Ampere' if asked.",
      diagramUrl: null
    },
    {
      id: "Q10",
      text: "A circular coil of 100 turns, radius 10cm carries 1A. Find B at center.",
      marks: 2, difficulty: "Easy", topic: "Moving Charges & Magnetism", blooms: "Applying",
      solutionSteps: ["B = μ₀NI/2R", "Substitute values."],
      keyFormulas: ["B = μ₀NI/2R"],
      visualConcept: "Circular Loop Field",
      examTip: "Don't forget N (number of turns).",
      diagramUrl: null
    },
    {
      id: "Q11",
      text: "State Biot-Savart Law in vector form.",
      marks: 2, difficulty: "Medium", topic: "Moving Charges & Magnetism", blooms: "Remembering",
      solutionSteps: ["dB = (μ₀/4π) (Idl x r)/r³"],
      visualConcept: "Current Element",
      examTip: "Vector notation is mandatory.",
      diagramUrl: null
    },
    {
      id: "Q12",
      text: "An electron enters a magnetic field at right angles with velocity v. Describe its path.",
      marks: 2, difficulty: "Medium", topic: "Moving Charges & Magnetism", blooms: "Understanding",
      solutionSteps: ["Force is perpendicular to velocity.", "Centripetal force provided by magnetic force.", "Path is circular."],
      keyFormulas: ["qvB = mv²/r"],
      visualConcept: "Cyclotron Motion",
      examTip: "Draw the circle showing v and F directions.",
      diagramUrl: null
    },

    // --- ELECTROSTATICS ---
    {
      id: "Q13",
      text: "Using Gauss's law, derive the expression for the electric field due to an infinitely long straight wire of uniform linear charge density λ.",
      marks: 5, difficulty: "Hard", topic: "Electrostatics", blooms: "Understanding",
      solutionSteps: ["Gaussian surface: Cylinder.", "Flux only through curved surface.", "E × 2πrl = q/ε₀."],
      keyFormulas: ["E = λ/2πε₀r"],
      visualConcept: "Cylindrical Gaussian Surface",
      examTip: "Justify why flux through end caps is zero.",
      diagramUrl: SVG_GAUSS
    },
    {
      id: "Q14",
      text: "Two point charges +q and -q are placed distance 2a apart. Find the potential at an equatorial point.",
      marks: 2, difficulty: "Easy", topic: "Electrostatics", blooms: "Applying",
      solutionSteps: ["V = V+ + V-", "Distances are equal.", "V = k(+q)/r + k(-q)/r = 0"],
      keyFormulas: ["V = kq/r"],
      pitfalls: ["Confusing Potential (scalar) with Field (vector)."],
      visualConcept: "Dipole Equator",
      examTip: "Potential is zero, but Field is NOT zero.",
      diagramUrl: null
    },
    {
      id: "Q15",
      text: "Define electric flux. Is it a scalar or vector?",
      marks: 1, difficulty: "Easy", topic: "Electrostatics", blooms: "Remembering",
      solutionSteps: ["Dot product of E and A.", "Scalar quantity."],
      keyFormulas: ["Φ = E · A"],
      visualConcept: "Flux through Surface",
      examTip: "SI Unit: Nm²/C",
      diagramUrl: null
    },

    // --- MODERN PHYSICS ---
    {
      id: "Q16",
      text: "Plot a graph showing variation of stopping potential with frequency of incident radiation for two photosensitive materials having work functions W1 > W2.",
      marks: 3, difficulty: "Medium", topic: "Modern Physics", blooms: "Analyzing",
      solutionSteps: ["Einstein eq: V₀ = (h/e)ν - W/e", "Straight line with slope h/e.", "Intercept depends on W."],
      keyFormulas: ["V₀ = (h/e)ν - φ/e"],
      visualConcept: "Photoelectric Graph",
      examTip: "Lines must be parallel (same slope h/e).",
      diagramUrl: SVG_PHOTOELECTRIC
    },
    {
      id: "Q17",
      text: "Calculate the de-Broglie wavelength of an electron accelerated through 100V.",
      marks: 2, difficulty: "Easy", topic: "Modern Physics", blooms: "Applying",
      solutionSteps: ["λ = 1.227 / √V nm", "λ = 1.227 / 10 = 0.123 nm"],
      keyFormulas: ["λ = 1.227/√V nm"],
      visualConcept: "Wave Particle Duality",
      examTip: "Remember the shortcut formula for electrons.",
      diagramUrl: null
    }
  ]
};

export const TRIGONOMETRY_LESSON: LessonContract = {
  lesson_id: 'math-10-trig-app',
  title: 'Applications of Trigonometry',
  grade: 'Class 10',
  subject: 'Math',
  description: 'Master Heights and Distances through interactive shadowing.',
  bannerImageUrl: SVG_HOOK,
  modules: [
    {
      id: 'step-1-hook',
      type: ModuleType.HOOK,
      title: 'The Shadow Mystery',
      content: {
        scenario: "You are an architect trying to measure the height of the Qutub Minar without climbing it. All you have is a stick and the sun.",
        visualTheme: 'sketchbook'
      }
    },
    {
      id: 'step-2-concept',
      type: ModuleType.CONCEPT,
      title: 'The Trigonometry Toolkit',
      content: {
        slides: [
          {
            id: 'c1',
            type: 'interactive_anatomy',
            title: 'Anatomy of the Right Triangle',
            content: "Before we solve mysteries, we must know our tools. In every right-angled triangle, the sides have specific names based on where you are standing (your angle $\\theta$). \n\nInteractive Task: Click on the sides of the triangle to learn their roles.",
            highlight: "The Hypotenuse never changes position, but the other two do!",
            bulletPoints: [
              "Hypotenuse: Always opposite the $90^\\circ$ box.",
              "Adjacent: The leg 'touching' your angle.",
              "Opposite: The leg 'across' from your angle."
            ],
            imageUrl: SVG_ANATOMY
          },
          {
            id: 'c2',
            type: 'perspective_shift',
            title: 'The Perspective Shift',
            content: "This is where most students make mistakes. 'Opposite' is not a fixed side—it depends on which angle you are using.\n\nTry It: Switch the angle from Bottom to Top in the diagram. Watch how the names of the legs swap instantly.",
            highlight: "If you change your viewing angle, you must rename your sides.",
            bulletPoints: [
              "Looking from bottom? Base is Adjacent.",
              "Looking from top? Base is Opposite.",
              "Trig ratios depend entirely on this perspective."
            ],
            imageUrl: SVG_PERSPECTIVE
          },
          {
            id: 'c3',
            type: 'why_tangent',
            title: 'Why Tangent?',
            content: "In 'Heights and Distances' problems, we almost always want to find a Height (Opposite) and we usually know the distance along the ground (Adjacent).\n\nWhich ratio connects Opposite and Adjacent? That's right: Tangent.",
            bulletPoints: [
              "$\\sin \\theta = \\frac{\\text{Opp}}{\\text{Hyp}}$ (Need slant height?)",
              "$\\cos \\theta = \\frac{\\text{Adj}}{\\text{Hyp}}$ (Need slant height?)",
              "$\\tan \\theta = \\frac{\\text{Opp}}{\\text{Adj}}$ (The Hero of Heights!)"
            ],
            highlight: "For 90% of tower/building problems, you will use $\\tan \\theta$.",
            imageUrl: SVG_TANGENT
          },
          {
            id: 'c4',
            type: 'line_of_sight',
            title: 'Line of Sight',
            content: "Imagine a laser beam shooting straight from your eye to the object. This is your 'Line of Sight'.\n\nAll angles are measured between this laser beam and the horizontal level. Never measure from the vertical wall!",
            highlight: "Always draw a horizontal dashed line from the eye first.",
            imageUrl: SVG_LOS
          },
          {
            id: 'c5',
            type: 'elevation_depression',
            title: 'Elevation vs. Depression',
            content: "Looking up at a kite? That's Angle of Elevation.\nLooking down from a balcony? That's Angle of Depression.\n\nSecret Trick: Because the ground and your horizontal eye-level are parallel lines, the Angle of Depression is mathematically equal to the Angle of Elevation (Alternate Interior Angles).",
            bulletPoints: [
              "Elevation: Upwards from horizontal.",
              "Depression: Downwards from horizontal.",
              "Z-Rule: They form a 'Z' shape and are equal."
            ],
            imageUrl: SVG_ELEV_DEP
          }
        ]
      }
    },
    {
      id: 'step-3-sim-explorer',
      type: ModuleType.SIMULATION,
      title: 'Simulation: Basic Shadows',
      content: {
        outputLabel: 'Height',
        formula: 'x * Math.tan(y * Math.PI / 180)',
        visualMode: 'geometry', // ENABLE GEOMETRY MODE
        inputs: [
          { name: "x", label: "Shadow Length (m)", min: 10, max: 100, unit: "m" },
          { name: "y", label: "Sun Angle", min: 10, max: 85, unit: "deg" }
        ],
        visualPrompt: 'A geometric triangle diagram',
      }
    },
    {
      id: 'step-4-guided',
      type: ModuleType.GUIDED_PRACTICE,
      title: 'Solve with Hints',
      content: {
        problem: "If the shadow is $30\\text{m}$ long and the angle of elevation is $30^\\circ$, how tall is the tower?",
        solution: "17.32m",
        steps: ["Identify $\\text{Adjacent} = 30\\text{m}$", "Identify $\\theta = 30^\\circ$", "Use $\\tan 30^\\circ = \\frac{1}{\\sqrt{3}}$"],
        imageUrl: SVG_TANGENT // Use the tangent diagram for reference
      }
    },
    {
      id: 'step-5-sim-complex',
      type: ModuleType.SIMULATION,
      title: 'Simulation: Find the Distance',
      content: {
        outputLabel: 'Distance',
        formula: 'x / Math.tan(y * Math.PI / 180)',
        visualMode: 'geometry', // ENABLE GEOMETRY MODE
        inputs: [
          { name: "x", label: "Building Height (m)", min: 10, max: 200, unit: "m" },
          { name: "y", label: "Observer Angle", min: 10, max: 85, unit: "deg" }
        ],
        visualPrompt: 'A building viewed from afar',
      }
    },
    {
      id: 'step-6-summary',
      type: ModuleType.LESSON_SUMMARY,
      title: 'Exam Cheat Sheet',
      content: {
        formulas: [
          { label: 'Tangent Ratio', equation: '\\tan \\theta = \\frac{\\text{Opp}}{\\text{Adj}}', note: 'Use for Heights & Distances' },
          { label: 'Sine Ratio', equation: '\\sin \\theta = \\frac{\\text{Opp}}{\\text{Hyp}}', note: 'Use when slope length is known' },
          { label: 'Pythagoras', equation: 'H^2 = P^2 + B^2', note: 'To find the third side' }
        ],
        tips: [
          "Always draw the diagram first and label the right angle.",
          "Write the formula before substituting values to get step marks.",
          "If the answer involves $\\sqrt{3}$, check if the question asks for decimal value (e.g., 1.732).",
          "Angle of Depression = Angle of Elevation (Alternate Interior Angles).",
          "Unit Check: Ensure height and distance are in the same units (m or cm)."
        ],
        mnemonic: "SOH CAH TOA - Some Old Horses Can Always Hear Their Owners Approach",
        imageUrl: SVG_TANGENT
      }
    },
    {
      id: 'step-7-quiz',
      type: ModuleType.ADAPTIVE_QUIZ,
      title: 'Adaptive Assessment',
      content: {
        questions: [
          {
            id: 'q1',
            question: "In a right triangle, if the angle is $45^\\circ$, what is the relationship between height and shadow?",
            options: ["Height > Shadow", "Height < Shadow", "Height = Shadow", "Cannot determine"],
            correctIndex: 2,
            misconceptionId: 'tan_45_ratio',
            hint: "$\\tan 45^\\circ$ is exactly 1."
          },
          {
            id: 'q2',
            question: "As the angle of elevation increases (e.g., sun going higher), does the shadow length increase or decrease?",
            options: ["Increases", "Decreases", "Stays same", "Becomes zero immediately"],
            correctIndex: 1,
            misconceptionId: 'inverse_relation_tan',
            hint: "Think about noon vs. evening shadows."
          },
          {
            id: 'q3',
            question: "If $\\tan \\theta = \\sqrt{3}$, what is the angle of elevation?",
            options: ["30°", "45°", "60°", "90°"],
            correctIndex: 2,
            misconceptionId: 'trig_values_memory',
            hint: "Remember the table: $\\tan 30^\\circ = 1/\\sqrt{3}$, $\\tan 60^\\circ = \\sqrt{3}$."
          }
        ]
      }
    },
    {
      id: 'step-8-exam',
      type: ModuleType.EXAM_MODE,
      title: 'Board Exam Simulation',
      content: {
        durationMinutes: 10,
        questions: [
          {
            id: 'e1',
            question: "A tower stands vertically on the ground. From a point on the ground, which is $15\\text{m}$ away from the foot of the tower, the angle of elevation of the top of the tower is found to be $60^\\circ$. Find the height of the tower.",
            options: ["$15\\sqrt{3}\\text{m}$", "$10\\sqrt{3}\\text{m}$", "15 m", "30 m"],
            correctIndex: 0
          },
          {
            id: 'e2',
            question: "The angle of elevation of the top of a building from the foot of the tower is $30^\\circ$ and the angle of elevation of the top of the tower from the foot of the building is $60^\\circ$. If the tower is $50\\text{m}$ high, find the height of the building.",
            options: ["$16 \\frac{2}{3} \\text{m}$", "25 m", "$50\\sqrt{3} \\text{m}$", "100 m"],
            correctIndex: 0
          }
        ]
      }
    },
    {
      id: 'step-9-report',
      type: ModuleType.MASTERY_REPORT,
      title: 'Lesson Mastery',
      content: {}
    }
  ]
};

export const COURSE_CATALOG: LessonPreview[] = [];