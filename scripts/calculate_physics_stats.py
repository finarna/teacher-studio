#!/usr/bin/env python3
"""Calculate correct statistics from KCET 2026 Physics forensic table"""

import re

# Read the forensic report
with open('/Users/apple/FinArna/edujourney---universal-teacher-studio/KCET_2026_PHYSICS_COMPLETE_FORENSIC_REPORT.md', 'r') as f:
    content = f.read()

# Extract all table rows with question data
lines = content.split('\n')
tier_counts = {'Tier 1': 0, 'Tier 2': 0, 'Tier 3': 0, 'Tier 4': 0, 'Tier 5': 0}
scores = []

for line in lines:
    if line.startswith('| ') and not line.startswith('|---'):
        parts = [p.strip() for p in line.split('|')]
        # Filter for data rows (should have 10 parts including empty start/end)
        if len(parts) >= 10:
            q_num = parts[1].strip()
            # Check if this is a valid question row (Q# should be a number)
            if q_num.isdigit() and int(q_num) >= 1 and int(q_num) <= 60:
                # Extract tier (column 5, 0-indexed)
                tier = parts[5].strip()
                if tier in tier_counts:
                    tier_counts[tier] += 1

                # Extract score (column 6, 0-indexed)
                score_str = parts[6].strip()
                score_match = re.search(r'\d+', score_str)
                if score_match:
                    score = int(score_match.group())
                    scores.append(score)

# Calculate statistics
total_questions = len(scores)
total_score = sum(scores)
average_score = total_score / total_questions if total_questions > 0 else 0

tier1_count = tier_counts['Tier 1']
tier2_count = tier_counts['Tier 2']
tier3_count = tier_counts['Tier 3']
tier4_count = tier_counts['Tier 4']
tier5_count = tier_counts['Tier 5']

tier1_pct = (tier1_count / total_questions * 100) if total_questions > 0 else 0
tier2_pct = (tier2_count / total_questions * 100) if total_questions > 0 else 0
tier3_pct = (tier3_count / total_questions * 100) if total_questions > 0 else 0
tier4_pct = (tier4_count / total_questions * 100) if total_questions > 0 else 0
tier5_pct = (tier5_count / total_questions * 100) if total_questions > 0 else 0

tier1_plus_2 = tier1_count + tier2_count
tier1_plus_2_pct = (tier1_plus_2 / total_questions * 100) if total_questions > 0 else 0

# Determine grade
if average_score >= 90:
    grade = "A+"
elif average_score >= 85:
    grade = "A"
elif average_score >= 80:
    grade = "A-"
elif average_score >= 75:
    grade = "B+"
elif average_score >= 70:
    grade = "B"
elif average_score >= 65:
    grade = "B-"
elif average_score >= 60:
    grade = "C+"
else:
    grade = "C"

# Print results
print("=" * 60)
print("KCET 2026 PHYSICS - CORRECTED STATISTICS")
print("=" * 60)
print()
print("TIER DISTRIBUTION (from forensic table Q1-Q60):")
print(f"  Tier 1 (Exact Hits, 98-100):    {tier1_count:2d} questions ({tier1_pct:5.1f}%)")
print(f"  Tier 2 (Model Match, 80-94):    {tier2_count:2d} questions ({tier2_pct:5.1f}%)")
print(f"  Tier 3 (Concept Match, 60-79):  {tier3_count:2d} questions ({tier3_pct:5.1f}%)")
print(f"  Tier 4 (Chapter Only, 30-59):   {tier4_count:2d} questions ({tier4_pct:5.1f}%)")
print(f"  Tier 5 (Missed, 0-29):          {tier5_count:2d} questions ({tier5_pct:5.1f}%)")
print()
print("CORRECTED SUCCESS METRICS:")
print(f"  Elite Prediction Success (Tier 1):          {tier1_pct:5.1f}% ({tier1_count}/60)")
print(f"  Meaningful Prediction Success (Tier 1+2):   {tier1_plus_2_pct:5.1f}% ({tier1_plus_2}/60)")
print(f"  Average Match Score:                        {average_score:.1f}/100")
print(f"  Prediction Confidence Grade:                {grade}")
print()
print("SCORE VERIFICATION:")
print(f"  Total Questions: {total_questions}")
print(f"  Total Score Sum: {total_score}")
print(f"  Average: {total_score}/{total_questions} = {average_score:.1f}")
print()
print("=" * 60)

# Save to file for reference
with open('/Users/apple/FinArna/edujourney---universal-teacher-studio/PHYSICS_CORRECTED_STATS.txt', 'w') as f:
    f.write("CORRECTED STATISTICS\n")
    f.write(f"Tier 1: {tier1_count}\n")
    f.write(f"Tier 2: {tier2_count}\n")
    f.write(f"Tier 3: {tier3_count}\n")
    f.write(f"Tier 4: {tier4_count}\n")
    f.write(f"Tier 5: {tier5_count}\n")
    f.write(f"Average: {average_score:.1f}\n")
    f.write(f"Tier 1+2: {tier1_plus_2} ({tier1_plus_2_pct:.1f}%)\n")
    f.write(f"Grade: {grade}\n")
