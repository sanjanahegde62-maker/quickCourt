const fs = require('fs');

const xml1 = fs.readFileSync('./docx1_extracted/word/document.xml', 'utf8');
const xml2 = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');

console.log('Doc1 sectPr matches:', (xml1.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || []).length);
console.log('Doc2 sectPr matches:', (xml2.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || []).length);
