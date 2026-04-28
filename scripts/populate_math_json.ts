
import fs from 'fs';
import path from 'path';

const realText = fs.readFileSync('./REAL_2026_TEXT_CHEMISTRY.txt', 'utf-8');
const templatePath = './REAL_2026_KCET/extracted_real_papers/real_math_2026_template.json';
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

// Improved parser to extract questions and options
// This is a robust regex for KCET style: Number. Text (Options)
const questionsRaw = realText.split(/--- PAGE \d+ ---/);
let questionsExtracted = [];

// Simplified parser for this specific task
const fullText = realText.replace(/--- PAGE \d+ ---/g, ' ');

for (let i = 1; i <= 60; i++) {
    const startIdx = fullText.indexOf(`${i}. `);
    const endIdx = fullText.indexOf(`${i + 1}. `);
    
    let qContent = "";
    if (startIdx !== -1) {
        qContent = endIdx !== -1 ? fullText.substring(startIdx, endIdx) : fullText.substring(startIdx);
    }
    
    if (qContent) {
        // Clean up text
        let textPart = qContent.replace(/^\d+\.\s+/, '').trim();
        
        // Extract options
        const optRegex = /\((A|B|C|D|1|2|3|4)\)\s+/g;
        const opts = textPart.split(optRegex).filter(s => s.trim().length > 0 && !['A','B','C','D','1','2','3','4'].includes(s.trim()));
        
        // The last split might contain footer info, clean it
        if (opts.length > 0) {
            opts[opts.length - 1] = opts[opts.length - 1].split(/KCET 2026\s+Page/)[0].trim();
        }

        // The question text is before the first option
        const firstOptMatch = textPart.match(optRegex);
        if (firstOptMatch) {
            textPart = textPart.split(firstOptMatch[0])[0].trim();
        }

        const q = template.questions[i - 1];
        q.text = textPart;
        q.options = opts.slice(0, 4).map(o => o.trim());
        q.extractionMethod = "automated";
    }
}

const outputPath = './REAL_2026_KCET/extracted_real_papers/real_math_2026.json';
fs.writeFileSync(outputPath, JSON.stringify(template, null, 2));
console.log(`✓ Saved populated Math paper to ${outputPath}`);
