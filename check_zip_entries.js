const fs = require('fs');

// Read zip file header
// Or check zip entries using python or a quick zip parser
const buffer = fs.readFileSync('College_Timetable_Conflict_Detection_DAA_Report.docx');

// Look for 'word' in zip entries
// Local file header signature: 0x04034b50
let offset = 0;
const entries = [];
while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
        const nameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
        entries.push(name);
        offset += 30 + nameLen + extraLen;
    } else {
        offset++;
    }
}
console.log('Total entries found:', entries.length);
console.log('Sample entries:', entries.slice(0, 10));
const hasBackslash = entries.some(e => e.includes('\\'));
console.log('HAS BACKSLASHES:', hasBackslash);
