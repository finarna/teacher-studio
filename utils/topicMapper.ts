/**
 * Fast Topic Mapper - Post-processing step for ultra-fast extraction
 *
 * Maps questions to topics using keyword matching (instant, no API calls)
 */

interface Question {
  id: number;
  text: string;
  options: any[];
}

interface MappedQuestion extends Question {
  topic: string;
  domain: string;
  difficulty: string;
  blooms: string;
}

// KCET Biology Topic Mapping (13 topics)
const BIOLOGY_TOPIC_KEYWORDS = {
  // Cell Biology & Molecular Biology
  'Molecular Basis of Inheritance': ['DNA', 'RNA', 'gene', 'chromosome', 'nucleotide', 'replication', 'transcription', 'translation', 'genetic code', 'codon', 'mutation', 'Griffith', 'Hershey', 'Watson', 'Crick'],
  'Cell Cycle and Cell Division': ['mitosis', 'meiosis', 'cell cycle', 'prophase', 'metaphase', 'anaphase', 'telophase', 'cytokinesis', 'recombinase', 'synapsis', 'crossing over'],

  // Plant Biology
  'Photosynthesis in Higher Plants': ['photosynthesis', 'chlorophyll', 'light reaction', 'dark reaction', 'Calvin cycle', 'photosystem', 'thylakoid', 'stroma', 'NADPH', 'carbon fixation'],
  'Respiration in Plants': ['glycolysis', 'TCA cycle', 'Krebs cycle', 'electron transport', 'oxidative phosphorylation', 'acetyl CoA', 'pyruvate', 'ATP synthesis'],
  'Plant Growth and Development': ['auxin', 'gibberellin', 'cytokinin', 'ethylene', 'ABA', 'phytochrome', 'vernalization', 'photoperiodism', 'bolting', 'apical dominance'],
  'Sexual Reproduction in Flowering Plants': ['pollination', 'fertilization', 'embryo sac', 'pollen', 'stigma', 'ovule', 'endosperm', 'double fertilization', 'geitonogamy', 'xenogamy', 'autogamy'],

  // Human Biology & Physiology
  'Human Health and Disease': ['immune', 'antibody', 'antigen', 'vaccine', 'pathogen', 'HIV', 'AIDS', 'cancer', 'drug', 'morphine', 'cannabinoid'],
  'Digestion and Absorption': ['digestion', 'enzyme', 'stomach', 'intestine', 'bile', 'pancreas', 'absorption', 'villi'],
  'Breathing and Exchange of Gases': ['respiration', 'lung', 'alveoli', 'trachea', 'bronchi', 'oxygen', 'CO2', 'hemoglobin'],
  'Body Fluids and Circulation': ['heart', 'blood', 'circulation', 'artery', 'vein', 'cardiac', 'lub-dub', 'semilunar', 'tricuspid', 'bicuspid'],
  'Excretory Products and their Elimination': ['kidney', 'nephron', 'urine', 'uremia', 'glomerulus', 'Bowman', 'filtration', 'reabsorption'],
  'Locomotion and Movement': ['muscle', 'bone', 'joint', 'sarcomere', 'myofibril', 'actin', 'myosin', 'contraction', 'Z-line'],
  'Neural Control and Coordination': ['brain', 'neuron', 'nerve', 'synapse', 'neurotransmitter', 'cerebrum', 'cerebellum', 'medulla', 'hypothalamus', 'reflex'],
  'Chemical Coordination and Integration': ['hormone', 'endocrine', 'pituitary', 'thyroid', 'insulin', 'adrenaline', 'testosterone', 'estrogen'],

  // Genetics & Evolution
  'Principles of Inheritance and Variation': ['Mendel', 'dominance', 'recessive', 'allele', 'genotype', 'phenotype', 'monohybrid', 'dihybrid', 'test cross', 'linkage', 'hemophilia', 'color blindness'],
  'Evolution': ['natural selection', 'Darwin', 'Lamarck', 'fossil', 'homology', 'analogy', 'adaptive radiation', 'convergent evolution', 'Australopithecus', 'Homo sapiens', 'Dryopithecus'],

  // Reproduction & Development
  'Reproduction in Organisms': ['asexual', 'sexual', 'budding', 'fragmentation', 'spore', 'gamete', 'zygote', 'fission', 'vegetative'],
  'Human Reproduction': ['testis', 'ovary', 'sperm', 'egg', 'oocyte', 'spermatogenesis', 'oogenesis', 'menstrual', 'placenta', 'pregnancy', 'MTP', 'contraception', 'vasectomy', 'tubectomy'],

  // Ecology & Environment
  'Organisms and Populations': ['population', 'ecology', 'habitat', 'niche', 'adaptation', 'competition', 'predation', 'symbiosis', 'homeostasis'],
  'Ecosystem': ['ecosystem', 'food chain', 'food web', 'productivity', 'energy flow', 'trophic level', 'pyramid', 'nutrient cycling', 'carbon cycle', 'nitrogen cycle', 'phosphorus'],
  'Biodiversity and Conservation': ['biodiversity', 'extinction', 'endangered', 'hotspot', 'IUCN', 'conservation', 'Dodo', 'Quagga', 'Thylacine'],
  'Environmental Issues': ['pollution', 'greenhouse', 'ozone', 'eutrophication', 'CFC', 'CO2', 'scrubber', 'global warming'],

  // Biotechnology
  'Biotechnology Principles and Processes': ['recombinant DNA', 'plasmid', 'vector', 'restriction enzyme', 'ligase', 'PCR', 'transformation', 'Thermus aquaticus', 'endonuclease', 'ELISA'],
  'Biotechnology and its Applications': ['genetic engineering', 'GMO', 'insulin', 'interferon', 'vaccine', 'gene therapy', 'cloning', 'antitrypsin', 'Bt cotton'],
  'Microbes in Human Welfare': ['bacteria', 'yeast', 'fermentation', 'antibiotic', 'biogas', 'sewage', 'biofertilizer', 'Lactobacillus', 'Spirulina'],

  // Structural Organization
  'Structural Organisation in Animals': ['tissue', 'epithelial', 'connective', 'muscular', 'nervous', 'ciliated', 'glandular'],
  'Biological Classification': ['taxonomy', 'phylum', 'class', 'kingdom', 'Ctenophora', 'Arthropoda', 'Mollusca', 'chitin'],
  'Plant Kingdom': ['algae', 'bryophyte', 'pteridophyte', 'gymnosperm', 'angiosperm', 'Fucus', 'Chlamydomonas', 'Ectocarpus', 'haplodiplontic'],
  'Morphology of Flowering Plants': ['flower', 'stamen', 'carpel', 'sepal', 'petal', 'bisexual', 'unisexual'],

  // Biomolecules
  'Biomolecules': ['protein', 'carbohydrate', 'lipid', 'nucleic acid', 'enzyme', 'vitamin', 'amino acid'],
  'Cell: The Unit of Life': ['cell membrane', 'nucleus', 'ribosome', 'mitochondria', 'chloroplast', 'vacuole', 'cytoplasm'],
};

const DOMAIN_MAPPING: Record<string, string> = {
  'Molecular Basis of Inheritance': 'Genetics & Evolution',
  'Cell Cycle and Cell Division': 'Cell Biology',
  'Photosynthesis in Higher Plants': 'Plant Physiology',
  'Respiration in Plants': 'Plant Physiology',
  'Plant Growth and Development': 'Plant Physiology',
  'Sexual Reproduction in Flowering Plants': 'Plant Reproduction',
  'Human Health and Disease': 'Human Physiology',
  'Digestion and Absorption': 'Human Physiology',
  'Breathing and Exchange of Gases': 'Human Physiology',
  'Body Fluids and Circulation': 'Human Physiology',
  'Excretory Products and their Elimination': 'Human Physiology',
  'Locomotion and Movement': 'Human Physiology',
  'Neural Control and Coordination': 'Human Physiology',
  'Chemical Coordination and Integration': 'Human Physiology',
  'Principles of Inheritance and Variation': 'Genetics & Evolution',
  'Evolution': 'Genetics & Evolution',
  'Reproduction in Organisms': 'Reproduction & Development',
  'Human Reproduction': 'Human Physiology',
  'Organisms and Populations': 'Ecology & Environment',
  'Ecosystem': 'Ecology & Environment',
  'Biodiversity and Conservation': 'Ecology & Environment',
  'Environmental Issues': 'Ecology & Environment',
  'Biotechnology Principles and Processes': 'Biotechnology',
  'Biotechnology and its Applications': 'Biotechnology',
  'Microbes in Human Welfare': 'Biotechnology',
  'Structural Organisation in Animals': 'Cell Biology',
  'Biological Classification': 'Cell Biology',
  'Plant Kingdom': 'Plant Physiology',
  'Morphology of Flowering Plants': 'Plant Reproduction',
  'Biomolecules': 'Cell Biology',
  'Cell: The Unit of Life': 'Cell Biology',
};

export function mapTopicsFast(questions: Question[]): MappedQuestion[] {
  return questions.map(q => {
    const questionText = q.text.toLowerCase();
    const optionsText = q.options.map((o: any) => (o.text || '').toLowerCase()).join(' ');
    const fullText = questionText + ' ' + optionsText;

    // Find matching topic based on keywords
    let bestTopic = 'General Biology';
    let maxMatches = 0;

    for (const [topic, keywords] of Object.entries(BIOLOGY_TOPIC_KEYWORDS)) {
      const matches = keywords.filter(keyword =>
        fullText.includes(keyword.toLowerCase())
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestTopic = topic;
      }
    }

    const domain = DOMAIN_MAPPING[bestTopic] || 'General Biology';

    // Simple difficulty heuristic
    const difficulty = questionText.length > 200 ? 'Hard' :
                      questionText.length > 100 ? 'Medium' : 'Easy';

    return {
      ...q,
      topic: bestTopic,
      domain: domain,
      difficulty: difficulty,
      blooms: 'Understanding', // Default
    };
  });
}
