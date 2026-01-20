import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  Download,
  Sparkles,
  Image as ImageIcon,
  Eye,
  ArrowLeft,
  PenTool,
  Lightbulb,
  Sigma,
  AlertTriangle,
  X,
  Maximize2,
  Share2,
  Printer,
  ChevronRight,
  Loader2,
  RotateCw,
  ArrowRight,
  Zap,
  Target
} from 'lucide-react';
import { Scan, AnalyzedQuestion } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeAiParse } from '../utils/aiParser';
import { RenderWithMath } from './MathRenderer';
import { cache } from '../utils/cache';

interface SketchGalleryProps {
  onBack?: () => void;
  scan?: Scan | null;
  onUpdateScan?: (scan: Scan) => void;
  recentScans?: Scan[];
}

const STATIC_SKETCHES: any[] = [];

const SketchGallery: React.FC<SketchGalleryProps> = ({ onBack, scan, onUpdateScan, recentScans }) => {
  const [activeTab, setActiveTab] = useState(scan ? 'Exam Specific' : 'All Subjects');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedSketch, setSelectedSketch] = useState<any | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [selectedVaultScan, setSelectedVaultScan] = useState<Scan | null>(scan);
  const [groupByDomain, setGroupByDomain] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, failed: number} | null>(null);
  const [forceRender, setForceRender] = useState(0);

  const [selectedGrade, setSelectedGrade] = useState(selectedVaultScan?.grade || 'Class 12');
  const [selectedSubject, setSelectedSubject] = useState(selectedVaultScan?.subject || 'Physics');

  useEffect(() => {
    if (!selectedVaultScan && recentScans && recentScans.length > 0) {
      const latest = recentScans[0];
      setSelectedVaultScan(latest);
      setActiveTab('Exam Specific');
    }
  }, [recentScans, selectedVaultScan]);

  useEffect(() => {
    if (selectedVaultScan) {
      setSelectedGrade(selectedVaultScan.grade);
      setSelectedSubject(selectedVaultScan.subject);
    }
  }, [selectedVaultScan]);

  const scanQuestions = selectedVaultScan?.analysisData?.questions || [];

  // Helper function to clean up visual concept titles
  const cleanVisualTitle = (concept: string, topic?: string): string => {
    if (!concept) {
      return topic || 'Conceptual Diagram';
    }

    // Remove common AI-generated prefixes
    let cleaned = concept
      .replace(/^The SVG (illustrates?|visualizes?|shows?|depicts?|represents?)\s+/i, '')
      .replace(/^This (diagram|visual|illustration|image)\s+(shows?|illustrates?|depicts?)\s+/i, '')
      .replace(/^Visual (Summary|Concept):\s*/i, '');

    // If the cleaned version is still too long and descriptive, try to extract the core concept
    if (cleaned.length > 60) {
      // Try to extract text between common patterns
      const match = cleaned.match(/(?:the\s+)?([^,\.]+?)(?:\s+with|\s+in|\s+showing|\s+highlighting|,|\.|$)/i);
      if (match && match[1]) {
        cleaned = match[1].trim();
      }
    }

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    // If still empty or too generic, fall back to topic
    if (!cleaned || cleaned.length < 3) {
      return topic || 'Conceptual Diagram';
    }

    return cleaned;
  };

  const dynamicSketches = useMemo(() => {
    return scanQuestions.map((q) => {
      const svgContent = q.sketchSvg || q.diagramUrl || '';
      const trimmedSvg = svgContent.trim();
      // Check if it's SVG - either starts with <svg or contains <svg after XML declaration
      const isSvgContent = trimmedSvg.startsWith('<svg') || trimmedSvg.includes('<svg');

      // Clean up the visual concept title
      const cleanedTitle = cleanVisualTitle(
        q.visualConcept || '',
        q.topic
      );

      return {
        id: q.id,
        visualConcept: cleanedTitle,
        subject: selectedVaultScan?.subject || 'Science',
        tag: `${q.marks} Marks`,
        img: svgContent || null,
        isSvg: isSvgContent,
        description: q.text || "",
        difficulty: q.difficulty || "Moderate",
        generated: !!(q.sketchSvg || q.diagramUrl),
        formulas: q.keyFormulas || [],
        tip: q.examTip || "",
        pitfalls: q.pitfalls || [],
        detailedNotes: q.masteryMaterial?.logic || "",
        mentalAnchor: q.masteryMaterial?.memoryTrigger || "",
        proceduralLogic: q.solutionSteps || []
      };
    });
  }, [scanQuestions, selectedVaultScan, forceRender]);

  // Domain maps for different subjects
  const DOMAIN_MAPS: Record<string, Record<string, string[]>> = {
    'Physics': {
      'Mechanics': ['Fluid', 'Rotational', 'Motion', 'Gravitation', 'Gravity', 'Work', 'Energy', 'Kinematics', 'Dynamics', 'Force', 'Momentum', 'Torque', 'Angular', 'Newton', 'Inertia', 'Oscillation', 'Satellite'],
      'Electrodynamics': ['Capacitor', 'Magnetic', 'Current', 'Electric', 'Circuit', 'Charge', 'Voltage', 'Resistance', 'Induction', 'Alternating', 'Field', 'Potential', 'Gauss', 'Ampere', 'Faraday', 'Lenz', 'Ohm'],
      'Modern Physics': ['Atomic', 'Nuclear', 'Photoelectric', 'Quantum', 'Electron', 'Photon', 'Dual Nature', 'Radioactivity', 'Bohr', 'De Broglie'],
      'Optics': ['Light', 'Lens', 'Mirror', 'Refraction', 'Reflection', 'Interference', 'Diffraction', 'Prism', 'Optical Instrument', 'Wavefront', 'Huygens', 'Polarisation'],
      'Thermodynamics': ['Heat', 'Temperature', 'Gas', 'Thermal', 'Entropy', 'Carnot', 'Specific Heat', 'Isothermal', 'Adiabatic'],
      'Waves': ['Wave', 'Sound', 'Oscillation', 'SHM', 'Frequency', 'Doppler', 'Beats', 'Resonance'],
      'Semiconductors': ['Diode', 'Transistor', 'Logic Gate', 'Semiconductor', 'PN Junction', 'Rectifier', 'LED', 'Zener']
    },
    'Chemistry': {
      'Organic Chemistry': ['Alkane', 'Alkene', 'Alkyne', 'Aromatic', 'Benzene', 'Alcohol', 'Aldehyde', 'Ketone', 'Carboxylic', 'Ester', 'Amine', 'Polymer', 'Isomer'],
      'Inorganic Chemistry': ['Metal', 'Acid', 'Base', 'Salt', 'Coordination', 'Transition', 'Periodic', 'Group', 'Block', 'd-block', 'f-block', 'Lanthanide'],
      'Physical Chemistry': ['Thermodynamics', 'Kinetics', 'Equilibrium', 'Electrochemistry', 'Solution', 'Colligative', 'Rate', 'Catalyst', 'Activation Energy', 'Cell'],
      'Chemical Bonding': ['Ionic', 'Covalent', 'Metallic', 'Hydrogen Bond', 'VSEPR', 'Hybridization', 'Molecular Orbital', 'Bond'],
      'States of Matter': ['Gas', 'Liquid', 'Solid', 'Phase', 'Vapor', 'Crystalline', 'Amorphous']
    },
    'Biology': {
      'Cell Biology': ['Cell', 'Membrane', 'Nucleus', 'Mitochondria', 'Chloroplast', 'Ribosome', 'Organelle', 'Cytoplasm', 'Endoplasmic', 'Golgi'],
      'Genetics': ['DNA', 'RNA', 'Gene', 'Chromosome', 'Heredity', 'Mutation', 'Allele', 'Genotype', 'Phenotype', 'Mendel', 'Punnett'],
      'Evolution': ['Natural Selection', 'Adaptation', 'Speciation', 'Darwin', 'Fossil', 'Phylogeny', 'Evolution'],
      'Human Physiology': ['Digestive', 'Respiratory', 'Circulatory', 'Nervous', 'Excretory', 'Endocrine', 'Reproductive', 'Heart', 'Kidney', 'Brain', 'Blood'],
      'Plant Biology': ['Photosynthesis', 'Transpiration', 'Xylem', 'Phloem', 'Stomata', 'Chlorophyll', 'Plant', 'Root', 'Stem', 'Leaf'],
      'Ecology': ['Ecosystem', 'Food Chain', 'Food Web', 'Biodiversity', 'Conservation', 'Population', 'Community', 'Biome']
    }
  };

  // Filter sketches by subject when a subject tab is active
  const filteredSketches = useMemo(() => {
    if (activeTab === 'Exam Specific') {
      return dynamicSketches;
    } else if (activeTab === 'Physics' || activeTab === 'Chemistry' || activeTab === 'Biology') {
      // Filter from SELECTED VAULT only if one is selected, otherwise show from all scans
      if (selectedVaultScan && selectedVaultScan.subject === activeTab) {
        return dynamicSketches;
      } else if (recentScans && recentScans.length > 0 && !selectedVaultScan) {
        const allSketches: any[] = [];
        recentScans.forEach(scan => {
          if (scan.subject === activeTab && scan.analysisData?.questions) {
            scan.analysisData.questions.forEach((q: any) => {
              const svgContent = q.sketchSvg || q.diagramUrl || '';
              const trimmedSvg = svgContent.trim();
              const isSvgContent = trimmedSvg.startsWith('<svg') || trimmedSvg.includes('<svg');

              // Clean up the visual concept title
              const cleanedTitle = cleanVisualTitle(
                q.visualConcept || '',
                q.topic
              );

              allSketches.push({
                id: q.id,
                visualConcept: cleanedTitle,
                subject: scan.subject,
                tag: `${q.marks} Marks`,
                img: svgContent || null,
                isSvg: isSvgContent,
                description: q.text || "",
                difficulty: q.difficulty || "Moderate",
                generated: !!(q.sketchSvg || q.diagramUrl),
                formulas: q.keyFormulas || [],
                tip: q.examTip || "",
                pitfalls: q.pitfalls || [],
                detailedNotes: q.masteryMaterial?.logic || "",
                mentalAnchor: q.masteryMaterial?.memoryTrigger || "",
                proceduralLogic: q.solutionSteps || [],
                scanId: scan.id,
                scanName: scan.name
              });
            });
          }
        });
        return allSketches;
      }
      return [];
    }
    return STATIC_SKETCHES;
  }, [activeTab, dynamicSketches, recentScans, selectedVaultScan]);

  const categorizedSketches = useMemo(() => {
    if (!selectedVaultScan && activeTab === 'Exam Specific') return null;

    // Determine which domain map to use
    let currentSubject = activeTab;
    if (activeTab === 'Exam Specific') {
      currentSubject = selectedVaultScan?.subject || 'Physics';
    }

    const DOMAIN_MAP = DOMAIN_MAPS[currentSubject] || DOMAIN_MAPS['Physics'];
    const categorized: Record<string, any[]> = {};
    const sketchesToCategorize = filteredSketches;

    sketchesToCategorize.forEach(sketch => {
      const searchStr = `${sketch.visualConcept} ${sketch.description}`.toLowerCase();
      let matched = false;

      for (const [domain, keywords] of Object.entries(DOMAIN_MAP)) {
        if (keywords.some(kw => searchStr.includes(kw.toLowerCase()))) {
          if (!categorized[domain]) categorized[domain] = [];
          categorized[domain].push(sketch);
          matched = true;
          break;
        }
      }

      if (!matched) {
        if (!categorized['General']) categorized['General'] = [];
        categorized['General'].push(sketch);
      }
    });

    return categorized;
  }, [filteredSketches, selectedVaultScan, activeTab, recentScans]);

  const displayedSketches = filteredSketches;

  // Calculate subject counts - only from selected vault if available
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { Physics: 0, Chemistry: 0, Biology: 0 };
    if (selectedVaultScan) {
      // Only count from selected vault
      const subject = selectedVaultScan.subject;
      if (counts.hasOwnProperty(subject)) {
        counts[subject] = selectedVaultScan.analysisData?.questions?.length || 0;
      }
    } else if (recentScans && recentScans.length > 0) {
      // Count from all scans
      recentScans.forEach(scan => {
        const subject = scan.subject;
        if (counts.hasOwnProperty(subject)) {
          counts[subject] += scan.analysisData?.questions?.length || 0;
        }
      });
    }
    return counts;
  }, [recentScans, selectedVaultScan]);

  // Get available domains for current subject
  const availableDomains = useMemo(() => {
    let currentSubject = activeTab;
    if (activeTab === 'Exam Specific') {
      currentSubject = selectedVaultScan?.subject || 'Physics';
    }

    if (categorizedSketches && (activeTab === 'Exam Specific' || activeTab === 'Physics' || activeTab === 'Chemistry' || activeTab === 'Biology')) {
      return ['All', ...Object.keys(categorizedSketches).filter(d => categorizedSketches[d].length > 0)];
    }
    return ['All'];
  }, [categorizedSketches, activeTab, selectedVaultScan]);

  // Reset domain selection when changing tabs
  useEffect(() => {
    setSelectedDomain('All');
  }, [activeTab]);

  // Helper function to safely parse JSON from Gemini response
  const parseGeminiJSON = (responseText: string) => {
    try {
      let jsonText = responseText.trim();

      // Remove markdown code blocks
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      jsonText = jsonText.trim();

      // Try direct parsing first
      try {
        return JSON.parse(jsonText);
      } catch (firstError) {
        console.log('First parse attempt failed, attempting recovery...');
        console.log('Parse error:', firstError);

        // More robust SVG extraction - find svgCode field and extract its value
        // This handles multi-line SVG content
        const svgStart = jsonText.indexOf('"svgCode"');
        if (svgStart !== -1) {
          const valueStart = jsonText.indexOf('"', svgStart + 9); // Find opening quote of value
          if (valueStart !== -1) {
            let valueEnd = valueStart + 1;

            // Find the closing quote, handling escaped quotes
            while (valueEnd < jsonText.length) {
              if (jsonText[valueEnd] === '\\') {
                valueEnd += 2; // Skip escaped character
                continue;
              }
              if (jsonText[valueEnd] === '"') {
                break;
              }
              valueEnd++;
            }

            if (valueEnd < jsonText.length) {
              const svgCode = jsonText.substring(valueStart + 1, valueEnd);
              const before = jsonText.substring(0, svgStart);
              const after = jsonText.substring(valueEnd + 1);

              // Replace SVG with placeholder
              const textWithoutSvg = before + '"svgCode":"__SVG_PLACEHOLDER__"' + after;

              // Parse the cleaned JSON
              const parsed = JSON.parse(textWithoutSvg);

              // Restore the SVG code (decode any escape sequences)
              parsed.svgCode = svgCode;

              return parsed;
            }
          }
        }

        throw firstError;
      }
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      console.error('Response text (first 500 chars):', responseText.substring(0, 500));
      throw new Error('Invalid JSON response from AI');
    }
  };

  const handleGenerate = async (id: string) => {
    if (!selectedVaultScan || !onUpdateScan) return;
    setGeneratingId(id);
    setGenError(null);
    try {
      const q = scanQuestions.find(it => it.id === id);
      if (!q) return;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key Missing");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              svgCode: { type: "string" },
              visualConcept: { type: "string" },
              detailedNotes: { type: "string" },
              mentalAnchor: { type: "string" },
              proceduralLogic: {
                type: "array",
                items: { type: "string" }
              },
              keyFormulas: {
                type: "array",
                items: { type: "string" }
              },
              examTip: { type: "string" },
              pitfalls: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["svgCode", "visualConcept", "detailedNotes", "mentalAnchor", "proceduralLogic", "keyFormulas", "examTip", "pitfalls"]
          }
        }
      });

      const prompt = `Elite Academic Illustrator & Lead Curriculum Designer: Synthesize a MULTIMODAL PEDAGOGICAL BLUEPRINT.
CONCEPT: ${q.visualConcept || q.topic}
CONTEXT: ${q.text}

TASK 1: CREATE A WORLD-CLASS SCIENTIFIC ILLUSTRATION (SVG)
Requirements:
- Master-Level Aesthetics: Use <defs> with <linearGradient> for realistic shading, <radialGradient> for spherical bodies, and <filter> for realistic drop-shadows and glows.
- Textbook Accuracy: No simple lines; use 3D-effect cylinders, glass textures, and metallic brushed gradients.
- Professional Layout: 1000x800 viewBox. ALL content MUST fit within x="50" to x="950" and y="50" to y="750" boundaries. Leave 50px margins on all sides.
- Advanced Labeling: Labels in white capsules with shadows. Circular anchors. Keep all text within the safe zone.
- Scientific Notation: Forces(Red), Velocity(Blue), Fields(Indigo) color-coded with arrowheads.
- Concept Breakdown: Zoom-In insets if needed.
- CRITICAL SVG SYNTAX: All path commands must be complete. Bezier curves (C) need 3 coordinate pairs: C x1,y1 x2,y2 x,y. Quadratic curves (Q) need 2 pairs: Q x1,y1 x,y. NO INCOMPLETE PATHS.
- CRITICAL: Ensure all text, shapes, and elements are completely within the viewBox boundaries.

TASK 2: GENERATE DIMENSIONAL PEDAGOGICAL NOTES
- First Principles: Deep-dive into 'Why'.
- Mental Anchor: Power metaphor.
- Procedural Logic: Problem-solving steps.
- Key Formulas: LaTeX essential derivations.
- The Trap: Common pitfall.

You MUST return a valid JSON object (NOT an array) with these exact fields:
{
  "svgCode": "complete SVG code as a single string",
  "visualConcept": "concise title",
  "detailedNotes": "first principles explanation",
  "mentalAnchor": "memorable metaphor",
  "proceduralLogic": ["step 1", "step 2", "step 3", "...as many steps as needed"],
  "keyFormulas": ["$$formula1$$", "$$formula2$$", "...all relevant formulas"],
  "examTip": "exam strategy tip",
  "pitfalls": ["mistake 1", "mistake 2", "mistake 3", "...all common pitfalls"]
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text() || "{}";
      console.log('AI Response (first 1000 chars):', responseText.substring(0, 1000));

      let blueprint = parseGeminiJSON(responseText);

      // Handle case where AI returns an array instead of object
      if (Array.isArray(blueprint)) {
        console.log('AI returned an array, taking first element');
        blueprint = blueprint[0];
      }

      console.log('Parsed blueprint keys:', Object.keys(blueprint));

      if (!blueprint.svgCode) {
        console.error('Blueprint missing svgCode. Available fields:', Object.keys(blueprint));
        console.error('Full blueprint:', blueprint);
        throw new Error(`Invalid blueprint: missing svgCode field. Got: ${Object.keys(blueprint).join(', ')}`);
      }

      // Validate SVG syntax before saving
      try {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(blueprint.svgCode, 'image/svg+xml');
        const parseErrors = svgDoc.getElementsByTagName('parsererror');
        if (parseErrors.length > 0) {
          const errorText = parseErrors[0].textContent || 'Unknown SVG parse error';
          console.error('SVG validation failed:', errorText);
          throw new Error(`Invalid SVG syntax: ${errorText.substring(0, 100)}`);
        }
      } catch (err: any) {
        console.error('SVG validation error:', err);
        throw new Error(`SVG validation failed: ${err.message}`);
      }

      // Use functional state update to prevent race conditions during batch processing
      let finalUpdatedScan: Scan | null = null;

      setSelectedVaultScan(prevScan => {
        if (!prevScan) return prevScan;

        const updatedQuestions = (prevScan.analysisData?.questions || []).map(question =>
          question.id === id ? {
            ...question,
            sketchSvg: blueprint.svgCode,
            visualConcept: blueprint.visualConcept || question.visualConcept,
            examTip: blueprint.examTip || question.examTip,
            keyFormulas: blueprint.keyFormulas || question.keyFormulas,
            pitfalls: blueprint.pitfalls || question.pitfalls,
            solutionSteps: blueprint.proceduralLogic || question.solutionSteps,
            masteryMaterial: {
              ...question.masteryMaterial,
              logic: blueprint.detailedNotes,
              memoryTrigger: blueprint.mentalAnchor
            }
          } : question
        );

        const updatedScan: Scan = {
          ...prevScan,
          analysisData: {
            ...prevScan.analysisData!,
            questions: updatedQuestions
          }
        };

        finalUpdatedScan = updatedScan;
        return updatedScan;
      });

      // Notify parent after state update completes
      if (finalUpdatedScan) {
        onUpdateScan?.(finalUpdatedScan);
      }

      // Force re-render to show the new image
      setForceRender(prev => prev + 1);

      cache.save(`sketch_${selectedVaultScan.id}_${id}`, blueprint.svgCode, selectedVaultScan.id, 'sketch');
      cache.save(`blueprint_${selectedVaultScan.id}_${id}`, blueprint, selectedVaultScan.id, 'synthesis');

      if (selectedSketch && selectedSketch.id === id) {
        setSelectedSketch({
          ...selectedSketch,
          img: blueprint.svgCode,
          isSvg: true,
          generated: true,
          visualConcept: blueprint.visualConcept,
          formulas: blueprint.keyFormulas,
          tip: blueprint.examTip,
          pitfalls: blueprint.pitfalls,
          detailedNotes: blueprint.detailedNotes,
          proceduralLogic: blueprint.proceduralLogic,
          mentalAnchor: blueprint.mentalAnchor
        });
      }
    } catch (err: any) {
      console.error(err);
      setGenError(err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateAll = async () => {
    const pendingIds = dynamicSketches.filter(s => !s.generated).map(s => s.id);
    const BATCH_SIZE = 10; // Process 10 at a time
    let totalFailed = 0;

    setBatchProgress({ current: 0, total: pendingIds.length, failed: 0 });

    for (let i = 0; i < pendingIds.length; i += BATCH_SIZE) {
      const batch = pendingIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(id => handleGenerate(id)));

      // Count failures in this batch
      const batchFailed = results.filter(r => r.status === 'rejected').length;
      totalFailed += batchFailed;

      setBatchProgress({
        current: Math.min(i + BATCH_SIZE, pendingIds.length),
        total: pendingIds.length,
        failed: totalFailed
      });
    }

    if (totalFailed > 0) {
      setGenError(`Generated ${pendingIds.length - totalFailed}/${pendingIds.length} sketches. ${totalFailed} failed - check console for details.`);
    }

    setBatchProgress(null);
  };

  const renderCard = (item: any) => (
    <div
      key={item.id}
      onClick={() => setSelectedSketch(item)}
      className="bg-white rounded-[1.25rem] p-5 group cursor-pointer border border-slate-100 hover:border-primary-500/50 hover:shadow-xl transition-all duration-500 flex flex-col relative overflow-hidden shadow-sm"
    >
      <div className="absolute top-0 right-0 p-6 z-10 pointer-events-none">
        <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl shadow-lg border uppercase tracking-widest ${item.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
          item.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}>
          {item.tag}
        </span>
      </div>

      <div className="aspect-[4/3] bg-slate-50 rounded-[2rem] mb-6 overflow-hidden relative flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-95 transition-transform duration-500">
        {item.img ? (
          item.isSvg ? (
            <div className="w-full h-full p-5 flex items-center justify-center">
              <div
                className="card-svg-container"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                dangerouslySetInnerHTML={{ __html: item.img }}
              />
              <style>{`
                .card-svg-container svg {
                  max-width: 100%;
                  max-height: 100%;
                  width: auto;
                  height: auto;
                  object-fit: contain;
                }
              `}</style>
            </div>
          ) : (
            <img src={item.img} alt={item.visualConcept} className="w-full h-full object-cover mix-blend-multiply transition-transform duration-1000 group-hover:scale-110" />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-3 p-6 text-center w-full h-full">
            {generatingId === item.id ? (
              <div className="flex flex-col items-center">
                <Sparkles className="animate-spin text-primary-500 mb-2" size={32} />
                <p className="text-[9px] font-bold text-primary-600 uppercase tracking-widest">AI Synthesis...</p>
              </div>
            ) : (
              <>
                <ImageIcon size={40} className="text-slate-200 opacity-30" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleGenerate(item.id); }}
                  className="mt-3 text-[10px] bg-white border border-slate-200 text-slate-900 px-6 py-2.5 rounded-full font-black hover:bg-slate-900 hover:text-white transition-all shadow-md uppercase tracking-widest"
                >
                  Sync Sketch
                </button>
              </>
            )}
          </div>
        )}

        {item.generated && (
          <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 backdrop-blur-md p-8 text-center overflow-hidden">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white mb-2 animate-bounce">
              <Maximize2 size={24} />
            </div>
            <div className="text-xs text-white font-bold leading-relaxed line-clamp-3 italic opacity-80 mb-4 overflow-hidden">
              <RenderWithMath text={item.description} showOptions={false} serif={false} dark={true} className="text-white text-xs" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerate(item.id); }}
                disabled={generatingId !== null}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 group/reg"
              >
                {generatingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} className="group-hover/reg:rotate-180 transition-transform duration-500" />}
                {generatingId === item.id ? 'Syncing...' : 'Regenerate'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-1 pb-1">
        <h3 className="font-bold text-slate-900 leading-tight text-lg line-clamp-2 mb-1.5 font-outfit tracking-tight">
          <RenderWithMath text={item.visualConcept} showOptions={false} serif={false} />
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${item.subject === 'Physics' ? 'bg-indigo-500' : item.subject === 'Chemistry' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-outfit">
            {item.id} <span className="mx-1.5 text-slate-200">/</span> {item.subject}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 p-8 font-instrument text-slate-900 scroller-hide selection:bg-primary-500 selection:text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-3 transition-all font-bold text-[9px] uppercase tracking-widest group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Mastermind
          </button>
          <div className="flex items-center gap-2 text-primary-600 mb-1.5 text-[9px] uppercase tracking-[0.2em] font-bold font-outfit">
            <span>{selectedGrade}</span> <ChevronRight size={10} /> <span>{selectedSubject}</span> <ChevronRight size={10} /> <span>Visual Blueprint</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">
            {selectedVaultScan ? `Visual Notes: ${selectedVaultScan.name}` : 'High-Yield Sketch Gallery'}
          </h1>
          <p className="text-slate-500 mt-3 max-w-2xl text-base font-medium italic leading-relaxed">
            AI-generated visual concepts optimized for board retention.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {recentScans && recentScans.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Selected Analysis Vault</label>
              <select
                value={selectedVaultScan?.id || ''}
                onChange={(e) => {
                  const selected = recentScans.find(s => s.id === e.target.value);
                  if (selected) setSelectedVaultScan(selected);
                }}
                className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer min-w-[200px]"
              >
                <option value="">Select from Vault...</option>
                {recentScans.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.subject})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setGroupByDomain(!groupByDomain)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-primary-400 transition-all shadow-sm">
              {groupByDomain ? 'Show All' : 'Group by Domain'}
            </button>
            <button onClick={handleGenerateAll} disabled={batchProgress !== null} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg flex items-center gap-2.5 shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50 min-w-[180px]">
              {batchProgress ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} className="text-primary-400" />}
              {batchProgress ? (
                <span>{batchProgress.current}/{batchProgress.total} {batchProgress.failed > 0 && <span className="text-rose-400">({batchProgress.failed} ✗)</span>}</span>
              ) : 'Generate All'}
            </button>
          </div>
        </div>
      </div>

      {genError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-rose-600 font-black text-sm">!</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-rose-900 mb-1">Generation Error</h4>
            <p className="text-xs text-rose-700 font-medium">{genError}</p>
            <button
              onClick={() => setGenError(null)}
              className="mt-2 text-xs text-rose-600 hover:text-rose-800 font-bold uppercase tracking-widest"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-3 border-b border-slate-200 scroller-hide">
        {selectedVaultScan && (
          <button
            onClick={() => setActiveTab('Exam Specific')}
            className={`px-6 py-2.5 rounded-xl text-[9px] uppercase tracking-[0.15em] font-bold whitespace-nowrap transition-all ${activeTab === 'Exam Specific' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 bg-white border border-slate-100 shadow-sm'
              }`}
          >
            Exam Specific ({dynamicSketches.length})
          </button>
        )}
        {['Physics', 'Chemistry', 'Biology'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-[9px] uppercase tracking-[0.15em] font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 bg-white border border-slate-100 shadow-sm'
              }`}
          >
            {tab} ({subjectCounts[tab] || 0})
          </button>
        ))}
      </div>

      {(activeTab === 'Exam Specific' || activeTab === 'Physics' || activeTab === 'Chemistry' || activeTab === 'Biology') && availableDomains.length > 1 && (
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-3 scroller-hide">
          {availableDomains.map(domain => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              className={`px-5 py-2 rounded-lg text-[8px] uppercase tracking-[0.12em] font-black whitespace-nowrap transition-all ${selectedDomain === domain ? 'bg-primary-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
            >
              {domain} {domain !== 'All' && categorizedSketches && categorizedSketches[domain] ? `(${categorizedSketches[domain].length})` : ''}
            </button>
          ))}
        </div>
      )}

      {(() => {
        const sketchesToDisplay = selectedDomain === 'All'
          ? displayedSketches
          : (categorizedSketches && categorizedSketches[selectedDomain]) || [];

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sketchesToDisplay.map(item => renderCard(item))}
          </div>
        );
      })()}

      {selectedSketch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setSelectedSketch(null)} />
          <div className="relative w-full max-w-7xl h-full max-h-[90vh] bg-slate-50 rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20">
            <div className="flex-1 bg-[#f8fafc] relative overflow-hidden flex items-center justify-center p-12 group cursor-zoom-in min-h-[400px]">
              <div className="absolute top-8 left-8 z-10">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 text-[10px] font-black rounded-xl border shadow-lg uppercase tracking-widest ${selectedSketch.difficulty === 'Hard' ? 'bg-rose-500 text-white border-rose-400' :
                    selectedSketch.difficulty === 'Medium' ? 'bg-amber-400 text-slate-900 border-amber-300' :
                      'bg-emerald-500 text-white border-emerald-400'
                    }`}>
                    {selectedSketch.difficulty}
                  </span>
                </div>
              </div>
              <div className="absolute top-8 right-8 z-10 flex gap-3">
                <button
                  onClick={() => handleGenerate(selectedSketch.id)}
                  disabled={generatingId !== null}
                  className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center text-slate-700 hover:text-primary-600 shadow-xl border border-slate-200 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 group/reg"
                  title="Regenerate Visual"
                >
                  {generatingId === selectedSketch.id ? <Loader2 size={20} className="animate-spin" /> : <RotateCw size={20} />}
                  <span className="text-[7px] font-black uppercase tracking-tighter mt-1 opacity-0 group-hover/reg:opacity-100 transition-opacity">Regen</span>
                </button>
                <button onClick={() => setSelectedSketch(null)} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-700 hover:text-slate-950 shadow-xl border border-slate-200 transition-all hover:scale-110 active:scale-95">
                  <X size={20} />
                </button>
              </div>
              <div className="w-full h-full flex items-center justify-center relative p-8">
                {selectedSketch.img ? (
                  selectedSketch.isSvg ? (
                    <div className="w-full h-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: selectedSketch.img }} />
                  ) : (
                    <img src={selectedSketch.img} alt={selectedSketch.visualConcept} className="w-full h-auto max-w-full max-h-full object-contain rounded-3xl shadow-2xl" />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-6 text-slate-300">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner border border-slate-100">
                      <Sparkles size={48} className="text-slate-200" />
                    </div>
                    <div className="text-center">
                      <p className="font-outfit font-black text-2xl uppercase tracking-[0.2em] text-slate-400 mb-2">Blueprint Empty</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[240px] leading-relaxed mb-8">Synchronized node data detected. Manifest the visual blueprint to initialize neural anchoring.</p>
                    </div>
                    <button
                      onClick={() => handleGenerate(selectedSketch.id)}
                      disabled={generatingId !== null}
                      className="px-10 py-5 bg-slate-900 border-2 border-slate-800 hover:bg-slate-800 text-white font-black rounded-full shadow-2xl transition-all flex items-center gap-4 uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95"
                    >
                      {generatingId === selectedSketch.id ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-primary-400" />}
                      Generate Visual Blueprint
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-[450px] bg-white border-l border-slate-200 flex flex-col h-full shadow-[-20px_0_50px_rgba(0,0,0,0.05)]">
              <div className="flex-1 overflow-y-auto p-10 scroller-hide space-y-8">
                <section className="relative">
                  <div className="absolute -top-6 -left-6 w-20 h-20 bg-primary-100 rounded-full blur-3xl opacity-40" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full mb-4">
                      <div className={`w-2 h-2 rounded-full ${selectedSketch.subject === 'Physics' ? 'bg-indigo-500' : selectedSketch.subject === 'Chemistry' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{selectedSketch.subject} • {selectedSketch.tag}</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4 font-outfit tracking-tight">
                      <RenderWithMath text={selectedSketch.visualConcept} showOptions={false} serif={false} />
                    </h2>
                    <div className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 rounded-xl p-4 border-l-4 border-primary-400">
                      <RenderWithMath text={selectedSketch.description} showOptions={false} serif={false} />
                    </div>
                  </div>
                </section>

                {selectedSketch.detailedNotes && (
                  <section className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Lightbulb size={14} /> First Principles Deep-Dive
                    </h4>
                    <div className="text-xs text-slate-700 font-bold leading-relaxed space-y-4">
                      <RenderWithMath text={selectedSketch.detailedNotes} showOptions={false} serif={false} />
                    </div>
                  </section>
                )}

                {selectedSketch.proceduralLogic && selectedSketch.proceduralLogic.length > 0 && (
                  <section>
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Sigma size={14} /> Procedural Walkthrough
                    </h4>
                    <div className="space-y-4">
                      {selectedSketch.proceduralLogic.map((step: string, i: number) => (
                        <div key={i} className="flex gap-4 group/step items-start">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 border border-indigo-100 group-hover/step:bg-indigo-600 group-hover/step:text-white transition-colors">
                            {i + 1}
                          </div>
                          <div className="text-[11px] text-slate-600 font-bold flex-1 leading-normal pt-1 group-hover/step:text-slate-900 transition-colors whitespace-normal">
                            <RenderWithMath text={step} showOptions={false} serif={false} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {selectedSketch.formulas && selectedSketch.formulas.length > 0 && (
                  <section className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden group/math">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Sigma size={48} /></div>
                    <h4 className="text-[9px] font-black text-primary-400 uppercase tracking-[0.2em] mb-4 relative z-10">Mathematical DNA</h4>
                    <div className="space-y-4 relative z-10">
                      {selectedSketch.formulas.map((f: string, i: number) => (
                        <div key={i} className="py-2.5 border-b border-white/10 last:border-0">
                          <RenderWithMath text={f.includes('$') ? f : `$$${f}$$`} showOptions={false} serif={false} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {selectedSketch.mentalAnchor && (
                  <section className="relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 shadow-sm">
                      <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" /> Memory Anchor
                      </h4>
                      <div className="text-sm text-amber-900 font-bold leading-relaxed">
                        <RenderWithMath text={selectedSketch.mentalAnchor} showOptions={false} serif={false} />
                      </div>
                    </div>
                  </section>
                )}

                {selectedSketch.tip && (
                  <section className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <Target size={14} className="text-emerald-600" /> Exam Strategy
                    </h4>
                    <div className="text-sm text-emerald-900 font-bold leading-relaxed">
                      <RenderWithMath text={selectedSketch.tip} showOptions={false} serif={false} />
                    </div>
                  </section>
                )}

                {selectedSketch.pitfalls && selectedSketch.pitfalls.length > 0 && (
                  <section className="bg-rose-50 rounded-2xl p-6 border-2 border-rose-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-rose-600" /> Common Traps
                    </h4>
                    <div className="space-y-3">
                      {selectedSketch.pitfalls.map((pitfall: string, i: number) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">!</div>
                          <div className="text-sm text-rose-900 font-medium leading-relaxed flex-1">
                            <RenderWithMath text={pitfall} showOptions={false} serif={false} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                <button className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]">
                  <Printer size={18} className="text-primary-400" /> Print Expert Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SketchGallery;