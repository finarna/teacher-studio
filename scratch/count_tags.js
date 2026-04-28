const fs = require('fs');
const content = fs.readFileSync('/Users/apple/FinArna/edujourney---universal-teacher-studio/components/MockTestBuilderPage.tsx', 'utf8');

function countTags(tagName) {
    const openRegex = new RegExp(`<${tagName}\\b`, 'g');
    const closeRegex = new RegExp(`</${tagName}>`, 'g');
    const openCount = (content.match(openRegex) || []).length;
    const closeCount = (content.match(closeRegex) || []).length;
    
    // Check for self-closing tags
    const selfCloseRegex = new RegExp(`<${tagName}[^>]*/>`, 'g');
    const selfCloseCount = (content.match(selfCloseRegex) || []).length;
    
    return { open: openCount, close: closeCount, self: selfCloseCount };
}

['div', 'section', 'button', 'span', 'style'].forEach(tag => {
    const counts = countTags(tag);
    console.log(`${tag}: Open=${counts.open}, Close=${counts.close}, Self=${counts.self}, Balance=${counts.open - counts.close - counts.self}`);
});
