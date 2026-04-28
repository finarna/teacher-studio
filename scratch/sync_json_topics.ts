import fs from 'fs';
import path from 'path';

const MAPPING = {
  // Biology
  "Biotechnology Principles and Processes": "Biotechnology: Principles and Processes",
  
  // Chemistry
  "Alcohols Phenols and Ethers": "Alcohols, Phenols and Ethers",
  "Aldehydes Ketones and Carboxylic Acids": "Aldehydes, Ketones and Carboxylic Acids",
  "d and f Block Elements": "The d and f Block Elements",
  
  // Add more here if needed based on the audit
};

const JSON_FILES = [
  'flagship_final.json',
  'flagship_physics_final.json',
  'flagship_chemistry_final.json',
  'flagship_biology_final.json'
];

function syncJsonTopics() {
  console.log('🔄 Syncing JSON topic names to Official Registry...');

  for (const fileName of JSON_FILES) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    console.log(`📂 Patching ${fileName}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Simple string replacement for topics in JSON
    for (const [oldName, newName] of Object.entries(MAPPING)) {
      const oldStr = `"topic": "${oldName}"`;
      const newStr = `"topic": "${newName}"`;
      if (content.includes(oldStr)) {
        console.log(`   ✅ Replaced: "${oldName}" -> "${newName}"`);
        content = content.split(oldStr).join(newStr);
      }
    }

    fs.writeFileSync(filePath, content);
  }

  console.log('✨ JSON-Registry Sync Complete!');
}

syncJsonTopics();
