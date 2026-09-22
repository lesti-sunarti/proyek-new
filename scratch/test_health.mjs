async function checkHealth() {
  for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
    try {
      console.log(`Trying http://${host}:5000 ...`);
      const res = await fetch(`http://${host}:5000`);
      console.log(`  -> SUCCESS! Status: ${res.status}`);
      const html = await res.text();
      console.log(`  -> HTML length: ${html.length}`);
      console.log(`  -> Contains root: ${html.includes('id="root"')}`);
      
      const match = html.match(/src="(\/assets\/[^"]+)"/);
      if (match) {
        const assetUrl = `http://${host}:5000${match[1]}`;
        const aRes = await fetch(assetUrl);
        console.log(`  -> Asset ${match[1]} status: ${aRes.status}`);
      }
      return;
    } catch (err) {
      console.log(`  -> Failed on ${host}: ${err.message}`);
    }
  }
}
checkHealth();
