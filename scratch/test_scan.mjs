async function testScan() {
  const scanRes = await fetch("http://localhost:5000/api/attendance/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      qr_string: "SISWA-0061234561",
      type: "masuk",
      method: "self_scan"
    })
  });
  const data = await scanRes.json();
  console.log("Status:", scanRes.status);
  console.log("Response:", JSON.stringify(data, null, 2));
}
testScan();
