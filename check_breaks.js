const fs = require('fs');
const xml2 = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');

['CERTIFICATE', 'DECLARATION', 'ACKNOWLEDGEMENT'].forEach(s => {
    const idx = xml2.indexOf(s);
    console.log(`=== Preceding 200 chars for ${s} ===`);
    console.log(xml2.slice(idx - 200, idx));
});
