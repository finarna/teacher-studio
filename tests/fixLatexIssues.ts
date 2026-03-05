import { supabaseAdmin } from '../lib/supabaseServer.ts';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function fixLatexIssues() {
    console.log('Fetching most recent scan...');
    const { data: scan } = await supabaseAdmin.from('scans').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (!scan) return;

    console.log(`Fixing LaTeX issues for Scan: ${scan.name}\n`);

    const { data: questions } = await supabaseAdmin.from('questions')
        .select('id, text, options')
        .eq('scan_id', scan.id);

    if (!questions) return;

    let totalFixed = 0;

    for (const q of questions) {
        let fixedText = q.text || '';
        let fixedOptions = [...(q.options || [])];
        let hasChanges = false;

        const fixStr = (str: string) => {
            let s = str;
            // Rule 1: Missing backslash in front of begin/end
            if (s.includes('egin{')) {
                s = s.replace(/egin\{/g, '\\begin{');
                hasChanges = true;
            }
            if (s.includes('nd{')) {
                s = s.replace(/nd\{/g, '\\end{');
                hasChanges = true;
            }

            // Rule 2: \ight instead of \right
            if (s.includes('\\ight')) {
                s = s.replace(/\\ight/g, '\\right');
                hasChanges = true;
            }

            // Rule 3: \eft instead of \left
            if (s.includes('\\eft')) {
                s = s.replace(/\\eft/g, '\\left');
                hasChanges = true;
            }

            // Rule 4: Fix single backslash issues if they seem broken (optional, delicate)
            // For now, let's keep it simple to avoid breaking valid ones

            return s;
        };

        fixedText = fixStr(fixedText);
        fixedOptions = fixedOptions.map(opt => fixStr(opt));

        if (hasChanges) {
            console.log(`🛠️ Fixing Q ID: ${q.id}`);
            const { error } = await supabaseAdmin.from('questions')
                .update({
                    text: fixedText,
                    options: fixedOptions
                })
                .eq('id', q.id);

            if (error) {
                console.error(`Failed to update ${q.id}: ${error.message}`);
            } else {
                totalFixed++;
            }
        }
    }

    console.log(`\n============== REPORT ==============`);
    console.log(`✅ Total Questions Fixed: ${totalFixed}`);
}

fixLatexIssues();
