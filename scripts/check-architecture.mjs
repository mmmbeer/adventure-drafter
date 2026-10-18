import { readdir, readFile } from "node:fs/promises";
const files = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await scan(path);
    else if (/\.(tsx?|[cm]?js|css)$/.test(entry.name)) files.push(path);
  }
}
for (const directory of ["src", "tests", "scripts"]) await scan(directory);
for (const entry of await readdir("."))
  if (/\.(tsx?|[cm]?js)$/.test(entry)) files.push(entry);
let failed = false;
for (const path of files) {
  const content = await readFile(path, "utf8");
  const lines = content.replace(/\n$/, "").split("\n").length;
  if (lines > 500) {
    console.error(`${path}: ${lines} lines exceeds the 500-line limit`);
    failed = true;
  }
  if (
    /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(content) &&
    path.startsWith("src/")
  ) {
    console.error(`${path}: browser dialog call is prohibited`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else
  console.log(`Architecture checks passed for ${files.length} source files.`);
