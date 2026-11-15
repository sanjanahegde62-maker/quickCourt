import re

with open('./docx2_orig/word/_rels/document.xml.rels', 'r', encoding='utf-8') as f:
    rels = f.read()

print('Rels in docx2_orig:')
print(rels)
