import os
import re
import zipfile
import shutil

# 1. Clean build directory
build_dir = 'docx_5page_build'
if os.path.exists(build_dir):
    shutil.rmtree(build_dir)

# Copy pristine docx2_orig into build_dir
shutil.copytree('docx2_orig', build_dir)

# 2. Extract Rubric from docx1
with open('./docx1_extracted/word/document.xml', 'r', encoding='utf-8') as f:
    xml1 = f.read()

body_start1 = xml1.find('<w:body>') + len('<w:body>')
body_end1 = xml1.rfind('</w:body>')
last_sect_start1 = xml1.rfind('<w:sectPr', 0, body_end1)
last_sect_end1 = xml1.rfind('</w:sectPr>', 0, body_end1) + len('</w:sectPr>')

rubric_elements = xml1[body_start1:last_sect_start1]
rubric_sect = xml1[last_sect_start1:last_sect_end1]

# Section break for Page 1
rubric_section_break = f'<w:p><w:pPr>{rubric_sect}</w:pPr></w:p>'

# 3. Read docx2_orig for root tag and final sectPr
with open('./docx2_orig/word/document.xml', 'r', encoding='utf-8') as f:
    xml2 = f.read()

body_end2 = xml2.rfind('</w:body>')
last_sect_start2 = xml2.rfind('<w:sectPr', 0, body_end2)
last_sect_end2 = xml2.rfind('</w:sectPr>', 0, body_end2) + len('</w:sectPr>')
final_sect_pr = xml2[last_sect_start2:last_sect_end2]

doc_tag_start = xml2.find('<w:document')
doc_tag_end = xml2.find('>', doc_tag_start) + 1
root_tag = xml2[doc_tag_start:doc_tag_end]

# 4. XML Helper functions
def escape_xml(s):
    return (s.replace('&', '&amp;')
             .replace('<', '&lt;')
             .replace('>', '&gt;')
             .replace('"', '&quot;')
             .replace("'", '&apos;'))

def make_heading(text, level=1, page_break=False):
    size = 28 if level == 1 else (24 if level == 2 else 22)
    color = "1F497D" if level == 1 else "2E74B5"
    before = 200 if level == 1 else 140
    after = 80 if level == 1 else 50
    pb = '<w:pageBreakBefore/>' if page_break else ''
    return f'''<w:p>
        <w:pPr>{pb}<w:spacing w:before="{before}" w:after="{after}"/></w:pPr>
        <w:r>
            <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/><w:bCs/><w:color w:val="{color}"/>
                <w:sz w:val="{size}"/><w:szCs w:val="{size}"/>
            </w:rPr>
            <w:t xml:space="preserve">{escape_xml(text)}</w:t>
        </w:r>
    </w:p>'''

def make_paragraph(runs, align="both", before=80, after=80, line_rule=240):
    p_pr = f'''<w:pPr>
        <w:jc w:val="{align}"/>
        <w:spacing w:before="{before}" w:after="{after}" w:line="{line_rule}" w:lineRule="auto"/>
    </w:pPr>'''
    
    r_xml = ""
    for r in runs:
        if isinstance(r, str):
            r_xml += f'''<w:r>
                <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>
                <w:t xml:space="preserve">{escape_xml(r)}</w:t>
            </w:r>'''
        else:
            text = r.get('text', '')
            bold = '<w:b/><w:bCs/>' if r.get('bold') else ''
            italic = '<w:i/><w:iCs/>' if r.get('italic') else ''
            underline = '<w:u w:val="single"/>' if r.get('underline') else ''
            color_val = r.get('color', '000000')
            color = f'<w:color w:val="{color_val}"/>' if color_val != '000000' else ''
            size = r.get('size', 21)
            
            if r.get('code'):
                font = '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>'
                color = '<w:color w:val="C7254E"/>'
                shd = '<w:shd w:val="clear" w:color="auto" w:fill="F9F2F4"/>'
            else:
                font = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>'
                shd = ''
                
            r_xml += f'''<w:r>
                <w:rPr>{font}{bold}{italic}{underline}{color}{shd}<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr>
                <w:t xml:space="preserve">{escape_xml(text)}</w:t>
            </w:r>'''
            
    return f'<w:p>{p_pr}{r_xml}</w:p>'

def make_table(headers, rows, widths=None):
    if not widths:
        col_w = int(9360 / len(headers))
        widths = [col_w] * len(headers)
        
    xml = f'''<w:tbl>
        <w:tblPr>
            <w:tblW w:w="9360" w:type="dxa"/>
            <w:jc w:val="center"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="B0C4DE"/>
                <w:left w:val="single" w:sz="6" w:space="0" w:color="B0C4DE"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="B0C4DE"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="B0C4DE"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D3D3D3"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D3D3D3"/>
            </w:tblBorders>
            <w:tblCellMar>
                <w:top w:w="80" w:type="dxa"/>
                <w:left w:w="120" w:type="dxa"/>
                <w:bottom w:w="80" w:type="dxa"/>
                <w:right w:w="120" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>'''
        
    xml += '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
    for idx, h in enumerate(headers):
        w = widths[idx]
        xml += f'''<w:tc>
            <w:tcPr>
                <w:tcW w:w="{w}" w:type="dxa"/>
                <w:shd w:val="clear" w:color="auto" w:fill="EBF1F5"/>
            </w:tcPr>
            <w:p>
                <w:pPr><w:spacing w:before="40" w:after="40"/><w:jc w:val="left"/></w:pPr>
                <w:r>
                    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="1F497D"/></w:rPr>
                    <w:t xml:space="preserve">{escape_xml(h)}</w:t>
                </w:r>
            </w:p>
        </w:tc>'''
    xml += '</w:tr>'
    
    for r_idx, row in enumerate(rows):
        bg = "FAFAFA" if r_idx % 2 == 1 else "FFFFFF"
        xml += '<w:tr>'
        for c_idx, cell in enumerate(row):
            w = widths[c_idx]
            xml += f'''<w:tc>
                <w:tcPr>
                    <w:tcW w:w="{w}" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="{bg}"/>
                </w:tcPr>
                <w:p>
                    <w:pPr><w:spacing w:before="30" w:after="30"/><w:jc w:val="left"/></w:pPr>
                    <w:r>
                        <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>
                        <w:t xml:space="preserve">{escape_xml(cell)}</w:t>
                    </w:r>
                </w:p>
            </w:tc>'''
        xml += '</w:tr>'
        
    xml += '</w:tbl>'
    return xml

def make_title_banner():
    return '''<w:tbl>
        <w:tblPr>
            <w:tblW w:w="9360" w:type="dxa"/>
            <w:jc w:val="center"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="12" w:space="0" w:color="1F497D"/>
                <w:left w:val="single" w:sz="12" w:space="0" w:color="1F497D"/>
                <w:bottom w:val="single" w:sz="12" w:space="0" w:color="1F497D"/>
                <w:right w:val="single" w:sz="12" w:space="0" w:color="1F497D"/>
            </w:tblBorders>
            <w:tblCellMar>
                <w:top w:w="120" w:type="dxa"/>
                <w:left w:w="180" w:type="dxa"/>
                <w:bottom w:w="120" w:type="dxa"/>
                <w:right w:w="180" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>
        <w:tr><w:tc>
            <w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F5F8"/></w:tcPr>
            <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="20"/></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="23"/><w:szCs w:val="23"/><w:color w:val="1F497D"/></w:rPr><w:t>NITTE MEENAKSHI INSTITUTE OF TECHNOLOGY, BENGALURU</w:t></w:r>
            </w:p>
            <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="40"/></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="19"/><w:szCs w:val="19"/><w:color w:val="555555"/></w:rPr><w:t>Department of Computer Science and Business Systems | Academic Year 2025–2026</w:t></w:r>
            </w:p>
            <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="40"/></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="003366"/></w:rPr><w:t>COLLEGE TIMETABLE CONFLICT DETECTION USING GRAPH COLORING</w:t></w:r>
            </w:p>
            <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="20" w:after="20"/></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="19"/><w:szCs w:val="19"/><w:color w:val="333333"/></w:rPr><w:t>Submitted by: </w:t></w:r>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t>Jayashree Agarwal (1NT24CB023), Vinutha L (1NT24CB058), Sanjana Vishwanath Hegde (1NT24CB048)</w:t></w:r>
            </w:p>
            <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="40"/></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="19"/><w:szCs w:val="19"/><w:color w:val="333333"/></w:rPr><w:t>Faculty Guide: </w:t></w:r>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t>Dr. Sudha Y, Assistant Professor, Dept. of CS&amp;BS, NMIT</w:t></w:r>
            </w:p>
        </w:tc></w:tr>
    </w:tbl>'''

def make_code_box_compact(lines):
    xml = '''<w:tbl>
        <w:tblPr>
            <w:tblW w:w="9360" w:type="dxa"/>
            <w:jc w:val="center"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="C0C0C0"/>
                <w:left w:val="single" w:sz="6" w:space="0" w:color="C0C0C0"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="C0C0C0"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="C0C0C0"/>
                <w:insideH w:val="none"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>
            <w:tblCellMar>
                <w:top w:w="100" w:type="dxa"/>
                <w:left w:w="140" w:type="dxa"/>
                <w:bottom w:w="100" w:type="dxa"/>
                <w:right w:w="140" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>
        <w:tr><w:tc>
            <w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8F9FA"/></w:tcPr>'''
            
    for line in lines:
        xml += f'''<w:p>
            <w:pPr><w:spacing w:before="0" w:after="0" w:line="190" w:lineRule="auto"/></w:pPr>
            <w:r>
                <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="222222"/></w:rPr>
                <w:t xml:space="preserve">{escape_xml(line)}</w:t>
            </w:r>
        </w:p>'''
        
    xml += '</w:tc></w:tr></w:tbl>'
    return xml

def make_terminal_box_compact(lines):
    xml = '''<w:tbl>
        <w:tblPr>
            <w:tblW w:w="9360" w:type="dxa"/>
            <w:jc w:val="center"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="8" w:space="0" w:color="1E1E1E"/>
                <w:left w:val="single" w:sz="8" w:space="0" w:color="1E1E1E"/>
                <w:bottom w:val="single" w:sz="8" w:space="0" w:color="1E1E1E"/>
                <w:right w:val="single" w:sz="8" w:space="0" w:color="1E1E1E"/>
                <w:insideH w:val="none"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>
            <w:tblCellMar>
                <w:top w:w="120" w:type="dxa"/>
                <w:left w:w="160" w:type="dxa"/>
                <w:bottom w:w="120" w:type="dxa"/>
                <w:right w:w="160" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>
        <w:tr><w:tc>
            <w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E1E1E"/></w:tcPr>'''
            
    for line in lines:
        color = "D4D4D4"
        if "===" in line or "---" in line:
            color = "569CD6"
        elif "PASSED" in line or "0 Conflicts" in line:
            color = "4EC9B0"
        elif "Slot 1" in line or "Slot 2" in line or "Slot 3" in line:
            color = "CE9178"
        elif "ID" in line or "Registered" in line:
            color = "DCDCAA"
            
        xml += f'''<w:p>
            <w:pPr><w:spacing w:before="0" w:after="0" w:line="200" w:lineRule="auto"/></w:pPr>
            <w:r>
                <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="{color}"/></w:rPr>
                <w:t xml:space="preserve">{escape_xml(line)}</w:t>
            </w:r>
        </w:p>'''
        
    xml += '</w:tc></w:tr></w:tbl>'
    return xml

def make_placeholder_box_compact(title, instruction):
    return f'''<w:tbl>
        <w:tblPr>
            <w:tblW w:w="9360" w:type="dxa"/>
            <w:jc w:val="center"/>
            <w:tblBorders>
                <w:top w:val="dashed" w:sz="12" w:space="0" w:color="007ACC"/>
                <w:left w:val="dashed" w:sz="12" w:space="0" w:color="007ACC"/>
                <w:bottom w:val="dashed" w:sz="12" w:space="0" w:color="007ACC"/>
                <w:right w:val="dashed" w:sz="12" w:space="0" w:color="007ACC"/>
                <w:insideH w:val="none"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>
            <w:tblCellMar>
                <w:top w:w="260" w:type="dxa"/>
                <w:left w:w="200" w:type="dxa"/>
                <w:bottom w:w="260" w:type="dxa"/>
                <w:right w:w="200" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>
        <w:tr><w:tc>
            <w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F0F8FF"/></w:tcPr>
            <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="30"/></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="007ACC"/></w:rPr><w:t xml:space="preserve">{escape_xml(title)}</w:t></w:r>
            </w:p>
            <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="30" w:after="60"/></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:i/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr><w:t xml:space="preserve">{escape_xml(instruction)}</w:t></w:r>
            </w:p>
        </w:tc></w:tr>
    </w:tbl>'''

# 5. Build Content Pages
def p_break():
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

# --- PAGE 2 CONTENT ---
page2_xml = ""
page2_xml += make_title_banner()

page2_xml += make_heading('1. INTRODUCTION', 1)
page2_xml += make_paragraph([
    'Timetable scheduling in academic institutions is a classical combinatorial optimization challenge subject to strict temporal and resource constraints. When students are enrolled in multiple core, elective, or interdisciplinary courses within a semester, administering examinations simultaneously causes unavoidable schedule conflicts. If two distinct courses share even a single registered student, their examinations must be assigned to non-overlapping time slots to prevent logistical deadlocks. Manually curating conflict-free schedules across hundreds of students is error-prone, labor-intensive, and computationally prohibitive.'
])
page2_xml += make_paragraph([
    'Graph theory provides a robust abstraction through ',
    {'text': 'vertex coloring', 'bold': True},
    '. Each examination is modeled as a vertex (',
    {'text': 'V', 'italic': True},
    ') in an undirected graph ',
    {'text': 'G = (V, E)', 'italic': True},
    ', while an edge (',
    {'text': 'E', 'italic': True},
    ') is established between courses that share enrolled students. Discrete examination time periods represent colors. Vertex coloring guarantees that no two adjacent vertices receive the same color, thereby ensuring zero scheduling conflicts while minimizing the total time periods required (approximating the chromatic number ',
    {'text': 'χ(G)', 'italic': True},
    ').'
])

page2_xml += make_heading('2. OBJECTIVE', 1)
page2_xml += make_paragraph([
    'The objective of this project is to implement and analyze an automated examination timetable scheduling system in C++ using the ',
    {'text': 'Greedy Graph Coloring Algorithm', 'bold': True},
    '. The system represents examination courses as vertices, enrollment overlaps as undirected edges, and assigns minimal conflict-free time slots. The solution verifies that all adjacent course pairs satisfy the zero-collision constraint and outputs a formatted schedule table grouping courses under their designated sessions.'
])

page2_xml += make_heading('3. FUNCTIONALITY', 1)
page2_xml += make_paragraph([
    {'text': '1. Registration: ', 'bold': True}, 'Ingests total examination count V along with official course codes and titles.'
])
page2_xml += make_paragraph([
    {'text': '2. Conflict Ingestion: ', 'bold': True}, 'Populates shared student enrollments as undirected edges (u, v) into an adjacency list.'
])
page2_xml += make_paragraph([
    {'text': '3. Greedy Coloring: ', 'bold': True}, 'Assigns Slot 0 to Exam 0. For each subsequent exam u (1 to V-1), marks adjacent neighbors\' slots as unavailable in a boolean lookup vector and allocates the lowest available time slot.'
])
page2_xml += make_paragraph([
    {'text': '4. Integrity Verification: ', 'bold': True}, 'Iterates across all edges (u, v) ∈ E to confirm slot[u] ≠ slot[v], validating zero collisions.'
])
page2_xml += make_paragraph([
    {'text': '5. Timetable Generation: ', 'bold': True}, 'Outputs a clean tabular schedule and reports total examination slots required.'
])

# --- PAGE 3 CONTENT ---
page3_xml = ""
page3_xml += make_heading('4. EFFICIENCY', 1)
page3_xml += make_paragraph([
    'The computational efficiency and resource overhead of the timetable scheduler are summarized below:'
])

eff_headers = ['Metric', 'Complexity', 'Technical Justification']
eff_rows = [
    ['Time Complexity', 'O(V² + E)', 'For each vertex u, traversing adjacent neighbors takes O(deg(u)) time (summing to 2E). Finding the lowest available slot requires scanning at most V slots. Total runtime: O(V² + 2E) = O(V² + E).'],
    ['Space Complexity', 'O(V + E)', 'The adjacency list stores V headers and 2E directed edge nodes. The slot assignment vector and reusable boolean unavailable array each consume O(V) auxiliary space.']
]
page3_xml += make_table(eff_headers, eff_rows, [2000, 2000, 5360])

page3_xml += make_paragraph([
    {'text': 'Advantages & Limitations: ', 'bold': True},
    'Exact chromatic number computation is NP-hard. The greedy heuristic runs in polynomial time O(V² + E), executing in milliseconds for instant institutional timetabling. While the greedy method guarantees an upper bound of at most Δ(G) + 1 colors (where Δ is max degree), it may allocate slightly more slots than the absolute theoretical minimum depending on vertex ordering.'
], before=100)

page3_xml += make_heading('5. CODE QUALITY', 1)
page3_xml += make_paragraph([
    'The implementation follows strict object-oriented design and clean coding principles. The ',
    {'text': 'TimetableScheduler', 'bold': True},
    ' class encapsulates private graph data (',
    {'text': 'adj', 'code': True},
    ', ',
    {'text': 'slot', 'code': True},
    ') away from public scheduling routines. The codebase utilizes modern C++ STL containers (',
    {'text': 'std::vector', 'code': True},
    ', ',
    {'text': 'std::string', 'code': True},
    ', ',
    {'text': 'std::setw', 'code': True},
    ') ensuring automatic memory safety without raw pointers, defensive graph bounds checking, and descriptive identifiers.'
])

page3_xml += make_heading('6. DEBUGGING AND TESTING', 1)
page3_xml += make_paragraph([
    'The scheduler was validated against five distinct graph topologies representing different curriculum structures:'
])

tc_headers = ['Test Case', 'Topology Description', 'Graph Parameters', 'Expected Output', 'Actual Output', 'Status']
tc_rows = [
    ['TC-01', 'Independent Exams (Null Graph)', 'V = 4, E = 0', '1 Slot (All exams in Slot 1)', 'Slot 1 allocated to all', 'PASSED'],
    ['TC-02', 'Disjoint Conflict Pairs', 'V = 4, E = 2 {(0,1), (2,3)}', '2 Slots ({0,2} in 1, {1,3} in 2)', '2 Slots ({0,2} -> 1, {1,3} -> 2)', 'PASSED'],
    ['TC-03', 'Linear Conflict Chain (Path P₄)', 'V = 4, E = 3 {(0,1), (1,2), (2,3)}', '2 Alternating Slots (Bipartite)', 'Slots 1 and 2 alternate', 'PASSED'],
    ['TC-04', 'Mutually Conflicting Clique (K₄)', 'V = 4, E = 6 (Fully connected)', '4 Unique Slots (χ = 4)', 'Slots 1, 2, 3, 4 assigned', 'PASSED'],
    ['TC-05', 'Realistic Semester Schedule', 'V = 6, E = 8 (Cyclic & intersecting)', '3 Slots, 0 Conflict Violations', '3 Slots assigned, 0 violations', 'PASSED']
]
page3_xml += make_table(tc_headers, tc_rows, [1000, 2000, 1600, 1800, 1960, 1000])

page3_xml += make_paragraph([
    {'text': 'Automated Verification Formula: ', 'bold': True},
    'The program verifies that ∀ (u, v) ∈ E ⟹ slot[u] ≠ slot[v]. In all test executions, the function returned 0 detected conflicts.'
], before=100)

# --- PAGE 4 CONTENT ---
page4_xml = ""
page4_xml += make_heading('7. CODING PART (C++ SOURCE CODE)', 1)
page4_xml += make_paragraph([
    'Below is the complete, compilable, and self-contained C++ implementation of the Timetable Conflict Scheduler using the Greedy Graph Coloring Algorithm:'
])

with open('TimetableScheduler_Short.cpp', 'r', encoding='utf-8') as f:
    cpp_lines = [line.rstrip('\r\n') for line in f.readlines()]

page4_xml += make_code_box_compact(cpp_lines)

# --- PAGE 5 CONTENT ---
page5_xml = ""
page5_xml += make_heading('8. SAMPLE SCREENSHOT OF OUTPUT', 1)
page5_xml += make_paragraph([
    'Below is the verbatim terminal console output generated by compiling and executing the C++ program:'
])

terminal_lines = [
    '=========================================================',
    '       COLLEGE EXAMINATION TIMETABLE (GRAPH COLORING)    ',
    '=========================================================',
    'ExamID  Course Name                       Assigned Time Slot',
    '---------------------------------------------------------',
    '0       Design & Analysis of Algorithms   Slot 1',
    '1       Operating Systems                 Slot 2',
    '2       Database Management Systems       Slot 3',
    '3       Discrete Mathematics              Slot 2',
    '4       Computer Organization & Arch.     Slot 1',
    '5       Universal Human Values            Slot 3',
    '---------------------------------------------------------',
    'Total Slots Needed: 3',
    'Conflict Constraint Verification: PASSED (0 Conflicts Detected)',
    '========================================================='
]
page5_xml += make_terminal_box_compact(terminal_lines)

page5_xml += make_paragraph([
    'The box below is designated for inserting the graphical screenshot of the running terminal or IDE console window in Microsoft Word:'
], before=120)

page5_xml += make_placeholder_box_compact(
    'PASTE COMPILED CONSOLE SCREENSHOT HERE',
    'Capture your terminal window displaying the Timetable Schedule and "PASSED (0 Conflicts Detected)" message, then paste it here.'
)

page5_xml += make_heading('9. CONCLUSION', 1)
page5_xml += make_paragraph([
    'The Greedy Graph Coloring Algorithm successfully resolves college examination scheduling conflicts by allocating courses into discrete, non-overlapping time periods. For a 6-course semester curriculum with 8 conflict edges, the algorithm constructed an optimal 3-slot schedule with zero collisions. With polynomial execution time O(V² + E) and compact O(V + E) memory utilization, the solution provides an efficient, scalable, and automated alternative to manual institutional timetable scheduling.'
])

# 6. Assemble Full document.xml (Exactly 5 Pages)
# Page 1: rubric_elements + rubric_section_break
# Page 2: page2_xml + p_break()
# Page 3: page3_xml + p_break()
# Page 4: page4_xml + p_break()
# Page 5: page5_xml + final_sect_pr

full_body = f'''
    {rubric_elements}
    {rubric_section_break}
    {page2_xml}
    {p_break()}
    {page3_xml}
    {p_break()}
    {page4_xml}
    {p_break()}
    {page5_xml}
    {final_sect_pr}
'''

full_document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
{root_tag}
<w:body>
{full_body}
</w:body>
</w:document>'''

with open(os.path.join(build_dir, 'word', 'document.xml'), 'w', encoding='utf-8') as f:
    f.write(full_document_xml)

print('Wrote new word/document.xml! Length:', len(full_document_xml))

# 7. Inject TableGrid and Heading1 into styles.xml
with open('./docx1_extracted/word/styles.xml', 'r', encoding='utf-8') as f:
    styles1 = f.read()

with open(os.path.join(build_dir, 'word', 'styles.xml'), 'r', encoding='utf-8') as f:
    styles2 = f.read()

extra_styles = ""
for sid in ['TableGrid', 'Heading1', 'Heading1Char']:
    m = re.search(rf'<w:style [^>]*w:styleId="{sid}"[^>]*>[\s\S]*?<\/w:style>', styles1)
    if m:
        extra_styles += '\n' + m.group(0)

styles_insert_pos = styles2.rfind('</w:styles>')
new_styles2 = styles2[:styles_insert_pos] + extra_styles + '\n' + styles2[styles_insert_pos:]

with open(os.path.join(build_dir, 'word', 'styles.xml'), 'w', encoding='utf-8') as f:
    f.write(new_styles2)

print('Updated word/styles.xml with missing styles!')

# 8. Package with pure forward slashes into final .docx
final_docx_path = 'College_Timetable_Conflict_Detection_DAA_Report.docx'
if os.path.exists(final_docx_path):
    os.remove(final_docx_path)

with zipfile.ZipFile(final_docx_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(build_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, build_dir).replace('\\', '/')
            zipf.write(full_path, rel_path)

print(f'Successfully built {final_docx_path}! File size: {os.path.getsize(final_docx_path)} bytes')
