const fs = require('fs');

const s1 = fs.readFileSync('./docx1_extracted/word/styles.xml', 'utf8');
const s2 = fs.readFileSync('./docx2_orig/word/styles.xml', 'utf8');

console.log('s1 has TableGrid:', s1.includes('TableGrid'));
console.log('s2 has TableGrid:', s2.includes('TableGrid'));
console.log('s1 has Heading1:', s1.includes('Heading1'));
console.log('s2 has Heading1:', s2.includes('Heading1'));
