with open('./docx1_extracted/word/document.xml', 'r', encoding='utf-8') as f:
    xml1 = f.read()

body_end = xml1.rfind('</w:body>')
last_sect_start = xml1.rfind('<w:sectPr', 0, body_end)
last_sect_end = xml1.rfind('</w:sectPr>', 0, body_end) + len('</w:sectPr>')

print('Doc1 Last sectPr: index', last_sect_start, 'to', last_sect_end)
print(xml1[last_sect_start:last_sect_end])
print('Is it directly before </w:body>?', xml1[last_sect_end:body_end].strip() == '')
