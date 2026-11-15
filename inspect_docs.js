const fs = require('fs');

const xml1 = fs.readFileSync('./docx1_extracted/word/document.xml', 'utf8');
const xml2 = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');

console.log('Doc1 XML Length:', xml1.length);
console.log('Doc2 XML Length:', xml2.length);

// Let's see the body children of docx1 and docx2
function getBodyChildren(xml) {
    const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
    if (!bodyMatch) return [];
    const bodyContent = bodyMatch[1];
    // Split into top-level <w:p> and <w:tbl>
    const items = [];
    const regex = /<(w:p|w:tbl)(?: [^>]*)?>[\s\S]*?<\/\1>|<w:sectPr[\s\S]*?<\/w:sectPr>/g;
    let match;
    while ((match = regex.exec(bodyContent)) !== null) {
        items.push(match[0]);
    }
    return items;
}

const items1 = getBodyChildren(xml1);
const items2 = getBodyChildren(xml2);
console.log('Doc1 items count:', items1.length);
console.log('Doc2 items count:', items2.length);

// Let's print summary of items2
items2.forEach((item, idx) => {
    const isTbl = item.startsWith('<w:tbl');
    const isSect = item.startsWith('<w:sectPr');
    const text = item.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const hasDrawing = item.includes('<w:drawing');
    console.log(`[Doc2 Item ${idx}] ${isTbl ? 'TABLE' : isSect ? 'SECT' : 'PARA'} | Drawing: ${hasDrawing} | Text: ${text.slice(0, 80)}`);
});
