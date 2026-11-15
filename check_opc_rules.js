const fs = require('fs');

const xml = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');

// Check direct children of <w:body>
const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
const body = bodyMatch[1];

// Count <w:sectPr> inside body
const sectPrs = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];
console.log('Total w:sectPr count:', sectPrs.length);

// Check if any <w:sectPr> is NOT inside a <w:pPr> and NOT at the very end
// In valid OpenXML, w:sectPr can appear inside w:pPr (representing section break) or as the very last child of w:body
// Let's check how many are direct children of w:body
const bodyDirectSectPr = body.match(/<\/w:p>\s*<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];
console.log('Direct w:sectPr following w:p:', bodyDirectSectPr.length);

// Check bookmarks: bookmarkStart vs bookmarkEnd
const bStarts = (body.match(/<w:bookmarkStart[^>]*\/>/g) || []).map(b => {
    const id = b.match(/w:id="(\d+)"/)[1];
    return id;
});
const bEnds = (body.match(/<w:bookmarkEnd[^>]*\/>/g) || []).map(b => {
    const id = b.match(/w:id="(\d+)"/)[1];
    return id;
});
console.log('Bookmark starts:', bStarts);
console.log('Bookmark ends:', bEnds);

// Check if all starts have ends
const missingEnds = bStarts.filter(id => !bEnds.includes(id));
console.log('Bookmarks missing ends:', missingEnds);

// Check paraId duplicates
const paraIds = (body.match(/w14:paraId="([0-9A-Fa-f]+)"/g) || []).map(p => p.match(/w14:paraId="([0-9A-Fa-f]+)"/)[1]);
const paraIdSet = new Set();
const dupes = [];
paraIds.forEach(id => {
    if (paraIdSet.has(id)) dupes.push(id);
    else paraIdSet.add(id);
});
console.log('Duplicate paraIds count:', dupes.length);
