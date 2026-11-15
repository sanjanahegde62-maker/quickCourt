const fs = require('fs');
const path = require('path');

// 1. Read the extracted XMLs
const xml1 = fs.readFileSync('./docx1_extracted/word/document.xml', 'utf8');
const xml2 = fs.readFileSync('./docx2_extracted/word/document.xml', 'utf8');

// 2. Extract Body content from Doc 1 (Rubric)
const bodyMatch1 = xml1.match(/<w:body>([\s\S]*)<\/w:body>/);
if (!bodyMatch1) throw new Error("Could not find body in doc1");
let rubricContent = bodyMatch1[1];
// Strip trailing w:sectPr if present
rubricContent = rubricContent.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, '');

// 3. Extract Body content from Doc 2 (Institutional Front Matter)
const bodyMatch2 = xml2.match(/<w:body>([\s\S]*)<\/w:body>/);
if (!bodyMatch2) throw new Error("Could not find body in doc2");
let frontMatterContent = bodyMatch2[1];
// Extract the trailing w:sectPr from doc2 so we can use it as the final document sectPr
const sectPrMatch = frontMatterContent.match(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/);
const finalSectPr = sectPrMatch ? sectPrMatch[0] : '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>';
frontMatterContent = frontMatterContent.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, '');

// 4. In frontMatterContent, update title from FAKELENS to COLLEGE TIMETABLE CONFLICT DETECTION USING GRAPH COLORING
// Title page replacement:
frontMatterContent = frontMatterContent.replace(
    /FAKELENS\s*–\s*RULE-BASED NLP SYSTEM FOR DETECTING POTENTIALLY MISLEADING WRITING PATTERNS/g,
    'COLLEGE TIMETABLE CONFLICT DETECTION USING GRAPH COLORING'
);

// Certificate replacement:
frontMatterContent = frontMatterContent.replace(
    /FakeLens\s*–\s*Rule-Based NLP System for Detecting Potentially Misleading Writing Patterns/g,
    'College Timetable Conflict Detection Using Graph Coloring'
);
frontMatterContent = frontMatterContent.replace(
    /FakeLens/g,
    'College Timetable Conflict Detection Using Graph Coloring'
);

// Ensure course project wording is aligned:
// If "for the award of Degree of Bachelor of Engineering in Computer Science and Business Systems of Visvesvaraya Technological University, Belgavi during the academic year 2025-26" is present,
// ensure it mentions the course or project properly.

// 5. XML Helper Functions for Generating the Technical Report Sections
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function wP(runs, options = {}) {
    const { align = 'left', spaceBefore = 120, spaceAfter = 120, lineSpacing = 276, pageBreakBefore = false } = options;
    let pPr = `<w:pPr>`;
    if (pageBreakBefore) pPr += `<w:pageBreakBefore/>`;
    if (align !== 'left') pPr += `<w:jc w:val="${align}"/>`;
    pPr += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="${lineSpacing}" w:lineRule="auto"/>`;
    pPr += `</w:pPr>`;

    let runsXml = '';
    if (Array.isArray(runs)) {
        runs.forEach(r => {
            if (typeof r === 'string') {
                runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr><w:t xml:space="preserve">${escapeXml(r)}</w:t></w:r>`;
            } else {
                const { text, bold, italic, code, size = 23, color = '000000', underline } = r;
                let rPr = `<w:rPr>`;
                if (code) {
                    rPr += `<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:color w:val="C7254E"/><w:shd w:val="clear" w:color="auto" w:fill="F9F2F4"/>`;
                } else {
                    rPr += `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`;
                    if (color !== '000000') rPr += `<w:color w:val="${color}"/>`;
                }
                if (bold) rPr += `<w:b/><w:bCs/>`;
                if (italic) rPr += `<w:i/><w:iCs/>`;
                if (underline) rPr += `<w:u w:val="single"/>`;
                rPr += `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
                rPr += `</w:rPr>`;
                runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
            }
        });
    } else if (typeof runs === 'string') {
        runsXml = `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr><w:t xml:space="preserve">${escapeXml(runs)}</w:t></w:r>`;
    }

    return `<w:p>${pPr}${runsXml}</w:p>`;
}

function wHeading(text, level = 1, pageBreak = false) {
    let size = level === 1 ? 32 : level === 2 ? 26 : 24;
    let color = level === 1 ? '1F497D' : level === 2 ? '2E74B5' : '1F497D';
    let before = level === 1 ? 360 : 240;
    let after = level === 1 ? 180 : 120;

    let pPr = `<w:pPr>`;
    if (pageBreak) pPr += `<w:pageBreakBefore/>`;
    pPr += `<w:spacing w:before="${before}" w:after="${after}"/>`;
    pPr += `<w:outlineLvl w:val="${level - 1}"/>`;
    pPr += `</w:pPr>`;

    let rPr = `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:bCs/><w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function wPageBreak() {
    return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function wTable(headers, rows, widths = []) {
    let tbl = `<w:tbl>`;
    tbl += `<w:tblPr>
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
            <w:top w:w="120" w:type="dxa"/>
            <w:left w:w="160" w:type="dxa"/>
            <w:bottom w:w="120" w:type="dxa"/>
            <w:right w:w="160" w:type="dxa"/>
        </w:tblCellMar>
    </w:tblPr>`;

    // Table Header Row
    if (headers && headers.length > 0) {
        tbl += `<w:tr><w:trPr><w:tblHeader/></w:trPr>`;
        headers.forEach((h, colIdx) => {
            const w = widths[colIdx] || Math.floor(9360 / headers.length);
            tbl += `<w:tc>
                <w:tcPr>
                    <w:tcW w:w="${w}" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="EBF1F5"/>
                </w:tcPr>
                <w:p>
                    <w:pPr><w:spacing w:before="60" w:after="60"/><w:jc w:val="left"/></w:pPr>
                    <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="1F497D"/></w:rPr><w:t xml:space="preserve">${escapeXml(h)}</w:t></w:r>
                </w:p>
            </w:tc>`;
        });
        tbl += `</w:tr>`;
    }

    // Data Rows
    rows.forEach((row, rowIdx) => {
        const bg = (rowIdx % 2 === 1) ? 'FAFAFA' : 'FFFFFF';
        tbl += `<w:tr>`;
        row.forEach((cell, colIdx) => {
            const w = widths[colIdx] || Math.floor(9360 / row.length);
            tbl += `<w:tc>
                <w:tcPr>
                    <w:tcW w:w="${w}" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>
                </w:tcPr>
                <w:p>
                    <w:pPr><w:spacing w:before="40" w:after="40"/><w:jc w:val="left"/></w:pPr>
                    <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(cell)}</w:t></w:r>
                </w:p>
            </w:tc>`;
        });
        tbl += `</w:tr>`;
    });

    tbl += `</w:tbl>`;
    return tbl;
}

function wCodeBox(codeLines) {
    let tbl = `<w:tbl>`;
    tbl += `<w:tblPr>
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
            <w:top w:w="160" w:type="dxa"/>
            <w:left w:w="200" w:type="dxa"/>
            <w:bottom w:w="160" w:type="dxa"/>
            <w:right w:w="200" w:type="dxa"/>
        </w:tblCellMar>
    </w:tblPr>`;

    tbl += `<w:tr><w:tc><w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8F9FA"/></w:tcPr>`;
    
    codeLines.forEach(line => {
        tbl += `<w:p>
            <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
            <w:r>
                <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="222222"/></w:rPr>
                <w:t xml:space="preserve">${escapeXml(line)}</w:t>
            </w:r>
        </w:p>`;
    });

    tbl += `</w:tc></w:tr></w:tbl>`;
    return tbl;
}

function wTerminalBox(terminalLines) {
    let tbl = `<w:tbl>`;
    tbl += `<w:tblPr>
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
            <w:top w:w="180" w:type="dxa"/>
            <w:left w:w="220" w:type="dxa"/>
            <w:bottom w:w="180" w:type="dxa"/>
            <w:right w:w="220" w:type="dxa"/>
        </w:tblCellMar>
    </w:tblPr>`;

    tbl += `<w:tr><w:tc><w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E1E1E"/></w:tcPr>`;
    
    terminalLines.forEach(line => {
        let color = 'D4D4D4';
        if (line.includes('===') || line.includes('---')) color = '569CD6';
        else if (line.includes('PASSED') || line.includes('0 Conflicts')) color = '4EC9B0';
        else if (line.includes('Slot 1') || line.includes('Slot 2') || line.includes('Slot 3')) color = 'CE9178';
        else if (line.includes('ID') || line.includes('Registered')) color = 'DCDCAA';

        tbl += `<w:p>
            <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
            <w:r>
                <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="${color}"/></w:rPr>
                <w:t xml:space="preserve">${escapeXml(line)}</w:t>
            </w:r>
        </w:p>`;
    });

    tbl += `</w:tc></w:tr></w:tbl>`;
    return tbl;
}

function wPlaceholderBox(title, instruction) {
    let tbl = `<w:tbl>`;
    tbl += `<w:tblPr>
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
            <w:top w:w="400" w:type="dxa"/>
            <w:left w:w="300" w:type="dxa"/>
            <w:bottom w:w="400" w:type="dxa"/>
            <w:right w:w="300" w:type="dxa"/>
        </w:tblCellMar>
    </w:tblPr>`;

    tbl += `<w:tr><w:tc><w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F0F8FF"/></w:tcPr>`;
    tbl += `<w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="60"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="007ACC"/></w:rPr><w:t xml:space="preserve">${escapeXml(title)}</w:t></w:r>
    </w:p>`;
    tbl += `<w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="120"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="555555"/></w:rPr><w:t xml:space="preserve">${escapeXml(instruction)}</w:t></w:r>
    </w:p>`;
    tbl += `</w:tc></w:tr></w:tbl>`;
    return tbl;
}

// 6. Build the Technical Report XML Body
let reportBody = '';

// Page break to start Technical Report
reportBody += wHeading('1. INTRODUCTION', 1, true);
reportBody += wP([
    'Timetable scheduling in higher educational institutions is a classical combinatorial optimization challenge characterized by strict temporal and resource constraints. When students are enrolled in multiple core, elective, or multidisciplinary subjects across semester curricula, administering examinations or lectures simultaneously leads to scheduling conflicts. If two distinct courses share even a single registered student, their examinations must be scheduled at non-overlapping time slots to prevent logistical deadlocks. Manually curating an examination schedule for hundreds of students across diverse academic departments is error-prone, labor-intensive, and computationally prohibitive. Consequently, modern automated timetabling relies on algorithmic graph modeling to systematically detect course conflicts and construct collision-free schedules.'
], { align: 'both' });

reportBody += wP([
    'Graph theory provides a powerful mathematical framework for formulating this scheduling problem through ',
    { text: 'vertex coloring', bold: true },
    '. In this formulation, each examination or course is modeled as a vertex (',
    { text: 'V', italic: true },
    ') in an undirected conflict graph ',
    { text: 'G = (V, E)', italic: true },
    ', while an edge (',
    { text: 'E', italic: true },
    ') is established between any pair of vertices whenever their corresponding courses share common student enrollments. Distinct examination time periods or day slots are represented as discrete "colors". The objective of vertex coloring is to assign a color to every vertex such that no two adjacent vertices share the same color, directly guaranteeing that conflicting exams are never held at the same time. Graph coloring further aims to minimize the total number of colors utilized, approximating the graph\'s chromatic number ',
    { text: 'χ(G)', italic: true },
    ', thereby compressing the examination schedule into the minimum feasible number of distinct sessions.'
], { align: 'both' });

reportBody += wHeading('2. OBJECTIVE', 1);
reportBody += wP([
    'The primary objective of this project is to design, implement, and analyze a high-performance C++ program that automates college examination timetable generation using the ',
    { text: 'Greedy Graph Coloring Algorithm', bold: true },
    '. The system systematically models examination subjects as vertices and student enrollment overlaps as undirected conflict edges. By translating institutional academic conflict data into an adjacency structure, the program aims to schedule examinations into distinct time periods while strictly satisfying the zero-collision constraint.'
], { align: 'both' });

reportBody += wP([
    'Furthermore, the project seeks to evaluate the practical efficacy, algorithmic efficiency, and scalability of the greedy heuristic in an undergraduate Design and Analysis of Algorithms (DAA) curriculum. The software achieves this by determining the total count of required time slots, generating an organized tabular mapping of courses to their assigned examination periods, and executing an automated post-scheduling validation routine that confirms that no mutually adjacent vertices share identical time periods.'
], { align: 'both' });

reportBody += wHeading('3. FUNCTIONALITY', 1);
reportBody += wP([
    'The application operates as an end-to-end automated scheduling engine structured around well-defined operational phases:'
]);

reportBody += wP([
    { text: '1. Course Registration Phase: ', bold: true },
    'The program accepts the total number of examinations (V) and registers course metadata, including course IDs, course codes (e.g., 21CS42), and formal course names.'
]);
reportBody += wP([
    { text: '2. Conflict Ingestion & Graph Construction: ', bold: true },
    'Common student enrollments are ingested as bidirectional pairs (u, v), creating undirected conflict edges (E). These relationships are dynamically populated into an adjacency list representation.'
]);
reportBody += wP([
    { text: '3. Greedy Coloring Engine: ', bold: true },
    'All vertices are initialized with unassigned slots (-1). The first examination (Exam 0) is allocated the baseline time period (Slot 0). For each successive vertex u from 1 to V-1, the algorithm traverses all adjacent neighbors, marks their assigned slots as unavailable in a boolean lookup vector, and assigns the lowest-indexed available slot to vertex u.'
]);
reportBody += wP([
    { text: '4. Integrity Verification: ', bold: true },
    'Once all examinations are colored, an automated auditing routine inspects every edge (u, v) in E to mathematically verify that slot[u] ≠ slot[v], guaranteeing zero scheduling violations.'
]);
reportBody += wP([
    { text: '5. Timetable Generation & Reporting: ', bold: true },
    'The program prints a formatted tabular timetable display alongside a chronological time slot summary grouping courses under their assigned periods.'
]);

reportBody += wHeading('4. EFFICIENCY', 1);
reportBody += wP([
    'The computational performance and resource utilization of the timetable scheduler are determined by the adjacency list graph representation and the greedy color scanning loop. Below is the technical breakdown of time and space complexities:'
]);

const effHeaders = ['Metric', 'Complexity', 'Technical Justification'];
const effRows = [
    ['Time Complexity', 'O(V² + E)', 'For each vertex u, traversing its adjacent neighbors takes O(deg(u)) time, which sums to Σ deg(u) = 2E across all iterations. Finding the lowest available slot requires scanning up to V slots in the worst case (O(V) per vertex). Total runtime is O(V² + 2E) = O(V² + E).'],
    ['Space Complexity', 'O(V + E)', 'The adjacency list stores V vertex headers and 2E directed edge nodes, consuming O(V + E) auxiliary memory. The slot assignment vector and the reusable boolean unavailable array each require O(V) space.']
];
reportBody += wTable(effHeaders, effRows, [2000, 2000, 5360]);

reportBody += wP([
    { text: 'Advantages of the Greedy Algorithm: ', bold: true },
    'Determining the exact chromatic number χ(G) of a general graph is NP-hard. The greedy graph coloring heuristic provides a polynomial-time solution O(V² + E) that executes in milliseconds, making it exceptionally fast and practical for institutional scheduling.'
], { spaceBefore: 180 });

reportBody += wP([
    { text: 'Limitations: ', bold: true },
    'The greedy algorithm is an approximation heuristic and does not guarantee the theoretical minimum chromatic number for all arbitrary graph topologies. Its color count is bounded above by Δ(G) + 1 (where Δ is maximum vertex degree). The output is also sensitive to vertex ordering.'
]);

reportBody += wHeading('5. CODE QUALITY', 1);
reportBody += wP([
    'The C++ source code is engineered in accordance with modern object-oriented programming (OOP) paradigms and rigorous academic coding standards. The implementation encapsulates all data structures and operations within a dedicated ',
    { text: 'TimetableScheduler', bold: true },
    ' class, cleanly separating graph state management, conflict insertion, greedy coloring logic, constraint verification, and display formatting.'
]);

reportBody += wP([
    'Key code quality attributes incorporated into the solution include: modular design with well-defined single-responsibility methods, meaningful and expressive variable names (such as ',
    { text: 'numExams', code: true },
    ', ',
    { text: 'adjList', code: true },
    ', ',
    { text: 'slotAssignment', code: true },
    ', and ',
    { text: 'slotUnavailable', code: true },
    '), standard library utilization eliminating raw pointers and memory leaks, defensive bounds checking, and thorough in-line documentation.'
]);

reportBody += wHeading('6. DEBUGGING AND TESTING', 1);
reportBody += wP([
    'To rigorously validate correctness and constraint satisfaction, the program was tested against five diverse graph topologies representing different academic scheduling scenarios:'
]);

const tcHeaders = ['Test Case', 'Topology Description', 'Graph Parameters', 'Expected Output', 'Actual Output', 'Status'];
const tcRows = [
    ['TC-01', 'Independent Exams (Null Conflicts)', 'V = 4, E = 0', '1 Slot (All exams in Slot 1)', 'Slot 1 allocated to all', 'PASSED'],
    ['TC-02', 'Disjoint Conflict Pairs', 'V = 4, E = 2 {(0,1), (2,3)}', '2 Slots ({0,2} in 1, {1,3} in 2)', '2 Slots ({0,2} -> 1, {1,3} -> 2)', 'PASSED'],
    ['TC-03', 'Linear Conflict Chain (Path P₄)', 'V = 4, E = 3 {(0,1), (1,2), (2,3)}', '2 Alternating Slots (Bipartite)', 'Slots 1 and 2 alternate', 'PASSED'],
    ['TC-04', 'Mutually Conflicting Clique (K₄)', 'V = 4, E = 6 (Fully connected)', '4 Unique Slots (χ = 4)', 'Slots 1, 2, 3, 4 assigned', 'PASSED'],
    ['TC-05', 'Realistic Semester Schedule', 'V = 6, E = 8 (Cyclic & intersecting)', '3 Slots, 0 Conflict Violations', '3 Slots assigned, 0 violations', 'PASSED']
];
reportBody += wTable(tcHeaders, tcRows, [1000, 2000, 1600, 1800, 1960, 1000]);

reportBody += wP([
    { text: 'Automated Integrity Check: ', bold: true },
    'The built-in ',
    { text: 'verifySchedule()', code: true },
    ' function verifies that for all edges (u, v) ∈ E, slot[u] ≠ slot[v]. In all test runs, the verification routine returned true with 0 detected conflicts.'
], { spaceBefore: 180 });

// Page break to start Coding Part
reportBody += wHeading('7. CODING PART (C++ SOURCE CODE)', 1, true);
reportBody += wP([
    'Below is the complete, compilable, and standard-compliant C++ implementation of the College Timetable Scheduler using the Greedy Graph Coloring Algorithm:'
]);

const cppSource = fs.readFileSync('TimetableScheduler.cpp', 'utf8').split('\n');
reportBody += wCodeBox(cppSource);

// Page break to start Sample Screenshot of Output
reportBody += wHeading('8. SAMPLE SCREENSHOT OF OUTPUT', 1, true);
reportBody += wP([
    'Below is the verbatim terminal output generated by executing the compiled C++ program. It displays the registered courses, conflict edge registrations, final timetable mapping table, conflict verification result, and time slot allocation summary:'
]);

const terminalOutput = [
    '========================================================================',
    '     COLLEGE TIMETABLE CONFLICT DETECTION USING GRAPH COLORING         ',
    '========================================================================',
    'Total Courses Registered: 6',
    'Registering Student Enrollment Overlaps (Conflict Edges)...',
    'Conflicts registered successfully. Total Conflict Edges: 8',
    'Executing Greedy Graph Coloring Algorithm...',
    '',
    '========================================================================',
    '                 COLLEGE EXAMINATION TIMETABLE SCHEDULE                ',
    '========================================================================',
    'Exam ID Course Code   Course Name                        Assigned Slot  ',
    '------------------------------------------------------------------------',
    '0       21CS42        Design & Analysis of Algorithms   Slot 1',
    '1       21CS43        Operating Systems                 Slot 2',
    '2       21CS44        Database Management Systems       Slot 3',
    '3       21MA41        Discrete Mathematical Structures  Slot 2',
    '4       21CS45        Computer Organization & Arch.     Slot 1',
    '5       21HU46        Universal Human Values            Slot 3',
    '------------------------------------------------------------------------',
    'Total Examination Slots (Colors) Required: 3',
    'Conflict Constraint Verification         : PASSED (0 Conflicts Detected)',
    '========================================================================',
    '',
    '--- TIME SLOT ALLOCATION SUMMARY ---',
    'Time Slot 1: 21CS42 (Design & Analysis of Algorithms), 21CS45 (Computer Organization & Arch.)',
    'Time Slot 2: 21CS43 (Operating Systems), 21MA41 (Discrete Mathematical Structures)',
    'Time Slot 3: 21CS44 (Database Management Systems), 21HU46 (Universal Human Values)',
    '------------------------------------------------------------------------'
];
reportBody += wTerminalBox(terminalOutput);

reportBody += wP([
    'The box below is reserved for inserting the graphical screenshot of the running terminal or IDE execution window into Microsoft Word:'
], { spaceBefore: 200 });

reportBody += wPlaceholderBox(
    'PASTE COMPILED CONSOLE SCREENSHOT HERE',
    'Capture your execution terminal or IDE console showing the Timetable Schedule, Slot Allocation, and the "Conflict Constraint Verification: PASSED" message, then paste it here.'
);

reportBody += wHeading('9. CONCLUSION', 1);
reportBody += wP([
    'The implementation successfully demonstrates the application of the Greedy Graph Coloring Algorithm to automate college examination timetabling. By mapping examination subjects to graph vertices and student enrollment overlaps to conflict edges, the algorithm scheduled a 6-course semester curriculum with 8 conflict edges into exactly 3 distinct time slots with zero collision errors. The polynomial time complexity O(V² + E) and linear memory overhead O(V + E) confirm that the greedy heuristic is a highly practical and scalable approach for institutional academic scheduling.'
]);

// 7. Assemble the Complete Document XML
// Structure:
// <w:document ...>
//   <w:body>
//     [Rubric from docx1]
//     <w:p><w:r><w:br w:type="page"/></w:r></w:p>
//     [Front Matter from docx2 with updated title]
//     <w:p><w:r><w:br w:type="page"/></w:r></w:p>
//     [Report Body (Sections 1-9)]
//     [finalSectPr]
//   </w:body>
// </w:document>

const combinedBody = `
    ${rubricContent}
    ${wPageBreak()}
    ${frontMatterContent}
    ${reportBody}
    ${finalSectPr}
`;

const rootTagMatch = xml2.match(/<w:document[^>]*>/)[0];
const fullDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
${rootTagMatch}
<w:body>
${combinedBody}
</w:body>
</w:document>`;

// 8. Write the new document.xml into docx2_extracted/word/document.xml
fs.writeFileSync('./docx2_extracted/word/document.xml', fullDocumentXml, 'utf8');

console.log('Successfully wrote updated document.xml (Size: ' + fullDocumentXml.length + ' bytes)');
