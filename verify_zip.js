const fs = require('fs');

console.log('Docx file exists:', fs.existsSync('College_Timetable_Conflict_Detection_DAA_Report.docx'));
const stat = fs.statSync('College_Timetable_Conflict_Detection_DAA_Report.docx');
console.log('File size:', stat.size);
