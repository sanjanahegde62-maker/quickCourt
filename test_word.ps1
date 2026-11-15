try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    Write-Output "Word COM object is available!"
    $doc = $word.Documents.Open("c:\Users\sanja\OneDrive\Desktop\quickCourt-clone\College_Timetable_Conflict_Detection_DAA_Report.docx")
    Write-Output "Word opened the document successfully! Page count: $($doc.ComputeStatistics(2))"
    $doc.Close()
    $word.Quit()
} catch {
    Write-Output "Word COM error: $($_.Exception.Message)"
}
