import re

with open('./docx1_extracted/word/styles.xml', 'r', encoding='utf-8') as f:
    s1 = f.read()

match = re.search(r'<w:style [^>]*w:styleId="TableGrid"[^>]*>[\s\S]*?<\/w:style>', s1)
if match:
    print('Found TableGrid style! Length:', len(match.group(0)))
    with open('tablegrid_style.xml', 'w', encoding='utf-8') as out:
        out.write(match.group(0))
else:
    print('TableGrid style not found in s1!')
