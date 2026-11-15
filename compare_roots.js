const fs = require('fs');

const xml1 = fs.readFileSync('./docx1_extracted/word/document.xml', 'utf8');
const xml2 = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');

// Check namespaces on <w:document>
const root1 = xml1.match(/<w:document[^>]*>/)[0];
const root2 = xml2.match(/<w:document[^>]*>/)[0];

console.log('Root 1:\n', root1);
console.log('Root 2:\n', root2);
