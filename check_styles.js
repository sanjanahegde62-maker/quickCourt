const fs = require('fs');

const s1 = fs.readFileSync('./docx1_extracted/word/styles.xml', 'utf8');
const s2 = fs.readFileSync('./docx2_extracted/word/styles.xml', 'utf8');

console.log('Styles 1 length:', s1.length);
console.log('Styles 2 length:', s2.length);

// Let's check what table styles or paragraph styles exist in docx1
const styles1Matches = s1.match(/w:styleId="[^"]+"/g) || [];
console.log('Doc1 styles:', [...new Set(styles1Matches)]);
const styles2Matches = s2.match(/w:styleId="[^"]+"/g) || [];
console.log('Doc2 styles count:', styles2Matches.length);
