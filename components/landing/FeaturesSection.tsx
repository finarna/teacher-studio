import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const featureAssets = [
  { id: 1, src: '/landing/features/1.png', alt: 'Pinpoint Every Performance Gap' },
  { id: 2, src: '/landing/features/2.png', alt: 'Master Every Complex Concept' },
  { id: 3, src: '/landing/features/3.png', alt: 'Mirror Actual Exam Patterns' },
  { id: 4, src: '/landing/features/4.png', alt: 'Practice the Future Exam Today' }
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Crossfade timer & progress bar
  useEffect(() => {
    let interval = setInterval(() => {
        setProgress(prev => {
            const next = prev + 1;
            if (next >= 100) return 100;
            return next;
        });
    }, 45); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setActiveIndex((idx) => (idx + 1) % featureAssets.length);
      setProgress(0);
    }
  }, [progress]);

  return (
    <section id="features" className="w-full bg-[#0b0e14] py-20 relative z-10 overflow-hidden">
      <div className="max-w-md mx-auto px-4 sm:px-6 relative pt-4">
        
        {/* Auto-Changing Slideshow */}
        <motion.div
           ref={ref}
           initial={{ opacity: 0, y: 30 }}
           animate={isInView ? { opacity: 1, y: 0 } : {}}
           transition={{ duration: 0.8 }}
           className="relative w-full mb-16 rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-slate-800 bg-[#121622]"
        >
          {/* Progress Bar Top */}
          <div className="absolute top-0 left-0 h-1.5 bg-slate-800 z-30 w-full overflow-hidden">
             <div 
               className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 transition-all duration-75 ease-linear"
               style={{ width: `${progress}%` }}
             />
          </div>

          {/* Overlapping CSS Grid for bulletproof height stability */}
          <div className="grid font-sans w-full content-center items-center">
             <AnimatePresence>
                {featureAssets.map((asset, idx) => (
                    activeIndex === idx && (
                        <motion.div
                            key={asset.id}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="w-full flex justify-center items-center"
                            style={{ gridArea: '1 / 1 / 2 / 2' }} /* Forces pure overlap */
                        >
                            <div className="relative w-full h-full">
                                <img 
                                    src={asset.src} 
                                    alt={asset.alt}
                                    className="w-full h-auto object-cover block filter brightness-[0.95]"
                                />
                                {asset.id === 4 && (
                                   <div className="absolute top-0 left-0 w-full h-[58%] bg-[#111827] flex flex-col items-center justify-center pt-8 text-center px-4 sm:px-8 z-10">
                                      <h3 className="text-white font-bold text-[2.5rem] sm:text-[2.75rem] leading-[1.1] mb-6 tracking-tight">
                                        Practice the <br/> Future Exam <br/> Today
                                      </h3>
                                      <p className="text-[#a1a1aa] text-[15px] font-medium leading-[1.4] max-w-[280px]">
                                        AI predicts <span className="text-white font-bold">2027</span> paper trends to give your students a decisive edge in KCET, JEE and NEET.
                                      </p>
                                   </div>
                                )}
                            </div>
                        </motion.div>
                    )
                ))}
             </AnimatePresence>
          </div>

          {/* Navigation Dots Overlay */}
          <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20 bg-[#000000a0] backdrop-blur-md px-6 py-3.5 rounded-full border border-white/15 shadow-2xl">
               {featureAssets.map((_, idx) => (
                   <button
                       key={idx}
                       onClick={() => {
                           setActiveIndex(idx);
                           setProgress(0);
                       }}
                       className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-500 ease-out ${
                           activeIndex === idx 
                                ? 'bg-white scale-[1.3] shadow-[0_0_12px_rgba(255,255,255,0.9)]' 
                                : 'bg-white/30 hover:bg-white/60'
                       }`}
                       aria-label={`Go to slide ${idx + 1}`}
                   />
               ))}
          </div>
        </motion.div>
        

      </div>
    </section>
  );
}
