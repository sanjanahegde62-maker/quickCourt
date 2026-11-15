with open('./docx2_orig/word/document.xml', 'r', encoding='utf-8') as f:
    xml2 = f.read()

doc_tag_start = xml2.find('<w:document')
doc_tag_end = xml2.find('>', doc_tag_start) + 1
root_tag = xml2[doc_tag_start:doc_tag_end]

print('Correct root tag:')
print(root_tag)
