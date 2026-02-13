# Official Syllabus Reference Files

This directory contains comprehensive syllabus documentation for all supported competitive exams and board examinations.

## Available Syllabi

### 1. NEET 2026 (Medical Entrance)
**File**: `NEET_2026_Syllabus.md`

- **Conducting Body**: National Testing Agency (NTA)
- **Release Date**: January 8, 2026
- **Website**: https://nta.ac.in
- **Subjects**: Physics, Chemistry, Biology (Botany + Zoology)
- **Total Questions**: 180 (45 per subject)
- **Duration**: 200 minutes
- **Marking**: +4 correct, -1 incorrect
- **Coverage**: Class 11 (45%) + Class 12 (55%)

**Key Features**:
- Detailed chapter-wise breakdown
- Topic weightage per chapter
- High-weightage topics highlighted
- Preparation strategy included

---

### 2. JEE Main 2026 (Engineering Entrance)
**File**: `JEE_Main_2026_Syllabus.md`

- **Conducting Body**: National Testing Agency (NTA)
- **Release Date**: January 2026
- **Website**: https://jeemain.nta.ac.in
- **Subjects**: Physics, Chemistry, Mathematics
- **Total Questions**: 90 (30 per subject)
- **Duration**: 180 minutes
- **Marking**: +4 correct, -1 incorrect
- **Coverage**: Class 11 (40%) + Class 12 (60%)

**Key Features**:
- Mathematics syllabus (13 Class 12 chapters)
- Physics and Chemistry (same as NEET)
- Topic-wise marks distribution
- Comparison with NEET approach

---

### 3. KCET 2026 (Karnataka Common Entrance Test)
**File**: `KCET_2026_Syllabus.md`

- **Conducting Body**: Karnataka Examination Authority (KEA)
- **Release Date**: January 29, 2026
- **Website**: https://cetonline.karnataka.gov.in
- **Subjects**: Physics, Chemistry, Mathematics/Biology
- **Total Questions**: 180 (60 per subject)
- **Duration**: 240 minutes (80 min per subject)
- **Marking**: +1 per question, **NO negative marking**
- **Coverage**: 1st PUC (20%) + 2nd PUC (80%)

**Key Features**:
- Karnataka PUC-based syllabus
- Chapter-wise weightage
- Deleted topics marked clearly
- New 2026 additions (Experimental units)
- State-specific exam pattern

---

### 4. Karnataka PUC II 2025-26 (Board Examination)
**File**: `PUC_II_2026_Syllabus.md`

- **Conducting Body**: Department of Pre-University Education (DPUE), Karnataka
- **Assessment Board**: Karnataka School Examination and Assessment Board (KSEAB)
- **Websites**:
  - https://pue.karnataka.gov.in
  - https://kseab.karnataka.gov.in
- **Subjects**: Physics, Chemistry, Biology, Mathematics
- **Exam Pattern**: 70 marks (theory) + 30 marks (practical)
- **Duration**: 3 hours 15 minutes
- **Passing Marks**: 35%

**Key Features**:
- Complete chapter list for all subjects
- Deleted topics for 2025-26 clearly marked
- Marks distribution per chapter
- Practical exam details included
- Board-specific preparation tips

---

## Syllabus Comparison

| Feature | NEET | JEE Main | KCET | PUC II |
|---------|------|----------|------|--------|
| **Purpose** | Medical | Engineering | State CET | Board Exam |
| **Level** | National | National | State | State |
| **Subjects** | PCB | PCM | PCB/PCM | All |
| **Questions** | 180 | 90 | 180 | Theory+Practical |
| **Duration** | 200 min | 180 min | 240 min | 195 min |
| **Negative Marking** | Yes (-1) | Yes (-1) | **NO** | N/A |
| **Class 11 Weightage** | 45% | 40% | 20% | Not tested |
| **Class 12 Weightage** | 55% | 60% | 80% | 100% |

---

## How to Use These Files

### For Students

1. **Exam Selection**: Choose your target exam
2. **Chapter Coverage**: Check which chapters are included
3. **Weightage Analysis**: Focus on high-weightage topics
4. **Preparation Strategy**: Follow the study plans provided
5. **Cross-Reference**: Compare syllabi if preparing for multiple exams

### For Developers

These files are used by the `scripts/seedRealTopics.ts` script to populate the database with official syllabus-based topics.

**Database Integration**:
```typescript
// Topics are seeded with exam-specific weightage
examWeightage: {
  NEET: 5,    // Questions expected in NEET
  JEE: 6,     // Questions expected in JEE
  KCET: 5,    // Questions expected in KCET
  PUCII: 5,   // Marks in PUC II board exam
  CBSE: 5     // Marks in CBSE board exam
}
```

---

## Subject Coverage

### Physics (Class 12)
- **Total Chapters**: 14
- **Common to**: NEET, JEE, KCET, PUC II
- **File**: All four syllabus files contain detailed Physics chapters

### Chemistry (Class 12)
- **Total Chapters**: 14 (NEET/JEE), 13 (KCET/PUC II - some deleted)
- **Deleted in KCET/PUC II**: Solid State, Surface Chemistry (possibly), Polymers, Chemistry in Everyday Life
- **File**: Check KCET/PUC II syllabi for exact deletion list

### Biology (Class 12)
- **Total Chapters**: 12-13
- **Applicable to**: NEET, KCET, PUC II
- **Not in**: JEE Main (Math instead)

### Mathematics (Class 12)
- **Total Chapters**: 13
- **Applicable to**: JEE, KCET, PUC II
- **Not in**: NEET (Biology instead)

---

## Updates and Maintenance

### Version History

- **February 11, 2026**: Initial creation with all four exam syllabi
  - NEET 2026 (NTA release: Jan 8, 2026)
  - JEE Main 2026 (NTA release: Jan 2026)
  - KCET 2026 (KEA release: Jan 29, 2026)
  - PUC II 2025-26 (KSEAB release)

### Updating Syllabi

When exam authorities release updated syllabi:

1. Download official PDF from respective websites
2. Update the corresponding `.md` file in this directory
3. Run `scripts/seedRealTopics.ts` to update database
4. Update this README if major changes

---

## Official Sources

### NEET
- **Official Website**: https://nta.ac.in
- **Syllabus Page**: https://neet.nta.ac.in/syllabus
- **Information Bulletin**: Released annually in December/January

### JEE Main
- **Official Website**: https://jeemain.nta.ac.in
- **Syllabus Page**: https://jeemain.nta.ac.in/syllabus
- **Information Bulletin**: Released annually in December/January

### KCET
- **Official Website**: https://cetonline.karnataka.gov.in
- **Syllabus PDF**: Available in "Information" section
- **Release**: January each year

### Karnataka PUC II
- **Official Websites**:
  - https://pue.karnataka.gov.in (PU Education Department)
  - https://kseab.karnataka.gov.in (Assessment Board)
- **Syllabus Location**: Students Corner → Reduced Syllabus 2025-26
- **Textbooks**: Karnataka State textbooks (primary resource)

---

## Additional Resources

### For NEET Preparation
- NCERT Textbooks (Class 11 + 12)
- NEET Previous Year Papers (2015-2025)
- Biology: Focus on diagrams and NCERT language

### For JEE Main Preparation
- NCERT Textbooks (foundation)
- Reference Books:
  - Mathematics: Cengage, Arihant
  - Physics: HC Verma, DC Pandey
  - Chemistry: OP Tandon
- JEE Main Previous Years (2015-2025)

### For KCET Preparation
- Karnataka PUC Textbooks (PRIMARY)
- NCERT for supplementary
- KCET Previous Year Papers (2015-2025)
- Important: 80% questions from Class 12 (2nd PUC)

### For PUC II Board Exam
- Karnataka State Textbooks (MANDATORY)
- NCERT for reference
- Karnataka Board Previous Papers (10 years)
- Practical record maintenance crucial (30 marks)

---

## FAQ

**Q: Why are some Chemistry chapters missing in KCET/PUC II?**
A: Karnataka Board has deleted certain chapters from the 2025-26 syllabus to reduce student burden. Exact deleted topics are listed in the respective syllabus files.

**Q: Can I use NCERT alone for KCET/PUC II?**
A: While NCERT is the base, Karnataka State textbooks contain additional content specific to the state board. Using both is recommended.

**Q: Are NEET and JEE syllabi completely NCERT-based?**
A: Yes, both exams are strictly NCERT-based. JEE Main may ask conceptually deeper questions, but all topics are from NCERT.

**Q: Which exam has the most overlap?**
A: KCET and PUC II have maximum overlap (KCET is based on PUC syllabus). NEET and JEE also share Physics and Chemistry.

**Q: How often do syllabi change?**
A: Major changes are rare. Minor updates (deleted topics, new additions) happen annually. Always check official websites for latest version.

---

## Contributing

If you find any discrepancies or updates:

1. Verify from official sources (links provided above)
2. Update the relevant `.md` file
3. Document changes in this README
4. Update `scripts/seedRealTopics.ts` if topics change
5. Re-run seeding script to update database

---

**Last Updated**: February 11, 2026
**Maintained by**: EduJourney Development Team

For questions or updates, refer to official exam authority websites listed above.
