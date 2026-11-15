const fs = require('fs');

function checkZipSlashes(filename) {
    const buffer = fs.readFileSync(filename);
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
    const hasBackslash = entries.some(e => e.includes('\\'));
    console.log(`File: ${filename} | Total: ${entries.length} | Has Backslashes: ${hasBackslash}`);
    if (entries.length > 0) {
        console.log('Sample:', entries.slice(0, 5));
    }
}

checkZipSlashes('C:/Users/sanja/.gemini/antigravity/brain/3b983424-17be-4595-9d42-9e32df6daf35/.user_uploaded/media_1794291476252_c23310da.docx');
