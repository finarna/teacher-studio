import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Physics Teacher',
    school: 'Delhi Public School',
    image: '👩‍🏫',
    quote: 'EduJourney has completely transformed how I prepare exam materials. What used to take me 5 hours now takes just 15 minutes. The AI accuracy is incredible!',
    rating: 5,
  },
  {
    name: 'Rajesh Kumar',
    role: 'Mathematics HOD',
    school: 'Ryan International School',
    image: '👨‍🏫',
    quote: 'The question bank feature is a game-changer. I can now create customized practice tests for different student levels in minutes. My students\' scores have improved by 25%.',
    rating: 5,
  },
  {
    name: 'Anita Desai',
    role: 'Chemistry Teacher',
    school: 'Kendriya Vidyalaya',
    image: '👩‍🔬',
    quote: 'The multi-subject support is outstanding. The OCR handles chemical equations and formulas perfectly. It\'s like having a teaching assistant available 24/7.',
    rating: 5,
  },
  {
    name: 'Vikram Singh',
    role: 'Biology Teacher',
    school: 'DAV Public School',
    image: '👨‍🔬',
    quote: 'As someone who was skeptical about AI in education, I\'m now a believer. The predictive analytics help me identify struggling students before they fall behind.',
    rating: 5,
  },
  {
    name: 'Meera Reddy',
    role: 'Principal',
    school: 'Modern School',
    image: '👩‍💼',
    quote: 'We rolled out EduJourney across all our science departments. Teacher satisfaction is up, and we\'re saving over 200 hours of prep time monthly. ROI was immediate.',
    rating: 5,
  },
  {
    name: 'Arjun Patel',
    role: 'Physics Teacher',
    school: 'Vibgyor High',
    image: '👨‍💻',
    quote: 'The performance tracking feature helps me understand each student\'s learning curve. I can now provide truly personalized feedback. Highly recommended!',
    rating: 5,
  },
];

export default function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Trusted by{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              1000+ Teachers
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See why educators across India are switching to EduJourney
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="p-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* Rating Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="text-4xl">{testimonial.image}</div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                  <div className="text-xs text-gray-500">
                    {testimonial.school}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-8"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Verified Reviews</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="font-medium">1000+ Active Users</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium">4.9/5 Average Rating</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
