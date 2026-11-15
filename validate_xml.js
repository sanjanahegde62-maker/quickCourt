const fs = require('fs');

const xml = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');
console.log('XML length:', xml.length);

// Let's test well-formedness using a regex or simple stack-based XML validator
function validateXml(xmlString) {
    const tagRegex = /<(\/)?([a-zA-Z0-9_:]+)([^>]*?)(\/)?>/g;
    const stack = [];
    let match;
    let line = 1;
    let col = 1;
    let lastIndex = 0;

    while ((match = tagRegex.exec(xmlString)) !== null) {
        const [full, isClosing, tagName, attrs, isSelfClosing] = match;
        if (isSelfClosing) continue;

        if (isClosing) {
            if (stack.length === 0) {
                console.error(`Unexpected closing tag </${tagName}> around index ${match.index}`);
                return false;
            }
            const top = stack.pop();
            if (top.tagName !== tagName) {
                console.error(`Mismatched closing tag: expected </${top.tagName}> but got </${tagName}> around index ${match.index}`);
                console.error(`Context: ${xmlString.slice(Math.max(0, match.index - 100), Math.min(xmlString.length, match.index + 100))}`);
                return false;
            }
        } else {
            stack.push({ tagName, index: match.index });
        }
    }

    if (stack.length > 0) {
        console.error(`Unclosed tags remaining: ${stack.map(s => s.tagName).join(', ')}`);
        return false;
    }

    console.log('XML is perfectly well-formed and all tags are properly balanced!');
    return true;
}

validateXml(xml);
