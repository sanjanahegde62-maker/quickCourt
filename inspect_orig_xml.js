const fs = require('fs');

const xml1 = fs.readFileSync('./docx1_extracted/word/document.xml', 'utf8');
const xml2 = fs.readFileSync('./docx2_orig/word/document.xml', 'utf8');

console.log('Doc1 body length:', xml1.length);
console.log('Doc2 orig body length:', xml2.length);

// Let's check sectPr in docx1
console.log('Doc1 sectPr:', xml1.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g));

// Let's check sectPr in docx2_orig
console.log('Doc2 orig sectPr count:', (xml2.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || []).length);
