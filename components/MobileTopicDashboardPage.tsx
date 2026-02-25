import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    Search,
    Zap,
    Target,
    Trophy,
    Flame,
    LayoutGrid,
    List,
    Sparkles,
    ChevronRight,
    BookOpen,
    ArrowRight,
    Award,
    Activity,
    X,
    PlayCircle,
    AlertCircle,
    FileQuestion
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subject, ExamContext, TopicResource } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';

interface TopicDashboardPageProps {
    subject: Subject;
    examContext: ExamContext;
    topics: TopicResource[];
    onSelectTopic: (topicId: string) => void;
    onBack: () => void;
    aiRecommendation?: {
        topicId: string;
        topicName: string;
        reason: string;
        urgency: 'high' | 'medium' | 'low';
    };
    studyStreak?: number;
}

const getTopicVisual = (topicName: string) => {
    const name = topicName.toLowerCase();

    // ========== MATHEMATICS ==========

    // Calculus
    if (name.includes('differential equation')) return 'dy/dx';
    if (name.includes('integrals') || name.includes('integration')) return '∫';
    if (name.includes('application of integral')) return '∫ₐᵇ';
    if (name.includes('area under')) return '∫A';
    if (name.includes('continuity')) return 'ε-δ';
    if (name.includes('limit')) return 'lim';
    if (name.includes('derivative') || name.includes('differentiation')) return "f'(x)";
    if (name.includes('application of derivative')) return 'dy/dx';
    if (name.includes('mean value')) return "f'(c)";

    // Algebra
    if (name.includes('determinant')) return '|A|';
    if (name.includes('matrix') || name.includes('matrices')) return '[A]';
    if (name.includes('linear programming') || name.includes('lpp')) return 'max Z';
    if (name.includes('complex number')) return 'z=a+ib';
    if (name.includes('quadratic')) return 'ax²+b';
    if (name.includes('sequence') || name.includes('progression') || name.includes('series')) return 'Σaₙ';
    if (name.includes('binomial')) return 'ⁿCᵣ';
    if (name.includes('permutation')) return 'ⁿPᵣ';
    if (name.includes('combination')) return 'ⁿCᵣ';
    if (name.includes('logarithm')) return 'log x';
    if (name.includes('inequalit')) return '≤,≥';

    // Geometry & Trigonometry
    if (name.includes('vector')) return 'v⃗';
    if (name.includes('3d') || name.includes('three dimensional')) return '(x,y,z)';
    if (name.includes('straight line')) return 'y=mx+c';
    if (name.includes('conic')) return 'x²/a²';
    if (name.includes('parabola')) return 'y²=4ax';
    if (name.includes('ellipse')) return 'x²+y²';
    if (name.includes('hyperbola')) return 'xy=c²';
    if (name.includes('circle')) return 'x²+y²=r²';
    if (name.includes('trigonometr')) return 'sin θ';
    if (name.includes('inverse trig')) return 'sin⁻¹';

    // Probability & Statistics
    if (name.includes('probability')) return 'P(A∩B)';
    if (name.includes('statistics')) return 'μ,σ';
    if (name.includes('mean') || name.includes('median')) return 'x̄';
    if (name.includes('variance')) return 'σ²';

    // Logic & Sets
    if (name.includes('relation') || name.includes('function')) return 'f(x)';
    if (name.includes('reasoning') || name.includes('logic')) return 'p⇒q';
    if (name.includes('set')) return 'A∪B';

    // ========== PHYSICS ==========

    // Mechanics
    if (name.includes('law of motion') || name.includes('newton')) return 'F=ma';
    if (name.includes('kinematics') || name.includes('motion in a plane')) return 'v=u+at';
    if (name.includes('motion in a straight')) return 's=ut';
    if (name.includes('work') || name.includes('energy')) return 'E=½mv²';
    if (name.includes('power')) return 'P=W/t';
    if (name.includes('rotational')) return 'τ=Iα';
    if (name.includes('particle system')) return 'Σmᵢrᵢ';
    if (name.includes('gravitation')) return 'F=Gm/r²';
    if (name.includes('oscillation') || name.includes('shm')) return 'x=Asinωt';

    // Properties of Matter
    if (name.includes('mechanical property') || name.includes('elastic')) return 'σ=E⋅ε';
    if (name.includes('solid')) return 'Y,G,K';
    if (name.includes('fluid')) return 'P+ρgh';
    if (name.includes('surface tension')) return 'γ';
    if (name.includes('viscosity')) return 'η';

    // Thermodynamics
    if (name.includes('thermodynamics')) return 'PV=nRT';
    if (name.includes('heat')) return 'Q=mcΔT';
    if (name.includes('thermal')) return 'ΔQ';

    // Electromagnetism
    if (name.includes('electrostatic') || name.includes('electric potential')) return 'V=kq/r';
    if (name.includes('electric field')) return 'E⃗=F⃗/q';
    if (name.includes('charge')) return 'q,Q';
    if (name.includes('capacit')) return 'C=Q/V';
    if (name.includes('current electricity')) return 'V=IR';
    if (name.includes('magnet') && !name.includes('electromagnetic')) return 'B⃗';
    if (name.includes('electromagnetic induction') || name.includes('emi')) return 'ε=-dΦ/dt';
    if (name.includes('alternating current') || name.includes(' ac ')) return 'Iᵣₘₛ';

    // Optics & Waves
    if (name.includes('optics')) return '1/f';
    if (name.includes('wave')) return 'λ=v/f';
    if (name.includes('ray optics')) return 'n₁sinθ₁';
    if (name.includes('wave optics')) return 'λ';

    // Modern Physics
    if (name.includes('dual nature') || name.includes('photon')) return 'E=hν';
    if (name.includes('radiation')) return 'hν';
    if (name.includes('nuclei') || name.includes('nuclear')) return '⚛️';
    if (name.includes('atom') && !name.includes('atomic')) return 'E=-13.6/n²';
    if (name.includes('semiconductor')) return 'p-n';
    if (name.includes('quantum')) return 'ℏ';

    // General
    if (name.includes('measurement') || name.includes('unit')) return '[M L T]';

    // ========== CHEMISTRY ==========

    // Physical Chemistry
    if (name.includes('mole concept')) return 'n=m/M';
    if (name.includes('states of matter') || name.includes('gas')) return 'PV=nRT';
    if (name.includes('thermodynamics') || name.includes('thermochemistry')) return 'ΔH';
    if (name.includes('equilibrium')) return '⇌';
    if (name.includes('ionic equilibrium')) return 'Kₐ,Kᵦ';
    if (name.includes('redox')) return 'e⁻';
    if (name.includes('electrochemistry')) return 'E°cell';
    if (name.includes('kinetics') || name.includes('rate')) return 'rate=k[A]';
    if (name.includes('solution')) return 'M,m';
    if (name.includes('colligative')) return 'ΔTᵦ';

    // Inorganic Chemistry
    if (name.includes('structure of atom') || name.includes('atomic structure')) return '1s²2s²';
    if (name.includes('classification') || name.includes('periodic')) return '⚛️';
    if (name.includes('chemical bonding')) return 'σ,π';
    if (name.includes('hydrogen')) return 'H₂';
    if (name.includes('s-block')) return 'ns¹⁻²';
    if (name.includes('p-block')) return 'ns²npˣ';
    if (name.includes('d-block') || name.includes('transition')) return 'd¹⁻¹⁰';
    if (name.includes('f-block')) return 'f¹⁻¹⁴';
    if (name.includes('coordination')) return '[ML₆]';
    if (name.includes('metallurgy') || name.includes('extraction')) return 'MO→M';

    // Organic Chemistry
    if (name.includes('organic') || name.includes('hydrocarbon')) return 'CₙH₂ₙ';
    if (name.includes('haloalkane') || name.includes('haloarene')) return 'R-X';
    if (name.includes('alcohol') || name.includes('phenol')) return 'R-OH';
    if (name.includes('ether')) return 'R-O-R';
    if (name.includes('aldehyde')) return 'R-CHO';
    if (name.includes('ketone')) return 'R-CO-R';
    if (name.includes('carboxylic')) return 'R-COOH';
    if (name.includes('amine')) return 'R-NH₂';
    if (name.includes('biomolecule')) return 'CHO-N';
    if (name.includes('polymer')) return '[-M-]ₙ';
    if (name.includes('chemistry in everyday')) return '🧪';

    // Other Chemistry
    if (name.includes('solid state')) return 'FCC,BCC';
    if (name.includes('surface chemistry')) return 'Δx/m';
    if (name.includes('environmental')) return 'O₃';

    // ========== BIOLOGY ==========

    // Cell & Molecular Biology
    if (name.includes('cell') && !name.includes('cellular')) return '🔬';
    if (name.includes('biomolecule')) return 'C₆H₁₂O₆';
    if (name.includes('cell cycle')) return '2n→4n';
    if (name.includes('cellular respiration')) return 'ATP';

    // Genetics
    if (name.includes('genetics') || name.includes('inheritance')) return 'Aa×Aa';
    if (name.includes('dna') || name.includes('rna')) return '🧬';
    if (name.includes('molecular basis') || name.includes('gene')) return 'DNA→RNA';
    if (name.includes('chromosome')) return 'XX,XY';

    // Plant Biology
    if (name.includes('plant') || name.includes('morphology')) return '🌿';
    if (name.includes('photosynthesis')) return '6CO₂→C₆H₁₂O₆';
    if (name.includes('plant growth')) return 'IAA';
    if (name.includes('transport in plant')) return 'xylem,phloem';

    // Animal Biology
    if (name.includes('animal') || name.includes('tissue')) return '🦴';
    if (name.includes('structural organization')) return '🔬';
    if (name.includes('digestion')) return '🍎→ATP';
    if (name.includes('breathing') || name.includes('respiration')) return 'O₂⇌CO₂';
    if (name.includes('circulation') || name.includes('blood')) return '♥️';
    if (name.includes('excretion')) return 'urea';
    if (name.includes('locomotion')) return '💪';
    if (name.includes('neural') || name.includes('nervous')) return '🧠';
    if (name.includes('endocrine')) return '⚡';

    // Reproduction & Development
    if (name.includes('reproduction')) return '♂+♀';
    if (name.includes('sexual reproduction')) return '🌸';
    if (name.includes('human reproduction')) return '👶';
    if (name.includes('reproductive health')) return '♥️';

    // Evolution & Ecology
    if (name.includes('evolution')) return '🦎→🦅';
    if (name.includes('origin of life')) return '🌍';
    if (name.includes('ecology') || name.includes('ecosystem')) return '🌱';
    if (name.includes('environment')) return '♻️';
    if (name.includes('biodiversity')) return '🦁';

    // Biotechnology
    if (name.includes('biotech') || name.includes('genetic engineering')) return '✂️DNA';
    if (name.includes('microb')) return '🦠';

    // Diversity
    if (name.includes('diversity') || name.includes('living world')) return '🌿';
    if (name.includes('kingdom')) return '🦠→🦁';

    // Generic fallback - extract first meaningful characters
    const firstWord = topicName.split(/[\s-]/)[0] || '';
    if (firstWord.length >= 4) return firstWord.substring(0, 3).toUpperCase();
    return topicName.substring(0, 2).toUpperCase();
};

const getStatusInfo = (topic: TopicResource) => {
    const m = topic.masteryLevel || 0;
    const s = topic.studyStage || 'not_started';
    if (m === 0 && s === 'not_started') return { label: 'START', color: 'bg-slate-100 text-slate-600', icon: PlayCircle };
    if (m < 40) return { label: 'CRITICAL', color: 'bg-red-50 text-red-600', icon: AlertCircle };
    if (m < 85) return { label: 'ACTIVE', color: 'bg-blue-50 text-blue-600', icon: Activity };
    return { label: 'MASTERED', color: 'bg-emerald-50 text-emerald-600', icon: Trophy };
};

const MobileTopicDashboardPage: React.FC<TopicDashboardPageProps> = ({
    subject,
    examContext,
    topics,
    onSelectTopic,
    onBack,
    aiRecommendation,
    studyStreak = 0
}) => {
    const [activeDomain, setActiveDomain] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const topicsByDomain = useMemo(() => {
        const grouped: Record<string, TopicResource[]> = { 'All': topics };
        topics.forEach(t => {
            const domain = t.topicName.split(' - ')[0] || 'Core';
            if (!grouped[domain]) grouped[domain] = [];
            grouped[domain].push(t);
        });
        return grouped;
    }, [topics]);

    const domains = Object.keys(topicsByDomain);

    const stats = {
        total: topics.length,
        mastered: topics.filter(t => t.masteryLevel >= 85).length,
        avg: Math.round(topics.reduce((sum, t) => sum + t.masteryLevel, 0) / (topics.length || 1))
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 flex flex-col">
            <LearningJourneyHeader
                showBack
                onBack={onBack}
                title="Node Syllabus"
                subtitle={`${stats.mastered}/${stats.total} Mastered`}
                subject={subject}
                trajectory={examContext}
                actions={
                    <button
                        onClick={() => setIsSearching(!isSearching)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSearching ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                    >
                        {isSearching ? <X size={20} /> : <Search size={20} />}
                    </button>
                }
            >
                <AnimatePresence>
                    {isSearching && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="relative mt-2">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search topic nodes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-inner"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </LearningJourneyHeader>

            <div className="px-6 py-6 space-y-8">
                {/* Rapid Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-[2rem] p-4 flex items-center gap-3 shadow-sm border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <Flame size={20} className="fill-orange-500/20" />
                        </div>
                        <div>
                            <p className="text-[14px] font-black text-slate-900 leading-none">{studyStreak} Days</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Focus Streak</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-[2rem] p-4 flex items-center gap-3 shadow-sm border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center">
                            <Target size={20} />
                        </div>
                        <div>
                            <p className="text-[14px] font-black text-slate-900 leading-none">{stats.avg}%</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Avg Mastery</p>
                        </div>
                    </div>
                </div>

                {/* Next Strategic Target */}
                {aiRecommendation && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onSelectTopic(aiRecommendation.topicId)}
                        className="w-full text-left bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl active:scale-[0.98] transition-transform"
                    >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/20 rounded-full blur-[60px] -mr-16 -mt-16" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="px-3 py-1 bg-primary-500/20 backdrop-blur-md rounded-full border border-primary-500/30 flex items-center gap-1.5">
                                <Sparkles size={12} className="text-primary-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Next Critical Goal</span>
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/40 italic">Priority: {aiRecommendation.urgency}</div>
                        </div>
                        <h3 className="text-2xl font-black font-outfit uppercase tracking-tighter italic mb-2 relative z-10 leading-none">
                            {aiRecommendation.topicName}
                        </h3>
                        <p className="text-xs text-white/60 font-medium mb-6 relative z-10 line-clamp-2 leading-relaxed">
                            {aiRecommendation.reason}
                        </p>
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400">Initialize Practice Session</span>
                            <div className="w-10 h-10 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-lg">
                                <ArrowRight size={20} />
                            </div>
                        </div>
                    </motion.button>
                )}

                {/* Topic List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            {searchQuery ? 'Search Results' : `${activeDomain} Module Nodes`}
                        </h3>
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={14} className="text-slate-900" />
                            <List size={14} className="text-slate-300" />
                        </div>
                    </div>

                    {(searchQuery
                        ? topics.filter(t => t.topicName.toLowerCase().includes(searchQuery.toLowerCase()))
                        : topicsByDomain[activeDomain] || []
                    ).map((topic, index) => {
                        const m = topic.masteryLevel;
                        const isMastered = m >= 85;
                        const isStarted = m > 0;

                        return (
                            <motion.button
                                key={topic.id}
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: (index % 10) * 0.05 }}
                                onClick={() => onSelectTopic(topic.topicId)}
                                className="w-full bg-white rounded-3xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm active:scale-[0.99] transition-all relative overflow-hidden group"
                            >
                                <div className={`relative shrink-0 w-14 h-11 flex items-center justify-center`}>
                                    {/* Rectangular Progress Ring lookalike for mobile */}
                                    <svg className="absolute inset-0 w-full h-full text-slate-100" viewBox="0 0 80 56" preserveAspectRatio="none">
                                        <rect
                                            x="4" y="4" width="72" height="48" rx="12"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        />
                                    </svg>
                                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 56" preserveAspectRatio="none">
                                        <motion.rect
                                            x="4" y="4" width="72" height="48" rx="12"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeDasharray="200"
                                            initial={{ strokeDashoffset: 200 }}
                                            animate={{ strokeDashoffset: 200 - (200 * m) / 100 }}
                                            className={m >= 85 ? 'text-emerald-500' : m >= 40 ? 'text-blue-500' : 'text-red-500'}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                        />
                                    </svg>

                                    <div className={`absolute inset-0 m-1 rounded-xl overflow-hidden shadow-sm border border-black/5 flex items-center justify-center bg-white`}>
                                        <div className={`w-full h-full flex items-center justify-center ${getStatusInfo(topic).color}`}>
                                            {topic.representativeImageUrl ? (
                                                <img
                                                    src={topic.representativeImageUrl}
                                                    alt={topic.topicName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        if (e.currentTarget.nextSibling) {
                                                            (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                            <span
                                                className="text-[12px] font-black font-outfit tracking-tighter whitespace-nowrap px-1"
                                                style={{
                                                    display: topic.representativeImageUrl ? 'none' : 'flex'
                                                }}
                                            >
                                                {topic.representativeSymbol || getTopicVisual(topic.topicName)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 text-left min-w-0">
                                    <h4 className="text-[15px] font-black text-slate-900 font-outfit uppercase tracking-tighter truncate leading-none mb-1 group-active:text-primary-600 transition-colors">
                                        {topic.topicName}
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <BookOpen size={10} className="text-slate-300" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{topic.totalQuestions || 10} Qs</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{topic.studyStage.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="relative w-10 h-10 flex items-center justify-center">
                                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                            <circle cx="20" cy="20" r="18" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                                            <motion.circle
                                                cx="20" cy="20" r="18" fill="none"
                                                stroke={isMastered ? '#10B981' : '#3B82F6'}
                                                strokeWidth="3"
                                                strokeDasharray="113.1"
                                                initial={{ strokeDashoffset: 113.1 }}
                                                animate={{ strokeDashoffset: 113.1 - (113.1 * m) / 100 }}
                                                transition={{ duration: 1, delay: 0.2 }}
                                            />
                                        </svg>
                                        <span className={`text-[10px] font-black font-outfit ${isMastered ? 'text-emerald-500' : 'text-slate-900'}`}>{m}%</span>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div >
    );
};

export default MobileTopicDashboardPage;
