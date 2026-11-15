const fs = require('fs');

const stylesXml = fs.readFileSync('./docx2_orig/word/styles.xml', 'utf8');

// Find all styleIds in docx2 styles.xml
const styleIds = (stylesXml.match(/w:styleId="[^"]+"/g) || []).map(s => s.match(/w:styleId="([^"]+)"/)[1]);
console.log('Doc2 styles count:', styleIds.length);
console.log('Doc2 style IDs:', styleIds);
