async function testCbt() {
  // 1. Get Exam 1
  const examRes = await fetch("http://localhost:5000/api/cbt/exams/1");
  const exam = await examRes.json();
  console.log("Exam 1 Title:", exam.title, "- Questions count:", exam.questions?.length);

  // 2. Report Anti-cheat Violation
  const vioRes = await fetch("http://localhost:5000/api/cbt/exams/1/violation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_id: 1,
      student_name: "Aditya Pratama Putra",
      violation_type: "Pindah tab / minimize window",
      timestamp: new Date().toISOString()
    })
  });
  const vioData = await vioRes.json();
  console.log("Violation recorded:", vioData);
}
testCbt();
