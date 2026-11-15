const fs = require('fs');
const xml = fs.readFileSync('./docx2_orig/word/document.xml', 'utf8');
console.log(xml.slice(56200, 56600));
