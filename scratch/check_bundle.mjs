import fs from "fs";
import path from "path";

const html = fs.readFileSync("c:/Users/A/Documents/PROYEK/dist/index.html", "utf8");
console.log("HTML:", html);

const jsMatch = html.match(/src="([^"]+)"/);
if (jsMatch) {
  const jsPath = path.join("c:/Users/A/Documents/PROYEK/dist", jsMatch[1]);
  console.log("JS file path:", jsPath);
  if (fs.existsSync(jsPath)) {
    const jsContent = fs.readFileSync(jsPath, "utf8");
    console.log("JS file size:", jsContent.length, "bytes");
    console.log("First 200 chars:", jsContent.slice(0, 200));
  } else {
    console.error("JS file DOES NOT EXIST!");
  }
}
