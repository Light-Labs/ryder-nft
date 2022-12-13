import { readFileSync, writeFileSync } from "fs";

async function writeCode() {
  const addresses = readFileSync("scripts/add-3.txt").toString().split("\n");
  console.log(addresses.length);
  let code = "";
  for (let i = 0; i <= addresses.length / 200; i++) {
    code += `(define-constant list-${i} (list 
${addresses
  .slice(i * 200, (i + 1) * 200)
  .map((a) => {
    const [address] = a.split(",");
    return `  '${address}\n`;
  })
  .join("")}))
      
`;
  }
  code += "\n\n";
  for (let i = 0; i <= addresses.length / 200; i++) {
    code += `(define-public (add-allow-list-${i}) 
    (contract-call?
     .ryder-mint set-allow-listed-many list-${i}))

`;
  }
  writeFileSync("scripts/code-3.clar", code);
}

writeCode();
