const fs = require('fs');

const xml = fs.readFileSync('./docx2_orig/word/document.xml', 'utf8');

const matches = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];
matches.forEach((m, i) => {
    const idx = xml.indexOf(m);
    console.log(`=== Orig SectPr ${i} at index ${idx} ===`);
    console.log(m.slice(0, 100));
    console.log('Preceding 100 chars:\n', xml.slice(Math.max(0, idx - 100), idx));
});
