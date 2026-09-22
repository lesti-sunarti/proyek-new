async function testAll() {
  const endpoints = [
    { method: "GET", path: "/" },
    { method: "GET", path: "/api/public/stats" },
    { method: "GET", path: "/api/attendance/today" },
    { method: "GET", path: "/api/academic/classes" },
    { method: "GET", path: "/api/academic/subjects" },
    { method: "GET", path: "/api/academic/schedules" },
    { method: "GET", path: "/api/cbt/exams" },
    { method: "GET", path: "/api/spp/bills/student/1" },
    { method: "GET", path: "/api/buku_induk/students" },
    { method: "GET", path: "/api/buku_induk/teachers" },
    { method: "GET", path: "/api/finance/transactions" },
    { method: "GET", path: "/api/finance/summary" },
    { method: "GET", path: "/api/payroll" },
    { method: "GET", path: "/api/blogs" },
    { method: "GET", path: "/api/agenda" },
    { method: "GET", path: "/api/broadcasts" },
    { method: "GET", path: "/api/violations/student/1" },
    { method: "GET", path: "/api/gallery" },
    { method: "GET", path: "/api/alumni" },
    { method: "GET", path: "/api/ppdb" },
    { method: "GET", path: "/api/archives" },
    { method: "GET", path: "/api/elearning/modules" },
    { method: "GET", path: "/api/elearning/tasks" },
    // 4 Modul Baru:
    { method: "GET", path: "/api/erapor/grades?student_id=1&semester=Ganjil&academic_year=2024/2025" },
    { method: "GET", path: "/api/library/books" },
    { method: "GET", path: "/api/library/loans" },
    { method: "GET", path: "/api/extracurriculars" },
    { method: "GET", path: "/api/counseling/sessions" }
  ];

  let passed = 0;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5000${ep.path}`);
      const ok = res.status >= 200 && res.status < 300;
      console.log(`[${ok ? "PASS" : "FAIL"}] ${ep.method} ${ep.path} -> HTTP ${res.status}`);
      if (ok) passed++;
    } catch (err) {
      console.log(`[FAIL] ${ep.method} ${ep.path} -> Error: ${err.message}`);
    }
  }

  // Test scan QR attendance
  try {
    const scanRes = await fetch("http://localhost:5000/api/attendance/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qr_string: "SISWA-0061234561",
        type: "masuk",
        method: "self_scan"
      })
    });
    const scanData = await scanRes.json();
    console.log(`[${scanRes.ok ? "PASS" : "FAIL"}] POST /api/attendance/scan -> HTTP ${scanRes.status}`);
    if (scanRes.ok) passed++;
  } catch (err) {
    console.log(`[FAIL] POST /api/attendance/scan -> Error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`FINAL VERIFICATION: ${passed}/${endpoints.length + 1} endpoints PASSED.`);
  console.log(`========================================`);
}
testAll();
