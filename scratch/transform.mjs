import fs from "fs";
import path from "path";

const pagesDir = "c:/Users/A/Documents/PROYEK/src/pages";
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".jsx") && f !== "PublicPortal.jsx");

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // 1. Inputs & Textareas
  content = content.replace(/bg-slate-950\s+border\s+border-slate-800\s+rounded-([a-z0-9]+)\s+px-([0-9.]+)\s+py-([0-9.]+)\s+text-white/g, "bg-white border border-slate-300 rounded-$1 px-$2 py-$3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500");
  content = content.replace(/bg-slate-950\s+border\s+border-slate-800\s+text-white/g, "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400");
  content = content.replace(/bg-slate-900\s+border\s+border-slate-700\s+text-white/g, "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400");

  // 2. Background surfaces
  content = content.replace(/bg-slate-950\/[0-9]+/g, "bg-slate-100");
  content = content.replace(/bg-slate-950/g, "bg-slate-50");
  content = content.replace(/bg-slate-900\/[0-9]+/g, "bg-white");
  content = content.replace(/bg-slate-900/g, "bg-white");
  content = content.replace(/bg-slate-850/g, "bg-slate-50");
  content = content.replace(/bg-slate-800\/[0-9]+/g, "bg-slate-50");
  
  // 3. Borders & Dividers
  content = content.replace(/border-slate-800\/[0-9]+/g, "border-slate-200");
  content = content.replace(/border-slate-800/g, "border-slate-200");
  content = content.replace(/border-slate-700\/[0-9]+/g, "border-slate-200");
  content = content.replace(/border-slate-700/g, "border-slate-200");
  content = content.replace(/divide-slate-800/g, "divide-slate-200");
  content = content.replace(/divide-slate-700/g, "divide-slate-200");

  // 4. Hovers
  content = content.replace(/hover:bg-slate-800\/[0-9]+/g, "hover:bg-slate-50");
  content = content.replace(/hover:bg-slate-800/g, "hover:bg-slate-100");
  content = content.replace(/hover:bg-slate-700/g, "hover:bg-slate-100");
  content = content.replace(/hover:border-slate-700/g, "hover:border-slate-300");

  // 5. Remaining standalone bg-slate-800
  content = content.replace(/bg-slate-800/g, "bg-slate-100");

  // 6. Text color shifts (except when button is primary colored)
  content = content.replace(/text-slate-100/g, "text-slate-800");
  content = content.replace(/text-slate-200/g, "text-slate-700");
  content = content.replace(/text-slate-300/g, "text-slate-600");
  content = content.replace(/text-slate-400/g, "text-slate-500");

  // 7. Headings text-white to text-slate-900
  content = content.replace(/font-extrabold text-white/g, "font-extrabold text-slate-900");
  content = content.replace(/font-black text-white/g, "font-black text-slate-900");
  content = content.replace(/font-bold text-white/g, "font-bold text-slate-900");
  content = content.replace(/font-semibold text-white/g, "font-semibold text-slate-900");
  content = content.replace(/text-lg font-bold text-white/g, "text-lg font-bold text-slate-900");
  content = content.replace(/text-xl font-bold text-white/g, "text-xl font-bold text-slate-900");
  content = content.replace(/text-2xl font-bold text-white/g, "text-2xl font-bold text-slate-900");
  content = content.replace(/text-3xl font-bold text-white/g, "text-3xl font-bold text-slate-900");
  content = content.replace(/text-sm font-bold text-white/g, "text-sm font-bold text-slate-900");
  content = content.replace(/text-xs font-bold text-white/g, "text-xs font-bold text-slate-900");
  content = content.replace(/text-white tracking-tight/g, "text-slate-900 tracking-tight");

  // 8. Placeholders
  content = content.replace(/placeholder-slate-500/g, "placeholder:text-slate-400");
  content = content.replace(/placeholder-slate-400/g, "placeholder:text-slate-400");

  // 9. Modals backdrop
  content = content.replace(/bg-black\/70/g, "bg-slate-900/40 backdrop-blur-xs");
  content = content.replace(/bg-black\/60/g, "bg-slate-900/40 backdrop-blur-xs");

  // 10. Secondary button styling: text-slate-800 with hover
  content = content.replace(/bg-slate-100 hover:bg-slate-100 text-white/g, "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200");
  content = content.replace(/bg-slate-100 text-white/g, "bg-slate-100 text-slate-800 border border-slate-200");

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Transformed: ${file}`);
}
console.log("All pages successfully transformed!");
