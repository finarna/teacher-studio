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
import { safeAiParse } from '../utils/aiParser';
import { RenderWithMath } from './MathRenderer';
import { cache } from '../utils/cache';
import { generateSketch, GenerationMethod } from '../utils/sketchGenerators';

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
  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>('svg');

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

    // USE AI-GENERATED CATEGORIZATION
    // Each question now has 'domain' and 'chapter' fields from AI analysis
    const categorized: Record<string, any[]> = {};
    const sketchesToCategorize = filteredSketches;

    sketchesToCategorize.forEach(sketch => {
      // Primary: Use AI-generated domain if available
      const domain = sketch.domain || 'CORE FOUNDATIONS';

      if (!categorized[domain]) {
        categorized[domain] = [];
      }
      categorized[domain].push(sketch);
    });

    // Sort domains by number of questions (largest first)
    const sortedCategorized: Record<string, any[]> = {};
    Object.keys(categorized)
      .sort((a, b) => categorized[b].length - categorized[a].length)
      .forEach(key => {
        sortedCategorized[key] = categorized[key];
      });

    return sortedCategorized;
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

  const handleGenerate = async (id: string) => {
    console.log('🎨 handleGenerate called with id:', id);
    console.log('Vault:', selectedVaultScan?.name, 'Method:', generationMethod);

    if (!selectedVaultScan) {
      console.error('❌ No vault selected');
      setGenError('Please select an Analysis Vault first');
      return;
    }

    if (!onUpdateScan) {
      console.error('❌ onUpdateScan not available');
      setGenError('Update function not available');
      return;
    }

    setGeneratingId(id);
    setGenError(null);

    try {
      const q = scanQuestions.find(it => it.id === id);
      if (!q) {
        console.error('❌ Question not found:', id);
        setGenError(`Question ${id} not found in vault`);
        setGeneratingId(null);
        return;
      }

      console.log('✓ Found question:', q.topic);

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('❌ API Key missing');
        throw new Error("API Key Missing - Add VITE_GEMINI_API_KEY to .env.local");
      }

      console.log('🚀 Starting generation...');

      // Use the selected generation method
      const result = await generateSketch(
        generationMethod,
        q.visualConcept || q.topic,
        q.text,
        selectedVaultScan.subject,
        apiKey,
        undefined // Status update callback (optional)
      );

      console.log(`✓ Generated using ${generationMethod}, isSvg:`, result.isSvg);
      console.log(`📊 Image data size: ${(result.imageData.length / 1024).toFixed(2)} KB`);

      // Use functional state update to prevent race conditions during batch processing
      let finalUpdatedScan: Scan | null = null;

      setSelectedVaultScan(prevScan => {
        if (!prevScan) {
          console.error('❌ prevScan is null in setState callback!');
          return prevScan;
        }

        const updatedQuestions = (prevScan.analysisData?.questions || []).map(question =>
          question.id === id ? {
            ...question,
            sketchSvg: result.imageData,
            visualConcept: result.blueprint.visualConcept || question.visualConcept,
            examTip: result.blueprint.examTip || question.examTip,
            keyFormulas: result.blueprint.keyFormulas || question.keyFormulas,
            pitfalls: result.blueprint.pitfalls || question.pitfalls,
            solutionSteps: result.blueprint.proceduralLogic || question.solutionSteps,
            masteryMaterial: {
              ...question.masteryMaterial,
              logic: result.blueprint.detailedNotes,
              memoryTrigger: result.blueprint.mentalAnchor
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

        console.log(`✓ Updated scan state with new image for question ${id}`);
        finalUpdatedScan = updatedScan;
        return updatedScan;
      });

      // CRITICAL: If selectedVaultScan is null but we still have the scan data,
      // use it directly to persist
      if (!finalUpdatedScan && selectedVaultScan) {
        console.warn('⚠️ Using selectedVaultScan directly (state update may have race condition)');
        const updatedQuestions = (selectedVaultScan.analysisData?.questions || []).map(question =>
          question.id === id ? {
            ...question,
            sketchSvg: result.imageData,
            visualConcept: result.blueprint.visualConcept || question.visualConcept,
            examTip: result.blueprint.examTip || question.examTip,
            keyFormulas: result.blueprint.keyFormulas || question.keyFormulas,
            pitfalls: result.blueprint.pitfalls || question.pitfalls,
            solutionSteps: result.blueprint.proceduralLogic || question.solutionSteps,
            masteryMaterial: {
              ...question.masteryMaterial,
              logic: result.blueprint.detailedNotes,
              memoryTrigger: result.blueprint.mentalAnchor
            }
          } : question
        );

        finalUpdatedScan = {
          ...selectedVaultScan,
          analysisData: {
            ...selectedVaultScan.analysisData!,
            questions: updatedQuestions
          }
        };
      }

      // Notify parent after state update completes
      if (finalUpdatedScan) {
        console.log(`📤 Calling onUpdateScan to persist data...`);
        console.log(`📊 Updated scan data:`, {
          scanId: finalUpdatedScan.id,
          questionCount: finalUpdatedScan.analysisData?.questions?.length,
          updatedQuestionId: id,
          hasSketchSvg: finalUpdatedScan.analysisData?.questions?.find(q => q.id === id)?.sketchSvg ? true : false,
          sketchSvgSize: finalUpdatedScan.analysisData?.questions?.find(q => q.id === id)?.sketchSvg?.length || 0
        });

        await onUpdateScan?.(finalUpdatedScan);
        console.log(`✓ onUpdateScan completed`);

        // Verify the save by checking if the data is actually in the parent state
        console.log(`🔍 Verifying save...`);
      } else {
        console.error('❌ finalUpdatedScan is null - state update may have failed');
      }

      // Force re-render to show the new image
      setForceRender(prev => prev + 1);
      console.log(`✓ Forced re-render to display new image`);

      cache.save(`sketch_${generationMethod}_${selectedVaultScan.id}_${id}`, result.imageData, selectedVaultScan.id, 'sketch');
      cache.save(`blueprint_${selectedVaultScan.id}_${id}`, result.blueprint, selectedVaultScan.id, 'synthesis');

      if (selectedSketch && selectedSketch.id === id) {
        setSelectedSketch({
          ...selectedSketch,
          img: result.imageData,
          isSvg: result.isSvg,
          generated: true,
          visualConcept: result.blueprint.visualConcept,
          formulas: result.blueprint.keyFormulas,
          tip: result.blueprint.examTip,
          pitfalls: result.blueprint.pitfalls,
          detailedNotes: result.blueprint.detailedNotes,
          proceduralLogic: result.blueprint.proceduralLogic,
          mentalAnchor: result.blueprint.mentalAnchor
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
    // Validation: Check if vault is selected
    if (!selectedVaultScan) {
      setGenError('Please select an Analysis Vault first to generate sketches.');
      return;
    }

    if (!onUpdateScan) {
      setGenError('Update function not available.');
      return;
    }

    // Get all questions that need generation (either no image or want to regenerate)
    const allIds = dynamicSketches.map(s => s.id);

    if (allIds.length === 0) {
      setGenError('No questions found in the selected vault. Please scan a paper first.');
      return;
    }

    console.log(`Starting batch generation for ${allIds.length} questions using ${generationMethod}`);
    console.log(`⚠️ Note: Free tier has rate limits. Processing slowly to avoid hitting limits.`);

    // REDUCED BATCH SIZE to respect API rate limits
    // Each question makes 2 API calls (content + image)
    // Free tier: 10 requests/minute for gemini-2.0-flash-exp
    // So we can only do 2-3 questions per minute safely
    const BATCH_SIZE = 2; // Process 2 at a time
    const DELAY_BETWEEN_BATCHES = 15000; // 15 seconds between batches
    const DELAY_BETWEEN_QUESTIONS = 5000; // 5 seconds between questions

    let totalFailed = 0;

    setBatchProgress({ current: 0, total: allIds.length, failed: 0 });

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}, questions:`, batch);

      // Process questions ONE AT A TIME within the batch to avoid rate limits
      for (const id of batch) {
        try {
          await handleGenerate(id);
          console.log(`✓ Successfully generated sketch for ${id}`);
        } catch (error: any) {
          console.error(`✗ Failed to generate sketch for ${id}:`, error.message);
          totalFailed++;
        }

        // Update progress after each question
        const completed = i + batch.indexOf(id) + 1;
        setBatchProgress({
          current: completed,
          total: allIds.length,
          failed: totalFailed
        });

        // Wait between questions to respect rate limits
        if (batch.indexOf(id) < batch.length - 1) {
          console.log(`⏱️ Waiting ${DELAY_BETWEEN_QUESTIONS/1000}s before next question...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_QUESTIONS));
        }
      }

      // Wait between batches
      if (i + BATCH_SIZE < allIds.length) {
        console.log(`⏱️ Batch complete. Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`Batch generation complete. Success: ${allIds.length - totalFailed}, Failed: ${totalFailed}`);

    if (totalFailed > 0) {
      setGenError(`Generated ${allIds.length - totalFailed}/${allIds.length} sketches. ${totalFailed} failed - check console for details. Tip: Upgrade your API plan for higher rate limits.`);
    } else {
      // Success message
      setGenError(null);
    }

    setBatchProgress(null);
  };

  const renderCard = (item: any) => (
    <div
      key={item.id}
      onClick={() => setSelectedSketch(item)}
      className="bg-white rounded-2xl overflow-hidden group cursor-pointer border border-slate-200/50 hover:border-primary-400/60 hover:shadow-2xl transition-all duration-500 flex flex-col relative"
    >
      {/* Marks badge - positioned absolutely over image */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <span className="text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-md bg-white/90 border border-slate-200/50 uppercase tracking-widest text-slate-700">
          {item.tag}
        </span>
      </div>

      {/* Image area - edge to edge, maximum space */}
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100/50 overflow-hidden relative flex items-center justify-center">
        {item.img ? (
          item.isSvg ? (
            <div className="w-full h-full p-6 flex items-center justify-center">
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
            <img
              src={item.img}
              alt={item.visualConcept}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-4 p-6 text-center w-full h-full">
            {generatingId === item.id ? (
              <div className="flex flex-col items-center">
                <Sparkles className="animate-spin text-primary-500 mb-3" size={36} />
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Generating...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <ImageIcon size={32} className="text-slate-300" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGenerate(item.id); }}
                  className="text-[10px] bg-slate-900 text-white px-6 py-2.5 rounded-full font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest"
                >
                  Generate
                </button>
              </>
            )}
          </div>
        )}

        {/* Hover overlay with regenerate */}
        {item.generated && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-end p-6 pb-8">
            <button
              onClick={(e) => { e.stopPropagation(); handleGenerate(item.id); }}
              disabled={generatingId !== null}
              className="px-5 py-2.5 bg-white/95 hover:bg-white text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 backdrop-blur-sm"
            >
              {generatingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Compact title area */}
      <div className="px-4 py-4 bg-white">
        <h3 className="font-bold text-slate-900 leading-snug text-base line-clamp-2 mb-2 font-outfit">
          <RenderWithMath text={item.visualConcept} showOptions={false} serif={false} />
        </h3>
        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          <div className={`w-1.5 h-1.5 rounded-full ${item.subject === 'Physics' ? 'bg-indigo-500' : item.subject === 'Chemistry' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
          <span>{item.subject}</span>
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
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Analysis Vault</label>
              <select
                value={selectedVaultScan?.id || ''}
                onChange={(e) => {
                  const selected = recentScans?.find(s => s.id === e.target.value);
                  if (selected) {
                    setSelectedVaultScan(selected);
                    setActiveTab('Exam Specific');
                  }
                }}
                className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer min-w-[220px]"
                disabled={!recentScans || recentScans.length === 0}
              >
                <option value="">
                  {!recentScans || recentScans.length === 0
                    ? 'No scans available - scan a paper first'
                    : 'Select from Vault...'}
                </option>
                {recentScans?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subject}) - {s.analysisData?.questions?.length || 0} questions
                  </option>
                ))}
              </select>
              {selectedVaultScan && (
                <div className="text-[8px] text-emerald-600 font-bold px-1 leading-relaxed flex items-center gap-1">
                  ✓ {selectedVaultScan.name} • {selectedVaultScan.analysisData?.questions?.length || 0} questions
                </div>
              )}
              {(!recentScans || recentScans.length === 0) && (
                <div className="text-[8px] text-amber-600 font-medium px-1 leading-relaxed">
                  💡 Scan a paper in "Paper Scan" to create sketch notes
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Generation Method</label>
              <select
                value={generationMethod}
                onChange={(e) => setGenerationMethod(e.target.value as GenerationMethod)}
                className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer min-w-[220px]"
              >
                <option value="svg">SVG (Programmatic)</option>
                <option value="gemini-3-pro-image">Gemini 3 Pro Image ⭐</option>
                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
              </select>
              <div className="text-[8px] text-slate-500 font-medium px-1 leading-relaxed">
                {generationMethod === 'svg' && '🎨 Scalable vector graphics • Crisp & editable'}
                {generationMethod === 'gemini-3-pro-image' && '⭐ Best quality • Advanced text rendering • High-res (1K-4K)'}
                {generationMethod === 'gemini-2.5-flash-image' && '⚡ Fast & balanced • Good quality • Cost-effective'}
              </div>
            </div>
          </div>
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

      {batchProgress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Loader2 className="animate-spin text-blue-600" size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-blue-900 mb-1">Batch Generation in Progress</h4>
            <p className="text-xs text-blue-700 font-medium mb-2">
              Processing slowly to respect API rate limits (Free tier: 10 req/min)
            </p>
            <div className="text-[10px] text-blue-600 font-medium space-y-1">
              <div>• Each question needs ~20 seconds (2 API calls per question)</div>
              <div>• For 10 questions: approximately 3-5 minutes total</div>
              <div>• Upgrade your API plan for faster generation</div>
            </div>
          </div>
        </div>
      )}

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

      {/* Hierarchical Domain -> Chapter Display */}
      {groupByDomain && categorizedSketches && Object.keys(categorizedSketches).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(categorizedSketches).map(([domain, sketches]) => {
            // Group by chapter within each domain
            const chapterGroups: Record<string, any[]> = {};
            sketches.forEach(sketch => {
              const chapter = sketch.chapter || 'General';
              if (!chapterGroups[chapter]) chapterGroups[chapter] = [];
              chapterGroups[chapter].push(sketch);
            });

            return (
              <div key={domain} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                {/* Domain Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest font-outfit">
                    {domain}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {sketches.length}
                  </span>
                </div>

                {/* Chapters Pills */}
                <div className="flex gap-2 flex-wrap mb-6">
                  {Object.entries(chapterGroups)
                    .sort((a, b) => b[1].length - a[1].length) // Sort by count
                    .map(([chapter, chapterSketches]) => (
                      <button
                        key={chapter}
                        className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50 transition-all"
                      >
                        {chapter} <span className="text-slate-400 ml-1">({chapterSketches.length})</span>
                      </button>
                    ))}
                </div>

                {/* Cards Grid for this domain */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sketches.map(item => renderCard(item))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {displayedSketches.map(item => renderCard(item))}
        </div>
      )}

      {selectedSketch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setSelectedSketch(null)} />
          <div className="relative w-full max-w-7xl h-full max-h-[90vh] bg-slate-50 rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20">
            <div className="flex-1 bg-[#f8fafc] relative overflow-hidden flex items-center justify-center group min-h-[400px]">
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
              {selectedSketch.img ? (
                selectedSketch.isSvg ? (
                  <div className="absolute inset-0 w-full h-full p-8 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: selectedSketch.img }} />
                ) : (
                  <img
                    src={selectedSketch.img}
                    alt={selectedSketch.visualConcept}
                    className="absolute inset-0 w-full h-full object-contain p-4"
                    style={{
                      objectFit: 'contain',
                      maxWidth: '100%',
                      maxHeight: '100%'
                    }}
                  />
                )
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
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
                </div>
              )}
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