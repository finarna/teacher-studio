// Schema.org Structured Data Definitions for Plus2AI

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  '@id': 'https://learn.dataziv.com/#organization',
  name: 'Plus2AI',
  alternateName: 'Plus 2 AI',
  url: 'https://learn.dataziv.com',
  logo: 'https://learn.dataziv.com/og-image.png',
  description: "India's #1 AI-powered exam prediction platform for KCET, NEET, and JEE preparation",
  foundingDate: '2024',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'IN',
    addressRegion: 'Karnataka',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    email: 'support@dataziv.com',
  },
  sameAs: [
    'https://twitter.com/Plus2AI',
    'https://www.linkedin.com/company/plus2ai',
  ],
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://learn.dataziv.com/#website',
  url: 'https://learn.dataziv.com',
  name: 'Plus2AI',
  description: "India's #1 AI Exam Prediction Platform for KCET, NEET, and JEE",
  publisher: {
    '@id': 'https://learn.dataziv.com/#organization',
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://learn.dataziv.com/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: 'en-IN',
};

export const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': 'https://learn.dataziv.com/#product',
  name: 'Plus2AI Exam Preparation Platform',
  description: 'AI-powered exam prediction and preparation platform for KCET, NEET, and JEE with proven accuracy rates',
  brand: {
    '@type': 'Brand',
    name: 'Plus2AI',
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'KCET Plan',
      price: '0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: 'https://learn.dataziv.com',
      priceValidUntil: '2027-12-31',
      description: 'Free KCET preparation with AI predictions',
    },
    {
      '@type': 'Offer',
      name: 'NEET Plan',
      price: '0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: 'https://learn.dataziv.com',
      priceValidUntil: '2027-12-31',
      description: 'Free NEET preparation with AI predictions',
    },
    {
      '@type': 'Offer',
      name: 'JEE Plan',
      price: '0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: 'https://learn.dataziv.com',
      priceValidUntil: '2027-12-31',
      description: 'Free JEE preparation with AI predictions',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '1000',
    bestRating: '5',
    worstRating: '1',
  },
};

export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': 'https://learn.dataziv.com/#faq',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Plus2AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Plus2AI is India's #1 AI-powered exam prediction platform designed for KCET, NEET, and JEE preparation. We use advanced AI algorithms to predict exam questions with proven accuracy rates of up to 53.3% for Biology and 46.7% for Physics.",
      },
    },
    {
      '@type': 'Question',
      name: 'How accurate are Plus2AI predictions?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Our KCET 2026 predictions achieved 53.3% accuracy for Biology, 46.7% for Physics, and 38.3% for Chemistry, as verified in our official forensic audit. These are industry-leading accuracy rates.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which exams does Plus2AI support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Plus2AI currently supports KCET (Karnataka Common Entrance Test), NEET (National Eligibility cum Entrance Test), and JEE (Joint Entrance Examination) preparation with AI-powered predictions and comprehensive study materials.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Plus2AI free to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Plus2AI offers free access to all its exam preparation features, including AI predictions, mock tests, and study materials for KCET, NEET, and JEE.',
      },
    },
    {
      '@type': 'Question',
      name: 'How many students use Plus2AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Plus2AI is trusted by over 1000+ students across India for their KCET, NEET, and JEE preparation.',
      },
    },
  ],
};

export const courseSchema = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  '@id': 'https://learn.dataziv.com/#course',
  name: 'Plus2AI Exam Preparation Course',
  description: 'Comprehensive AI-powered preparation course for KCET, NEET, and JEE exams',
  provider: {
    '@id': 'https://learn.dataziv.com/#organization',
  },
  educationalLevel: 'Higher Secondary Education',
  coursePrerequisites: 'Class 11 and 12 science subjects',
  hasCourseInstance: [
    {
      '@type': 'CourseInstance',
      name: 'KCET Preparation',
      courseMode: 'online',
      courseWorkload: 'PT200H',
    },
    {
      '@type': 'CourseInstance',
      name: 'NEET Preparation',
      courseMode: 'online',
      courseWorkload: 'PT300H',
    },
    {
      '@type': 'CourseInstance',
      name: 'JEE Preparation',
      courseMode: 'online',
      courseWorkload: 'PT350H',
    },
  ],
  inLanguage: 'en',
  availableLanguage: ['en', 'hi', 'kn'],
};

export const breadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

export const webPageSchema = (url: string, name: string, description: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': url,
  url,
  name,
  description,
  isPartOf: {
    '@id': 'https://learn.dataziv.com/#website',
  },
  about: {
    '@id': 'https://learn.dataziv.com/#organization',
  },
  inLanguage: 'en-IN',
});

export const articleSchema = (
  url: string,
  headline: string,
  description: string,
  datePublished: string,
  dateModified: string,
  image?: string
) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  '@id': url,
  headline,
  description,
  image: image || 'https://learn.dataziv.com/og-image.png',
  datePublished,
  dateModified,
  author: {
    '@id': 'https://learn.dataziv.com/#organization',
  },
  publisher: {
    '@id': 'https://learn.dataziv.com/#organization',
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': url,
  },
  inLanguage: 'en-IN',
});
