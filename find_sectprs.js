const fs = require('fs');

const xml = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');

const matches = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];
matches.forEach((m, i) => {
    const idx = xml.indexOf(m);
    console.log(`=== SectPr ${i} at index ${idx} ===`);
    console.log(m.slice(0, 150));
    console.log('Preceding 100 chars:', xml.slice(idx - 100, idx));
});
