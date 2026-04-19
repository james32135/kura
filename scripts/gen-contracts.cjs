const fs = require("fs");
const abis = JSON.parse(fs.readFileSync("frontend/src/config/abis.json", "utf8"));

const ZERO = "0x0000000000000000000000000000000000000000";

let ts = "";
ts += "export const CHAIN_ID = 421614;\n\n";
ts += "// Deployed contract addresses - updated after deployment\n";
ts += `export const KURA_CIRCLE_ADDRESS = "${ZERO}" as const;\n`;
ts += `export const KURA_BID_ADDRESS = "${ZERO}" as const;\n`;
ts += `export const KURA_CREDIT_ADDRESS = "${ZERO}" as const;\n\n`;
ts += "export const KURA_CIRCLE_ABI = " + JSON.stringify(abis.circle, null, 2) + " as const;\n\n";
ts += "export const KURA_BID_ABI = " + JSON.stringify(abis.bid, null, 2) + " as const;\n\n";
ts += "export const KURA_CREDIT_ABI = " + JSON.stringify(abis.credit, null, 2) + " as const;\n";

fs.writeFileSync("frontend/src/config/contracts.ts", ts);
console.log("contracts.ts generated");
