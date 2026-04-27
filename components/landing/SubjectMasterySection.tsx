import { motion } from 'framer-motion';

const masteryData = [
  {
    subject: 'Chemistry',
    accuracy: '65.0%',
    hits: '39/60',
    slogan: 'Elite Molecular Prediction.',
    description: 'Verbatim hits on Organic mechanisms and Physical chemistry numericals. Dominating the board with AI-driven pattern recognition.',
    color: 'border-purple-500 text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    subject: 'Physics',
    accuracy: '51.7%',
    hits: '31/60',
    slogan: 'Mastering the Laws of Ranks.',
    description: 'Surgical accuracy on Electromagnetism and Modern Physics patterns. Turning complex theories into solvable predictive hits.',
    color: 'border-blue-500 text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    subject: 'Biology',
    accuracy: '23.3%',
    hits: '14/60',
    slogan: 'Precision for Future Medics.',
    description: 'Direct hits on high-yield NCERT diagrams and genetic logic. Verbatim alignment on Chargaff\'s rule and DNA biology.',
    color: 'border-green-500 text-green-600',
    bg: 'bg-green-50',
  },
  {
    subject: 'Mathematics',
    accuracy: '21.7%',
    hits: '13/60',
    slogan: 'Logic that Leads to Ranks.',
    description: 'Strategic alignment on LPP, Probability, and Vector Calculus. Identifying high-value theorem patterns in the official paper.',
    color: 'border-orange-500 text-orange-600',
    bg: 'bg-orange-50',
  },
];

export default function SubjectMasterySection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-6 py-2 mb-6 text-sm font-black tracking-widest text-blue-700 uppercase bg-blue-50 rounded-full"
          >
            Deep Strategic Matrix
          </motion.div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 mb-6 tracking-tight">
            Subject-Specific <span className="text-blue-600">Dominance.</span>
          </h2>
          <p className="text-xl text-slate-500 max-w-3xl mx-auto font-medium">
            We don't just predict exams; we engineer subject mastery. Our REI v18 model analyzes subject-level signatures to deliver rank-deciding hits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {masteryData.map((data, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`p-10 rounded-[3rem] border-4 ${data.color} ${data.bg} flex flex-col md:flex-row gap-8 items-start hover:shadow-2xl transition-all duration-500 group`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-3xl font-black text-slate-900">{data.subject}</h3>
                  <div className={`px-4 py-1 rounded-full ${data.color} border-2 font-bold text-sm bg-white`}>
                    {data.accuracy} Accuracy
                  </div>
                </div>
                <div className="text-lg font-black text-slate-700 mb-4">{data.slogan}</div>
                <p className="text-slate-600 font-medium mb-6 leading-relaxed">
                  {data.description}
                </p>
                <div className="flex items-center gap-6">
                   <div className="text-center">
                      <div className="text-2xl font-black text-slate-900">{data.hits}</div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Hits/Questions</div>
                   </div>
                   <div className="h-8 w-[1px] bg-slate-300" />
                   <div className="text-center">
                      <div className="text-2xl font-black text-slate-900">72%</div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Rank Deciders</div>
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Global Stats Bar */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'Total Questions Audited', val: '240+', icon: '📊' },
             { label: 'Rankings Improved', val: '120%', icon: '🚀' },
             { label: 'Student Selection Rate', val: '5.4x', icon: '🎓' },
             { label: 'Institution Partners', val: '12+', icon: '🏢' },
           ].map((stat, i) => (
             <motion.div 
               whileHover={{ y: -5 }}
               key={i} 
               className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-center"
             >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-4xl font-black text-slate-900 mb-2">{stat.val}</div>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</div>
             </motion.div>
           ))}
        </div>

        <div className="mt-20 text-center">
           <p className="text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Precision is our Pedagogy.</p>
           <h3 className="text-2xl font-black text-slate-900">The Oracle for India's Future Doctors and Engineers.</h3>
        </div>
      </div>
    </section>
  );
}
