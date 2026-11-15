import re

with open('./docx1_extracted/word/document.xml', 'r', encoding='utf-8') as f:
    doc1 = f.read()

styles_in_doc1 = set(re.findall(r'w:val="([^"]+)"', doc1))

with open('./docx2_orig/word/styles.xml', 'r', encoding='utf-8') as f:
    s2 = f.read()

styles_in_s2 = set(re.findall(r'w:styleId="([^"]+)"', s2))

with open('./docx1_extracted/word/styles.xml', 'r', encoding='utf-8') as f:
    s1 = f.read()

styles_in_s1 = set(re.findall(r'w:styleId="([^"]+)"', s1))

print('Styles referenced in doc1:', styles_in_doc1.intersection(styles_in_s1))
print('Referenced styles missing in s2:', styles_in_doc1.intersection(styles_in_s1) - styles_in_s2)
