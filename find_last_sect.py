import re

with open('./docx2_orig/word/document.xml', 'r', encoding='utf-8') as f:
    xml2 = f.read()

# Find the last <w:sectPr>...</w:sectPr> before </w:body>
body_end = xml2.rfind('</w:body>')
last_sect_start = xml2.rfind('<w:sectPr', 0, body_end)
last_sect_end = xml2.rfind('</w:sectPr>', 0, body_end) + len('</w:sectPr>')

print('Last sectPr: index', last_sect_start, 'to', last_sect_end)
print(xml2[last_sect_start:last_sect_end])
print('Is it directly before </w:body>?', xml2[last_sect_end:body_end].strip() == '')
