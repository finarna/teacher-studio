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
  Target,
  FileQuestion
} from 'lucide-react';
import { Scan, AnalyzedQuestion } from '../types';
import { safeAiParse } from '../utils/aiParser';
import { RenderWithMath } from './MathRenderer';
import { cache } from '../utils/cache';
import { generateSketch, GenerationMethod, generateTopicBasedSketch, TopicBasedSketchResult } from '../utils/sketchGenerators';
import { useFilteredScans } from '../hooks/useFilteredScans';
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';

interface SketchGalleryProps {
  onBack?: () => void;
  scan?: Scan | null;
  onUpdateScan?: (scan: Scan) => void;
  recentScans?: Scan[];
}

const STATIC_SKETCHES: any[] = [];

// Helper function to convert LaTeX delimiters
const convertLatexDelimiters = (text: string): string => {
  if (!text) return text;
  // Convert \(...\) to $...$
  let converted = text.replace(/\\\((.*?)\\\)/g, '$$$1$$');
  // Convert \[...\] to $$...$$
  converted = converted.replace(/\\\[(.*?)\\\]/g, '$$$$$$1$$$$');
  return converted;
};

const SketchGallery: React.FC<SketchGalleryProps> = ({ onBack, scan, onUpdateScan, recentScans }) => {
  // Use AppContext for filtering and theming
  const { subjectConfig, activeSubject } = useAppContext();
  const theme = useSubjectTheme();
  const { scans: filteredScans } = useFilteredScans(recentScans || []);

  const [activeTab, setActiveTab] = useState(scan ? 'Exam Specific' : 'All Subjects');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedSketch, setSelectedSketch] = useState<any | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  // Only use scan prop if it matches the active subject
  const [selectedVaultScan, setSelectedVaultScan] = useState<Scan | null>(
    scan && scan.subject === activeSubject ? scan : null
  );
  const [groupByDomain, setGroupByDomain] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, failed: number} | null>(null);
  const [forceRender, setForceRender] = useState(0);

  // Use context values instead of local state
  const selectedGrade = 'Class 12';
  const selectedSubject = activeSubject;
  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>('gemini-2.5-flash-image');
  const [selectedChapterPerDomain, setSelectedChapterPerDomain] = useState<Record<string, string>>({});
  const [selectedDomainInGroupedView, setSelectedDomainInGroupedView] = useState<string | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [topicBasedSketches, setTopicBasedSketches] = useState<Record<string, TopicBasedSketchResult>>({});
  const [selectedTopicPage, setSelectedTopicPage] = useState<Record<string, number>>({});
  const [enlargedImage, setEnlargedImage] = useState<{ imageUrl: string, title: string, topic: string } | null>(null);
  const [flipBookOpen, setFlipBookOpen] = useState<{ topic: string, sketch: TopicBasedSketchResult } | null>(null);
  const [flipBookCurrentPage, setFlipBookCurrentPage] = useState(0);
  const [showPrintView, setShowPrintView] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');
  const [isMobileView, setIsMobileView] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // CRITICAL FIX: Auto-clear selectedVaultScan when subject changes and current scan doesn't match
  // Use ref to prevent infinite loops
  const lastClearedScanRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (selectedVaultScan) {
      const isStillValid = filteredScans?.some(s => s.id === selectedVaultScan.id);

      // If current scan doesn't match subject and we haven't cleared it yet
      if (!isStillValid && lastClearedScanRef.current !== selectedVaultScan.id) {
        lastClearedScanRef.current = selectedVaultScan.id;

        // Clear selectedVaultScan - will allow user to select from filtered scans
        setSelectedVaultScan(null);
        // Clear topics when clearing scan
        setTopicBasedSketches({});
      }
    } else {
      // Reset tracking when scan is null
      lastClearedScanRef.current = null;
    }
  }, [activeSubject, selectedVaultScan, filteredScans]);

  const handleFlipPage = (direction: 'forward' | 'backward') => {
    if (isFlipping) return;

    setIsFlipping(true);
    setFlipDirection(direction);

    const animationDuration = isMobileView ? 400 : 600;

    setTimeout(() => {
      if (direction === 'forward') {
        setFlipBookCurrentPage(prev => Math.min(flipBookOpen?.sketch.pages.length || 0, prev + 1));
      } else {
        setFlipBookCurrentPage(prev => Math.max(0, prev - 1));
      }

      setTimeout(() => {
        setIsFlipping(false);
      }, 100);
    }, animationDuration);
  };

  // Close flip book and reset all related state
  const closeFlipBook = () => {
    // Exit fullscreen if active
    if (isFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }

    // Reset all flip book state
    setFlipBookOpen(null);
    setFlipBookCurrentPage(0);
    setZoomLevel(1);
    setShowThumbnails(false);
    setIsFullscreen(false);
    setShowPrintView(false);
  };

  // Touch gesture handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleFlipPage('forward');
    } else if (isRightSwipe) {
      handleFlipPage('backward');
    }
  };

  // Keyboard navigation for flip book
  useEffect(() => {
    if (!flipBookOpen || showPrintView) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (flipBookCurrentPage < (flipBookOpen?.sketch.pages.length || 0)) {
          handleFlipPage('forward');
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (flipBookCurrentPage > 0) {
          handleFlipPage('backward');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipBookOpen, flipBookCurrentPage, showPrintView, isFlipping]);

  // Auto-select first filtered scan if no scan is selected
  useEffect(() => {
    if (!selectedVaultScan && filteredScans && filteredScans.length > 0) {
      const latest = filteredScans[0]; // Use filteredScans, not recentScans
      setSelectedVaultScan(latest);
      setActiveTab('Exam Specific');
    }
  }, [filteredScans, selectedVaultScan]);

  // Removed: selectedGrade and selectedSubject now come from context, not local state

  // Load topic-based sketches when scan changes (from DB/Redis via scan object)
  useEffect(() => {
    if (!selectedVaultScan) {
      setTopicBasedSketches({});
      return;
    }

    console.log('📦 Loading topic sketches for scan:', selectedVaultScan.id);

    // PRIORITY 1: Load from scan.analysisData.topicBasedSketches (Redis/DB)
    if (selectedVaultScan.analysisData?.topicBasedSketches) {
      const dbSketches = selectedVaultScan.analysisData.topicBasedSketches as Record<string, TopicBasedSketchResult>;
      console.log(`✅ Loaded ${Object.keys(dbSketches).length} topics from DB/Redis:`, Object.keys(dbSketches));
      setTopicBasedSketches(dbSketches);
      return;
    }

    // FALLBACK: Try loading from localStorage cache (backwards compatibility)
    console.log('ℹ️ No DB data found, checking localStorage cache...');
    const cachedEntries = cache.getByScan(selectedVaultScan.id);
    const topicSketchEntries = cachedEntries.filter(e => e.type === 'topic-sketch');

    if (topicSketchEntries.length > 0) {
      console.log(`⚠️ Found ${topicSketchEntries.length} cached topic sketches in localStorage (migrating to DB...)`);

      // Rebuild topicBasedSketches state from cache
      const loadedSketches: Record<string, TopicBasedSketchResult> = {};

      topicSketchEntries.forEach(entry => {
        // Extract topic name from cache key: "topic_sketch_{scanId}_{topic}"
        const keyPrefix = `topic_sketch_${selectedVaultScan.id}_`;
        const topic = entry.key.replace(keyPrefix, '');

        loadedSketches[topic] = entry.data as TopicBasedSketchResult;
      });

      setTopicBasedSketches(loadedSketches);

      // Auto-migrate to DB
      if (onUpdateScan) {
        console.log('🔄 Auto-migrating localStorage sketches to DB/Redis...');
        const updatedScan = {
          ...selectedVaultScan,
          analysisData: {
            ...selectedVaultScan.analysisData!,
            topicBasedSketches: loadedSketches
          }
        };
        onUpdateScan(updatedScan);
      }
    } else {
      console.log('ℹ️ No topic sketches found (DB or cache)');
      setTopicBasedSketches({});
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
      const imageContent = q.sketchSvg || q.diagramUrl || '';

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
        img: imageContent || null,
        description: q.text || "",
        difficulty: q.difficulty || "Moderate",
        generated: !!(q.sketchSvg || q.diagramUrl),
        formulas: q.keyFormulas || [],
        tip: q.examTip || "",
        pitfalls: q.pitfalls || [],
        detailedNotes: q.masteryMaterial?.logic || "",
        mentalAnchor: q.masteryMaterial?.memoryTrigger || "",
        proceduralLogic: q.solutionSteps || [],
        domain: q.domain,
        chapter: q.chapter
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
              const imageContent = q.sketchSvg || q.diagramUrl || '';

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
                img: imageContent || null,
                description: q.text || "",
                difficulty: q.difficulty || "Moderate",
                generated: !!(q.sketchSvg || q.diagramUrl),
                formulas: q.keyFormulas || [],
                tip: q.examTip || "",
                pitfalls: q.pitfalls || [],
                detailedNotes: q.masteryMaterial?.logic || "",
                mentalAnchor: q.masteryMaterial?.memoryTrigger || "",
                proceduralLogic: q.solutionSteps || [],
                domain: q.domain,
                chapter: q.chapter,
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

  // Group questions by topic for topic-based multi-page sketches
  const topicGroups = useMemo(() => {
    if (!selectedVaultScan) return {};

    const groups: Record<string, {topic: string, questions: AnalyzedQuestion[], count: number}> = {};

    scanQuestions.forEach(q => {
      const topic = q.topic || 'General';
      if (!groups[topic]) {
        groups[topic] = {
          topic,
          questions: [],
          count: 0
        };
      }
      groups[topic].questions.push(q);
      groups[topic].count++;
    });

    return groups;
  }, [selectedVaultScan, scanQuestions]);

  // Get currently visible sketches based on active filters
  const currentlyVisibleSketches = useMemo(() => {
    if (groupByDomain && selectedDomainInGroupedView && categorizedSketches?.[selectedDomainInGroupedView]) {
      const domainSketches = categorizedSketches[selectedDomainInGroupedView];
      const selectedChapter = selectedChapterPerDomain[selectedDomainInGroupedView];

      if (!selectedChapter) {
        return domainSketches;
      }

      return domainSketches.filter(item => (item.chapter || 'General') === selectedChapter);
    }

    return displayedSketches;
  }, [groupByDomain, selectedDomainInGroupedView, categorizedSketches, selectedChapterPerDomain, displayedSketches]);

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
    setSelectedChapterPerDomain({});
  }, [activeTab]);

  // Set initial selected domain when categorizedSketches changes
  useEffect(() => {
    if (groupByDomain && categorizedSketches && Object.keys(categorizedSketches).length > 0) {
      if (!selectedDomainInGroupedView || !categorizedSketches[selectedDomainInGroupedView]) {
        setSelectedDomainInGroupedView(Object.keys(categorizedSketches)[0]);
      }
    }
  }, [categorizedSketches, groupByDomain]);

  const handleGenerate = async (id: string, skipSync: boolean = false) => {
    console.log('🎨 handleGenerate called with id:', id, 'skipSync:', skipSync);
    console.log('Vault:', selectedVaultScan?.name, 'Method:', generationMethod);

    if (!selectedVaultScan) {
      console.error('❌ No vault selected');
      setGenError('Please select an Analysis Vault first');
      return;
    }

    if (!onUpdateScan && !skipSync) {
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

      console.log(`✓ Generated using ${generationMethod}`);
      console.log(`📊 Image data size: ${(result.imageData.length / 1024).toFixed(2)} KB`);

      // Update state with the new image - simplified approach
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

        // If NOT in batch mode, sync immediately to Redis
        if (!skipSync && onUpdateScan) {
          console.log(`📤 Syncing to Redis immediately (single generation mode)...`);
          onUpdateScan(updatedScan);
        } else if (skipSync) {
          console.log(`⏭️ Skipping immediate sync (batch mode - will sync periodically)`);
        }

        return updatedScan;
      });

      // Force re-render to show the new image
      setForceRender(prev => prev + 1);
      console.log(`✓ Forced re-render to display new image`);

      cache.save(`sketch_${generationMethod}_${selectedVaultScan.id}_${id}`, result.imageData, selectedVaultScan.id, 'sketch');
      cache.save(`blueprint_${selectedVaultScan.id}_${id}`, result.blueprint, selectedVaultScan.id, 'synthesis');

      if (selectedSketch && selectedSketch.id === id) {
        setSelectedSketch({
          ...selectedSketch,
          img: result.imageData,
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

  // Handle topic-based generation
  const handleGenerateTopic = async (topic: string) => {
    if (!selectedVaultScan) {
      setGenError('Please select an Analysis Vault first.');
      return;
    }

    const topicGroup = topicGroups[topic];
    if (!topicGroup || topicGroup.questions.length === 0) {
      setGenError(`No questions found for topic: ${topic}`);
      return;
    }

    setGeneratingId(topic);
    setGenError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key Missing - Add VITE_GEMINI_API_KEY to .env.local");
      }

      console.log(`🎨 Generating topic-based sketch for: ${topic} (${topicGroup.count} questions)`);

      const result = await generateTopicBasedSketch(
        topic,
        topicGroup.questions.map(q => ({
          id: q.id,
          text: q.text,
          difficulty: q.difficulty,
          marks: Number(q.marks) || 1
        })),
        selectedVaultScan.subject,
        apiKey,
        (status) => console.log(`📊 ${status}`)
      );

      console.log(`✓ Generated ${result.pages.length} pages for ${topic}`);

      // Update local state
      const updatedTopicSketches = {
        ...topicBasedSketches,
        [topic]: result
      };

      setTopicBasedSketches(updatedTopicSketches);

      // Initialize page selection to page 1
      setSelectedTopicPage(prev => ({
        ...prev,
        [topic]: 0
      }));

      // PRIORITY: Save to DB/Redis via scan object
      if (onUpdateScan) {
        console.log(`📤 Syncing topic sketch "${topic}" to Redis/DB...`);
        const updatedScan = {
          ...selectedVaultScan,
          analysisData: {
            ...selectedVaultScan.analysisData!,
            topicBasedSketches: updatedTopicSketches
          }
        };
        onUpdateScan(updatedScan);
      } else {
        console.warn('⚠️ onUpdateScan not available, falling back to localStorage only');
      }

      // BACKUP: Also cache to localStorage for offline access
      cache.save(`topic_sketch_${selectedVaultScan.id}_${topic}`, result, selectedVaultScan.id, 'topic-sketch');

      setForceRender(prev => prev + 1);
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

    // Generate all topics
    const allTopics = Object.keys(topicGroups);

    if (allTopics.length === 0) {
      setGenError('No topics found in the current view. Please adjust filters or scan a paper first.');
      return;
    }

    console.log(`Starting batch generation for ${allTopics.length} topics`);
    console.log(`⚠️ Note: Each topic generates 4 pages. Processing with delays to respect rate limits.`);

    const DELAY_BETWEEN_TOPICS = 5000; // 5 seconds between topics (each topic makes 5 API calls)

    let totalFailed = 0;

    setBatchProgress({ current: 0, total: allTopics.length, failed: 0 });

    for (let i = 0; i < allTopics.length; i++) {
      const topic = allTopics[i];

      try {
        await handleGenerateTopic(topic);
        console.log(`✓ Successfully generated ${topicBasedSketches[topic]?.pages.length || 4} pages for ${topic}`);
      } catch (error: any) {
        console.error(`✗ Failed to generate sketch for ${topic}:`, error.message);
        totalFailed++;
      }

      // Update progress after each topic
      const completed = i + 1;
      setBatchProgress({
        current: completed,
        total: allTopics.length,
        failed: totalFailed
      });

      // Wait between topics to respect rate limits (except for last topic)
      if (i < allTopics.length - 1) {
        console.log(`⏱️ Waiting ${DELAY_BETWEEN_TOPICS/1000}s before next topic...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TOPICS));
      }
    }

    console.log(`🎉 Batch generation complete. Success: ${allTopics.length - totalFailed}, Failed: ${totalFailed}`);

    if (totalFailed > 0) {
      setGenError(`Generated ${allTopics.length - totalFailed}/${allTopics.length} topic guides. ${totalFailed} failed - check console for details.`);
    } else {
      setGenError(null);
    }

    setBatchProgress(null);
  };

  // Download all images with sketches
  const handleDownloadAll = () => {
    const sketchesWithImages = currentlyVisibleSketches.filter(s => s.img && s.img.length > 0);

    if (sketchesWithImages.length === 0) {
      alert('No images to download in current view');
      return;
    }

    console.log(`📥 Downloading ${sketchesWithImages.length} images...`);

    sketchesWithImages.forEach((sketch, index) => {
      const link = document.createElement('a');
      const timestamp = Date.now();
      const filename = `${sketch.id}_${sketch.visualConcept.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${timestamp}.png`;

      // PNG: Use data URL directly
      link.href = sketch.img;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    console.log(`✅ Downloaded ${sketchesWithImages.length} images`);
    alert(`Downloaded ${sketchesWithImages.length} images successfully!`);
  };

  // Manual force sync to Redis
  const handleForceSync = async () => {
    if (!selectedVaultScan || !onUpdateScan) {
      alert('No scan selected or update function not available');
      return;
    }

    const questionsWithImages = selectedVaultScan.analysisData?.questions?.filter(q => q.sketchSvg).length || 0;

    if (questionsWithImages === 0) {
      alert('No images to sync');
      return;
    }

    const confirm = window.confirm(
      `Force sync ${questionsWithImages} images to Redis?\n\n` +
      `Scan: ${selectedVaultScan.name}\n` +
      `Total Questions: ${selectedVaultScan.analysisData?.questions?.length}\n` +
      `Questions with Images: ${questionsWithImages}`
    );

    if (!confirm) return;

    console.log(`🔄 Force syncing to Redis...`);
    console.log(`📊 Scan:`, selectedVaultScan.name);
    console.log(`📊 Images:`, questionsWithImages);

    try {
      await onUpdateScan(selectedVaultScan);
      console.log(`✅ Force sync successful!`);
      alert(`✅ Successfully synced ${questionsWithImages} images to Redis!`);
    } catch (err) {
      console.error(`❌ Force sync failed:`, err);
      alert(`❌ Force sync failed. Check console for details.`);
    }
  };

  // Export scan data as JSON backup
  const handleExportBackup = () => {
    if (!selectedVaultScan) {
      alert('No scan selected');
      return;
    }

    const backup = {
      exportDate: new Date().toISOString(),
      scan: selectedVaultScan
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${selectedVaultScan.id}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const questionsWithImages = selectedVaultScan.analysisData?.questions?.filter(q => q.sketchSvg).length || 0;
    console.log(`💾 Exported backup with ${questionsWithImages} images`);
    alert(`💾 Backup exported successfully!\n${questionsWithImages} images included`);
  };

  // Render topic-based multi-page card
  const renderTopicCard = (topic: string, group: {topic: string, questions: AnalyzedQuestion[], count: number}) => {
    const sketch = topicBasedSketches[topic];
    const currentPage = selectedTopicPage[topic] || 0;
    const isGenerating = generatingId === topic;

    return (
      <div key={topic} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-slate-200 overflow-hidden group">
        {/* Image/Preview Section */}
        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex items-center justify-center">
          {sketch && sketch.pages.length > 0 ? (
            <>
              {/* Multi-page carousel */}
              <div
                className="w-full h-full relative cursor-pointer group/image"
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipBookOpen({ topic, sketch });
                  setFlipBookCurrentPage(0); // Always start at cover page
                }}
              >
                <img
                  src={sketch.pages[currentPage].imageData}
                  alt={`${topic} - Page ${currentPage + 1}`}
                  className="w-full h-full object-contain group-hover/image:scale-[1.02] transition-transform"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover/image:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Open Flip Book
                    </p>
                  </div>
                </div>
              </div>

              {/* Page indicator & navigation */}
              <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevPage = currentPage > 0 ? currentPage - 1 : sketch.pages.length - 1;
                    setSelectedTopicPage(prev => ({ ...prev, [topic]: prevPage }));
                  }}
                  className="p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition-all shadow-lg"
                  disabled={isGenerating}
                >
                  <ArrowLeft size={14} />
                </button>

                <div className="px-3 py-1 bg-slate-900/80 text-white rounded-full text-[10px] font-bold backdrop-blur-sm">
                  Page {currentPage + 1} / {sketch.pages.length}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextPage = currentPage < sketch.pages.length - 1 ? currentPage + 1 : 0;
                    setSelectedTopicPage(prev => ({ ...prev, [topic]: nextPage }));
                  }}
                  className="p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition-all shadow-lg"
                  disabled={isGenerating}
                >
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Page title overlay */}
              <div className="absolute top-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[9px] font-bold text-slate-700 truncate">
                {sketch.pages[currentPage].title}
              </div>
            </>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-primary-600" size={32} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Generating...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-4">
              <Sparkles size={32} className="text-slate-300" />
              <button
                onClick={() => handleGenerateTopic(topic)}
                className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary-700 transition-all shadow-md"
              >
                Generate Study Guide
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="px-4 py-4 bg-white">
          <h3 className="font-bold text-slate-900 leading-snug text-base mb-2 font-outfit">
            {topic}
          </h3>
          <div className="flex items-center gap-3 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <FileQuestion size={12} className="text-slate-400" />
              <span>{group.count} Questions</span>
            </div>
            {sketch && (
              <div className="flex items-center gap-1.5">
                <ImageIcon size={12} className="text-green-500" />
                <span className="text-green-600">{sketch.pages.length} Pages</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCard = (item: any) => (
    <div
      key={item.id}
      onClick={() => setSelectedSketch(item)}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer border border-slate-200 hover:border-primary-400 flex flex-col relative shadow-sm hover:shadow-md"
    >
      {/* Marks badge - positioned absolutely over image */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <span className="text-[10px] font-black px-3 py-1.5 rounded-lg shadow-md bg-white border border-slate-200 uppercase tracking-widest text-slate-700">
          {item.tag}
        </span>
      </div>

      {/* Image area - edge to edge, maximum space */}
      <div className="aspect-[4/3] bg-slate-50 overflow-hidden relative flex items-center justify-center">
        {item.img ? (
          <img
            src={item.img}
            alt={item.visualConcept}
            className="w-full h-full object-cover"
          />
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
                  className="text-[10px] bg-slate-900 text-white px-6 py-2.5 rounded-full font-black hover:bg-slate-800 shadow-lg uppercase tracking-widest"
                >
                  Generate
                </button>
              </>
            )}
          </div>
        )}

        {/* Regenerate button - simple, no overlay */}
        {item.generated && (
          <button
            onClick={(e) => { e.stopPropagation(); handleGenerate(item.id); }}
            disabled={generatingId !== null}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white text-slate-900 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 border border-slate-200"
          >
            {generatingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
            Regen
          </button>
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
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 font-instrument text-slate-900 scroller-hide selection:bg-primary-500 selection:text-white">
      {/* Ultra-Minimal Header - Single Line */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onBack} className="text-slate-400 hover:text-slate-900 transition-all">
              <ArrowLeft size={18} />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <h1 className="text-sm font-bold text-slate-900 truncate">
              {selectedVaultScan?.name || 'Sketch Notes'}
            </h1>
            <span className="text-xs text-slate-400 shrink-0">
              {Object.keys(topicGroups).length} topics
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedVaultScan?.id || ''}
              onChange={(e) => {
                const selected = filteredScans?.find(s => s.id === e.target.value);
                if (selected) {
                  setSelectedVaultScan(selected);
                  setActiveTab('Exam Specific');
                }
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded px-2 py-1 text-[9px] font-semibold outline-none cursor-pointer hover:border-slate-300"
              disabled={!filteredScans || filteredScans.length === 0}
            >
              <option value="">{!filteredScans || filteredScans.length === 0 ? `No ${subjectConfig.name} Papers` : `${subjectConfig.name} Paper...`}</option>
              {filteredScans?.map(s => (
                <option key={s.id} value={s.id}>{s.name.substring(0, 25)}</option>
              ))}
            </select>

            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className={`px-3 py-1 rounded flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
                filterPanelOpen || groupByDomain || activeTab !== 'Exam Specific'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Filter size={12} />
              Filters
            </button>

            <button
              onClick={handleGenerateAll}
              disabled={batchProgress !== null || Object.keys(topicGroups).length === 0}
              className="px-3 py-1 bg-primary-600 text-white font-bold rounded flex items-center gap-1.5 hover:bg-primary-700 transition-all text-[9px] uppercase tracking-wider disabled:opacity-50 shadow-md"
              title="Generate all topic-based study guides"
            >
              {batchProgress ? (
                <>
                  <Loader2 className="animate-spin" size={11} />
                  {batchProgress.current}/{batchProgress.total}
                </>
              ) : (
                <>
                  <Sparkles size={11} />
                  Generate All ({Object.keys(topicGroups).length})
                </>
              )}
            </button>

            <button
              onClick={() => {
                // Download all generated topic pages
                const allPages = Object.values(topicBasedSketches).flatMap(sketch => sketch.pages);
                if (allPages.length === 0) {
                  alert('No pages to download yet. Generate some topic guides first!');
                  return;
                }
                allPages.forEach((page, idx) => {
                  const link = document.createElement('a');
                  link.href = page.imageData;
                  link.download = `page-${idx + 1}-${page.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                  link.click();
                });
                alert(`Downloaded ${allPages.length} pages!`);
              }}
              disabled={Object.values(topicBasedSketches).length === 0}
              className="px-3 py-1 bg-emerald-600 text-white font-bold rounded flex items-center gap-1.5 hover:bg-emerald-700 transition-all text-[9px] uppercase tracking-wider disabled:opacity-50 shadow-md"
              title="Download all generated study guide pages"
            >
              <Download size={11} />
              Download ({Object.values(topicBasedSketches).flatMap(s => s.pages).length} pages)
            </button>

            <button
              onClick={() => {
                const topicCount = Object.keys(topicBasedSketches).length;
                const pageCount = Object.values(topicBasedSketches).flatMap(s => s.pages).length;
                alert(`📚 Topic-Based Study Guides\n\n✅ ${topicCount} topics generated\n📄 ${pageCount} total pages\n\nThese guides are cached locally in your browser.`);
              }}
              disabled={!selectedVaultScan}
              className="px-3 py-1 bg-slate-600 text-white font-bold rounded flex items-center gap-1.5 hover:bg-slate-700 transition-all text-[9px] uppercase tracking-wider disabled:opacity-50 shadow-md"
              title="View statistics"
            >
              <Target size={11} />
              Backup
            </button>
          </div>
        </div>
      </div>

      {/* Floating Filter Panel */}
      {filterPanelOpen && (
        <div className="fixed inset-0 z-30 flex justify-end" onClick={() => setFilterPanelOpen(false)}>
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto scroller-hide animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Filters</h2>
                <p className="text-xs text-slate-500 mt-0.5">Refine your sketch cards</p>
              </div>
              <button
                onClick={() => setFilterPanelOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-4 space-y-6">
              {/* Subject Filter */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Subject</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedVaultScan && (
                    <button
                      onClick={() => setActiveTab('Exam Specific')}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        activeTab === 'Exam Specific'
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Exam Paper ({dynamicSketches.length})
                    </button>
                  )}
                  {['Physics', 'Chemistry', 'Biology'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        activeTab === tab
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {tab} ({subjectCounts[tab] || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              {categorizedSketches && Object.keys(categorizedSketches).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</h3>
                    <button
                      onClick={() => setGroupByDomain(!groupByDomain)}
                      className="text-[9px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider"
                    >
                      {groupByDomain ? 'Show All' : 'Group'}
                    </button>
                  </div>
                  {groupByDomain && (
                    <div className="space-y-2">
                      {Object.entries(categorizedSketches).map(([domain, sketches]) => (
                        <button
                          key={domain}
                          onClick={() => setSelectedDomainInGroupedView(domain)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                            selectedDomainInGroupedView === domain
                              ? 'bg-slate-900 text-white shadow-md'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wide">{domain}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            selectedDomainInGroupedView === domain ? 'bg-white/20' : 'bg-slate-200'
                          }`}>
                            {sketches.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chapter Filter (for selected category) */}
              {groupByDomain && selectedDomainInGroupedView && categorizedSketches?.[selectedDomainInGroupedView] && (() => {
                const sketches = categorizedSketches[selectedDomainInGroupedView];
                const chapterGroups: Record<string, any[]> = {};
                sketches.forEach(sketch => {
                  const chapter = sketch.chapter || 'General';
                  if (!chapterGroups[chapter]) chapterGroups[chapter] = [];
                  chapterGroups[chapter].push(sketch);
                });

                return Object.keys(chapterGroups).length > 1 ? (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Chapter</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setSelectedChapterPerDomain(prev => ({ ...prev, [selectedDomainInGroupedView]: '' }));
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          !selectedChapterPerDomain[selectedDomainInGroupedView]
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        All Chapters ({sketches.length})
                      </button>
                      {Object.entries(chapterGroups)
                        .sort((a, b) => b[1].length - a[1].length)
                        .map(([chapter, chapterSketches]) => (
                          <button
                            key={chapter}
                            onClick={() => {
                              setSelectedChapterPerDomain(prev => ({ ...prev, [selectedDomainInGroupedView]: chapter }));
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              selectedChapterPerDomain[selectedDomainInGroupedView] === chapter
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {chapter} ({chapterSketches.length})
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Generation Settings */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Generation Method</h3>
                <div className="space-y-2">
                  {[
                    { value: 'gemini-3-pro-image', label: 'Gemini 3 Pro ⭐', desc: 'Best quality, high-res' },
                    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash', desc: 'Fast & balanced' },
                  ].map(method => (
                    <button
                      key={method.value}
                      onClick={() => setGenerationMethod(method.value as GenerationMethod)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        generationMethod === method.value
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase">{method.label}</div>
                      <div className={`text-[9px] mt-0.5 ${generationMethod === method.value ? 'text-slate-300' : 'text-slate-500'}`}>
                        {method.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(groupByDomain || activeTab !== 'Exam Specific' || selectedChapterPerDomain[selectedDomainInGroupedView || '']) && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active:</span>
          {activeTab !== 'Exam Specific' && (
            <button
              onClick={() => setActiveTab('Exam Specific')}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
            >
              {activeTab}
              <X size={10} />
            </button>
          )}
          {groupByDomain && selectedDomainInGroupedView && (
            <button
              onClick={() => setGroupByDomain(false)}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
            >
              {selectedDomainInGroupedView}
              <X size={10} />
            </button>
          )}
          {selectedChapterPerDomain[selectedDomainInGroupedView || ''] && (
            <button
              onClick={() => {
                setSelectedChapterPerDomain(prev => ({ ...prev, [selectedDomainInGroupedView || '']: '' }));
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
            >
              {selectedChapterPerDomain[selectedDomainInGroupedView || '']}
              <X size={10} />
            </button>
          )}
        </div>
      )}

      {/* Compact Inline Alerts */}
      <div className="px-4 pt-2">
        {batchProgress && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2 text-xs">
            <Loader2 className="animate-spin text-blue-600" size={13} />
            <span className="font-bold text-blue-900">Generating {batchProgress.current}/{batchProgress.total}...</span>
          </div>
        )}

        {genError && (
          <div className="mb-2 p-2 bg-rose-50 border border-rose-200 rounded flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-rose-900">{genError}</span>
            <button onClick={() => setGenError(null)} className="text-rose-600 hover:text-rose-800">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Topic-Based Cards Grid */}
      <div className="px-4 py-4">
        {selectedVaultScan && Object.keys(topicGroups).length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">
                Topic-Based Study Guides ({Object.keys(topicGroups).length} topics)
              </h2>
              <span className="text-[10px] text-slate-500 font-bold">
                {Object.values(topicBasedSketches).length} / {Object.keys(topicGroups).length} generated
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {Object.entries(topicGroups).map(([topic, group]) => renderTopicCard(topic, group))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <PenTool size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              No vault selected
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Select an Analysis Vault to generate topic-based study guides
            </p>
          </div>
        )}
      </div>

      {/* Empty State removed - now handled inline */}
      {selectedVaultScan && Object.keys(topicGroups).length === 0 && (
        <div className="px-4 text-center py-20">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <PenTool size={32} className="text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            No topics found
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Scan a paper first to extract questions and topics
          </p>
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
                      {selectedSketch.formulas.map((f: string, i: number) => {
                        // Convert LaTeX delimiters \(...\) to $...$ and \[...\] to $$...$$
                        const converted = convertLatexDelimiters(f);
                        const formula = converted.includes('$') ? converted : `$$${converted}$$`;
                        return (
                          <div key={i} className="py-2.5 border-b border-white/10 last:border-0">
                            <RenderWithMath text={formula} showOptions={false} serif={false} />
                          </div>
                        );
                      })}
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

      {/* World-Class Responsive Flip Book Modal */}
      {flipBookOpen && !showPrintView && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50"
          onClick={closeFlipBook}
        >
          <style>{`
            @keyframes flipForward {
              0% { transform: perspective(1200px) rotateY(0deg); }
              50% { transform: perspective(1200px) rotateY(-90deg); }
              100% { transform: perspective(1200px) rotateY(0deg); }
            }
            @keyframes flipBackward {
              0% { transform: perspective(1200px) rotateY(0deg); }
              50% { transform: perspective(1200px) rotateY(90deg); }
              100% { transform: perspective(1200px) rotateY(0deg); }
            }
            .flip-forward {
              animation: flipForward ${isMobileView ? '0.4s' : '0.6s'} ease-in-out;
            }
            .flip-backward {
              animation: flipBackward ${isMobileView ? '0.4s' : '0.6s'} ease-in-out;
            }
            @keyframes pageCurl {
              0% {
                transform: perspective(2000px) rotateY(0deg);
                box-shadow: 0 0 0 rgba(0,0,0,0);
              }
              50% {
                transform: perspective(2000px) rotateY(-85deg) translateZ(50px);
                box-shadow: -20px 0 50px rgba(0,0,0,0.3);
              }
              100% {
                transform: perspective(2000px) rotateY(-180deg);
                box-shadow: 0 0 0 rgba(0,0,0,0);
              }
            }
          `}</style>

          {/* MOBILE VIEW (< 768px) */}
          {isMobileView ? (
            <div className="flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
              {/* Minimal Header */}
              <div className="flex items-center justify-between p-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
                <button
                  onClick={closeFlipBook}
                  className="flex items-center gap-2 px-3 py-2 text-white hover:text-blue-400 transition-colors text-sm font-bold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPrintView(true)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                    aria-label="Print"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  {isFullscreen ? (
                    <button
                      onClick={() => { document.exitFullscreen(); setIsFullscreen(false); }}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                      aria-label="Exit fullscreen"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const elem = document.documentElement;
                        if (elem.requestFullscreen) {
                          elem.requestFullscreen();
                          setIsFullscreen(true);
                        }
                      }}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                      aria-label="Fullscreen"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Full-Screen Single Page with Touch Gestures */}
              <div
                className="flex-1 overflow-hidden bg-slate-800 relative"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div className={`h-full flex items-center justify-center p-4 ${isFlipping ? (flipDirection === 'forward' ? 'flip-forward' : 'flip-backward') : ''}`}>
                  {flipBookCurrentPage === 0 ? (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 max-w-md w-full aspect-[3/4] flex flex-col items-center justify-center shadow-2xl">
                      <div className="text-5xl mb-4">📖</div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-center mb-2">
                        {flipBookOpen.topic}
                      </h3>
                      <p className="text-xs text-slate-600 uppercase tracking-wider">Class 12 Study Guide</p>
                      <p className="text-[10px] text-slate-500 mt-3">{flipBookOpen.sketch.questionCount} Questions Covered</p>
                    </div>
                  ) : flipBookCurrentPage <= flipBookOpen.sketch.pages.length ? (
                    <img
                      src={flipBookOpen.sketch.pages[flipBookCurrentPage - 1].imageData}
                      alt={`Page ${flipBookCurrentPage}`}
                      className="max-w-full object-contain rounded-xl shadow-2xl select-none"
                      style={{
                        maxHeight: 'calc(100vh - 180px)', // Account for header (80px), padding, and page dots (100px)
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'center center'
                      }}
                      draggable="false"
                    />
                  ) : (
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 max-w-md w-full aspect-[3/4] flex flex-col items-center justify-center shadow-2xl">
                      <div className="text-5xl mb-4">✅</div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-center mb-2">
                        You've Mastered It!
                      </h3>
                      <p className="text-xs text-slate-600 text-center">Keep practicing these concepts</p>
                      <p className="text-[10px] text-slate-500 mt-3">Good luck on your exam!</p>
                    </div>
                  )}
                </div>

                {/* Tap Zones - Left/Right thirds */}
                <button
                  onClick={() => handleFlipPage('backward')}
                  disabled={flipBookCurrentPage === 0 || isFlipping}
                  className="absolute left-0 top-0 bottom-20 w-1/3 z-10 disabled:opacity-0 disabled:pointer-events-none"
                  aria-label="Previous page"
                />
                <button
                  onClick={() => handleFlipPage('forward')}
                  disabled={flipBookCurrentPage > flipBookOpen.sketch.pages.length || isFlipping}
                  className="absolute right-0 top-0 bottom-20 w-1/3 z-10 disabled:opacity-0 disabled:pointer-events-none"
                  aria-label="Next page"
                />
              </div>

              {/* Bottom Navigation Bar */}
              <div className="bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => handleFlipPage('backward')}
                    disabled={flipBookCurrentPage === 0 || isFlipping}
                    className="p-3 bg-white hover:bg-blue-500 hover:text-white text-slate-900 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">
                      Page {flipBookCurrentPage + 1} / {flipBookOpen.sketch.pages.length + 1}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">
                      Swipe to navigate
                    </p>
                  </div>
                  <button
                    onClick={() => handleFlipPage('forward')}
                    disabled={flipBookCurrentPage > flipBookOpen.sketch.pages.length || isFlipping}
                    className="p-3 bg-white hover:bg-blue-500 hover:text-white text-slate-900 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Page Dots Indicator */}
                <div className="flex justify-center gap-2">
                  {[...Array(flipBookOpen.sketch.pages.length + 2)].map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setFlipBookCurrentPage(idx);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        idx === flipBookCurrentPage
                          ? 'w-8 bg-blue-500'
                          : 'w-2 bg-slate-600 hover:bg-slate-500'
                      }`}
                      aria-label={`Go to page ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* DESKTOP VIEW (≥ 768px) */
            <div className="flex h-full" onClick={(e) => e.stopPropagation()}>
              {/* Thumbnail Sidebar */}
              {showThumbnails && (
                <div className="w-64 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Pages</h3>
                      <button
                        onClick={() => setShowThumbnails(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-3">
                      {/* Cover Page Thumbnail */}
                      <button
                        onClick={() => setFlipBookCurrentPage(0)}
                        className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
                          flipBookCurrentPage === 0
                            ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <div className="aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <div className="text-2xl">📖</div>
                        </div>
                        <div className="bg-slate-800 p-2">
                          <p className="text-[9px] font-bold text-white text-center">Cover</p>
                        </div>
                      </button>

                      {/* Content Pages Thumbnails */}
                      {flipBookOpen.sketch.pages.map((page, idx) => (
                        <button
                          key={idx}
                          onClick={() => setFlipBookCurrentPage(idx + 1)}
                          className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
                            flipBookCurrentPage === idx + 1
                              ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <img
                            src={page.imageData}
                            alt={`Page ${idx + 1}`}
                            className="w-full aspect-[3/4] object-cover"
                          />
                          <div className="bg-slate-800 p-2">
                            <p className="text-[9px] font-bold text-white text-center">Page {idx + 1}</p>
                            <p className="text-[8px] text-slate-400 text-center truncate">{page.title}</p>
                          </div>
                        </button>
                      ))}

                      {/* End Page Thumbnail */}
                      <button
                        onClick={() => setFlipBookCurrentPage(flipBookOpen.sketch.pages.length + 1)}
                        className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
                          flipBookCurrentPage > flipBookOpen.sketch.pages.length
                            ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <div className="aspect-[3/4] bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                          <div className="text-2xl">✅</div>
                        </div>
                        <div className="bg-slate-800 p-2">
                          <p className="text-[9px] font-bold text-white text-center">Completed</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col">
                {/* Desktop Header with Controls */}
                <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeFlipBook}
                      className="flex items-center gap-2 px-3 py-2 text-white hover:text-blue-400 transition-colors text-sm font-bold"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <div className="border-l border-slate-600 pl-3">
                      <h2 className="text-lg font-black text-white uppercase tracking-tight">
                        📚 {flipBookOpen.topic}
                      </h2>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                        {flipBookOpen.sketch.pages.length} Pages • {flipBookOpen.sketch.questionCount} Questions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Thumbnails Toggle */}
                    <button
                      onClick={() => setShowThumbnails(!showThumbnails)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                        showThumbnails
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Thumbnails
                    </button>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                        className="p-2 hover:bg-slate-600 text-white rounded transition-all"
                        aria-label="Zoom out"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                      </button>
                      <span className="text-xs font-bold text-white px-2">{Math.round(zoomLevel * 100)}%</span>
                      <button
                        onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                        className="p-2 hover:bg-slate-600 text-white rounded transition-all"
                        aria-label="Zoom in"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setZoomLevel(1)}
                        className="px-2 py-1 hover:bg-slate-600 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Fullscreen Toggle */}
                    {isFullscreen ? (
                      <button
                        onClick={() => { document.exitFullscreen(); setIsFullscreen(false); }}
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                        aria-label="Exit fullscreen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const elem = document.documentElement;
                          if (elem.requestFullscreen) {
                            elem.requestFullscreen();
                            setIsFullscreen(true);
                          }
                        }}
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                        aria-label="Fullscreen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    )}

                    {/* Print */}
                    <button
                      onClick={() => setShowPrintView(true)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                  </div>
                </div>

                {/* Dual-Page Spread Container */}
                <div className="flex-1 overflow-hidden flex flex-col items-center justify-center p-8">
                  <div className="relative bg-gradient-to-b from-slate-700 to-slate-800 rounded-2xl shadow-2xl p-8 max-w-7xl w-full">
                    {/* Book Spine Shadow */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-8 -ml-4 bg-gradient-to-r from-black/40 via-black/20 to-black/40 z-10 pointer-events-none"></div>

                    {/* Pages Display */}
                    <div className="flex gap-4 items-center justify-center min-h-[600px] relative">
                      {/* Left Page */}
                      <div className={`flex-1 bg-white rounded-lg shadow-2xl flex items-center justify-center ${isFlipping && flipDirection === 'backward' ? 'flip-backward' : ''}`} style={{ transformStyle: 'preserve-3d', transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}>
                        {flipBookCurrentPage > 0 ? (
                          <img
                            src={flipBookOpen.sketch.pages[flipBookCurrentPage - 1].imageData}
                            alt={`Page ${flipBookCurrentPage}`}
                            className="w-full select-none"
                            style={{
                              maxHeight: 'calc(100vh - 250px)', // Account for header, padding, and controls
                              objectFit: 'contain',
                              height: 'auto'
                            }}
                            draggable="false"
                          />
                        ) : (
                          <div className="aspect-[3/4] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-8">
                            <div className="text-6xl mb-4">📖</div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-center mb-2">
                              {flipBookOpen.topic}
                            </h3>
                            <p className="text-sm text-slate-600 uppercase tracking-wider">Class 12 Study Guide</p>
                            <p className="text-xs text-slate-500 mt-4">{flipBookOpen.sketch.questionCount} Questions Covered</p>
                          </div>
                        )}
                      </div>

                      {/* Right Page */}
                      <div className={`flex-1 bg-white rounded-lg shadow-2xl flex items-center justify-center ${isFlipping && flipDirection === 'forward' ? 'flip-forward' : ''}`} style={{ transformStyle: 'preserve-3d', transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}>
                        {flipBookCurrentPage < flipBookOpen.sketch.pages.length ? (
                          <img
                            src={flipBookOpen.sketch.pages[flipBookCurrentPage].imageData}
                            alt={`Page ${flipBookCurrentPage + 1}`}
                            className="w-full select-none"
                            style={{
                              maxHeight: 'calc(100vh - 250px)', // Account for header, padding, and controls
                              objectFit: 'contain',
                              height: 'auto'
                            }}
                            draggable="false"
                          />
                        ) : (
                          <div className="aspect-[3/4] flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-8">
                            <div className="text-6xl mb-4">✅</div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-center mb-2">
                              You've Mastered It!
                            </h3>
                            <p className="text-sm text-slate-600 text-center">Keep practicing these concepts</p>
                            <p className="text-xs text-slate-500 mt-4">Good luck on your exam!</p>
                          </div>
                        )}
                      </div>

                      {/* Previous Page Button */}
                      <button
                        onClick={() => handleFlipPage('backward')}
                        disabled={flipBookCurrentPage === 0 || isFlipping}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 p-4 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-2xl transition-all disabled:opacity-0 disabled:pointer-events-none z-30 group"
                        aria-label="Previous page"
                      >
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Next Page Button */}
                      <button
                        onClick={() => handleFlipPage('forward')}
                        disabled={flipBookCurrentPage >= flipBookOpen.sketch.pages.length || isFlipping}
                        className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 p-4 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-2xl transition-all disabled:opacity-0 disabled:pointer-events-none z-30 group"
                        aria-label="Next page"
                      >
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Page Counter */}
                  <div className="mt-6">
                    <div className="px-6 py-3 bg-white rounded-full shadow-lg">
                      <p className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Page {flipBookCurrentPage + 1} / {flipBookOpen.sketch.pages.length + 1}
                      </p>
                    </div>
                  </div>

                  {/* Keyboard Hint */}
                  <div className="text-center mt-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      Use arrow keys ← → or click sides to flip pages
                    </p>
                  </div>
                </div>

                {/* Progress Bar with Page Jump */}
                <div className="bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 p-4">
                  <div className="max-w-7xl mx-auto">
                    <div className="relative h-3 bg-slate-700 rounded-full cursor-pointer group overflow-hidden" onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      const targetPage = Math.round(percentage * (flipBookOpen.sketch.pages.length + 1));
                      setFlipBookCurrentPage(Math.max(0, Math.min(flipBookOpen.sketch.pages.length + 1, targetPage)));
                    }}>
                      {/* Progress Fill */}
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
                        style={{ width: `${(flipBookCurrentPage / (flipBookOpen.sketch.pages.length + 1)) * 100}%` }}
                      />

                      {/* Page Markers */}
                      {[...Array(flipBookOpen.sketch.pages.length + 2)].map((_, idx) => (
                        <div
                          key={idx}
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/50 group-hover:bg-white group-hover:scale-150 transition-all"
                          style={{ left: `${(idx / (flipBookOpen.sketch.pages.length + 1)) * 100}%` }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 text-center mt-2 uppercase tracking-wider">
                      Click progress bar to jump to page
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print-Ready View */}
      {flipBookOpen && showPrintView && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="max-w-[210mm] mx-auto p-8">
            {/* Print Header */}
            <div className="flex items-center justify-between mb-6 no-print">
              <h2 className="text-2xl font-black text-slate-900 uppercase">Print Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={() => setShowPrintView(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Back to Flip Book
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="print-content">
              <div className="text-center mb-8 pb-4 border-b-2 border-slate-300">
                <h1 className="text-3xl font-black text-slate-900 uppercase mb-2">{flipBookOpen.topic}</h1>
                <p className="text-sm text-slate-600 uppercase tracking-wider">Class 12 Complete Study Guide</p>
                <p className="text-xs text-slate-500 mt-2">{flipBookOpen.sketch.questionCount} Questions • {flipBookOpen.sketch.pages.length} Pages</p>
              </div>

              {flipBookOpen.sketch.pages.map((page, idx) => (
                <div key={idx} className={`mb-12 ${idx > 0 ? 'page-break-before' : ''}`}>
                  <div className="mb-4 pb-2 border-b border-slate-200">
                    <h3 className="text-lg font-black text-slate-900 uppercase">
                      Page {idx + 1}: {page.title}
                    </h3>
                  </div>
                  <img
                    src={page.imageData}
                    alt={`${page.title} - Page ${idx + 1}`}
                    className="w-full h-auto border border-slate-200 rounded-lg"
                  />
                </div>
              ))}

              <div className="text-center mt-12 pt-4 border-t-2 border-slate-300 text-xs text-slate-500">
                <p>Generated by Teacher Studio • For Class 12 Board Exam Preparation</p>
              </div>
            </div>
          </div>

          {/* Print Styles */}
          <style>{`
            @media print {
              .no-print { display: none !important; }
              .page-break-before { page-break-before: always; }
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default SketchGallery;