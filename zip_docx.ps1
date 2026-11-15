Add-Type -AssemblyName System.IO.Compression.FileSystem
$dest = "c:\Users\sanja\OneDrive\Desktop\quickCourt-clone\College_Timetable_Conflict_Detection_DAA_Report.docx"
if (Test-Path $dest) {
    Remove-Item $dest -Force
}
[System.IO.Compression.ZipFile]::CreateFromDirectory("./docx2_extracted", $dest)
Get-Item $dest | Select-Object Name, Length, LastWriteTime
