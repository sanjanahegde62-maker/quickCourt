import re

with open('./docx2_orig/word/document.xml', 'r', encoding='utf-8') as f:
    xml2 = f.read()

body_match = re.search(r'<w:body>([\s\S]*)<\/w:body>', xml2)
body = body_match.group(1)

# Let's see the trailing sectPr of docx2_orig
sect_match = re.search(r'<w:sectPr[\s\S]*?<\/w:sectPr>\s*$', body)
if sect_match:
    print('Found trailing sectPr in docx2_orig! Length:', len(sect_match.group(0)))
else:
    print('No trailing sectPr in docx2_orig body')
