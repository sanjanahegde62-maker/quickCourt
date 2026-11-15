import os, zipfile

def zip_dir(src_dir, output_zip):
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, src_dir).replace('\\', '/')
                zipf.write(full_path, rel_path)

zip_dir('docx2_orig', 'test_orig_repack.docx')
print('Repacked docx2_orig to test_orig_repack.docx. Size:', os.path.getsize('test_orig_repack.docx'))
