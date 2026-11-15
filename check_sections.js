const fs = require('fs');

const xml1 = fs.readFileSync('./docx1_extracted/word/document.xml', 'utf8');
const xml2 = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');

console.log('page br count in doc2:', (xml2.match(/w:type="page"/g) || []).length);
console.log('lastRenderedPageBreak count in doc2:', (xml2.match(/lastRenderedPageBreak/g) || []).length);

// Let's see the text of each major section in doc2
const sections = ['CERTIFICATE', 'DECLARATION', 'ACKNOWLEDGEMENT'];
sections.forEach(s => {
    const idx = xml2.indexOf(s);
    console.log(`Index of ${s}:`, idx);
});
