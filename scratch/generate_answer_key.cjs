const fs = require('fs');
const path = require('path');

const papers = [
  'flagship_neet_physics_2026_set_a.json',
  'flagship_neet_physics_2026_set_b.json',
  'flagship_neet_chemistry_2026_set_a.json',
  'flagship_neet_chemistry_2026_set_b.json',
  'flagship_neet_botany_2026_set_a.json',
  'flagship_neet_botany_2026_set_b.json',
  'flagship_neet_zoology_2026_set_a.json',
  'flagship_neet_zoology_2026_set_b.json',
  'flagship_neet_consolidated_2026_set_a.json',
  'flagship_neet_consolidated_2026_set_b.json'
];

let report = '# NEET 2026 Flagship Papers - Master Answer Key Report\n\n';
report += 'Generated on: ' + new Date().toLocaleString('en-IN') + '\n\n';

papers.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    report += `## ${file}\n**Error: File not found**\n\n`;
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const testName = data.test_name || file;
  const questions = data.test_config?.questions || [];

  report += `## ${testName}\n`;
  report += `**Total Questions:** ${questions.length}\n\n`;

  // Create a grid/table for answers to save space
  report += '| Q.No | Correct Option |\n';
  report += '|------|----------------|\n';

  questions.forEach((q, index) => {
    const correctIdx = q.correctOptionIndex;
    let answerText = 'N/A';
    if (correctIdx !== undefined && q.options && q.options[correctIdx]) {
      // Get the option text, but keep it short
      const fullText = q.options[correctIdx].replace(/\$/g, ''); // Remove LaTeX $ for cleaner report
      answerText = `(${correctIdx + 1}) ${fullText}`;
    } else {
      answerText = `(${correctIdx + 1})`;
    }
    report += `| ${index + 1} | ${answerText} |\n`;
  });

  report += '\n---\n\n';
});

fs.writeFileSync('neet_answer_key_report.md', report);
console.log('Report generated: neet_answer_key_report.md');
