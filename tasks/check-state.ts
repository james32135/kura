import { ethers } from "hardhat";

async function main() {
  const kuraCredit = await ethers.getContractAt("KuraCredit", "0x26b1ea9Bb8Aa33086Fa5b4D32EA89b2Da6DD4B14");
  
  const newCircle = "0x6598A3f8BA862e758CaF02Bf8678dE457df192DB";
  const oldCircle = "0x87B7b40e7f2914B3d5b689AAF4418e1AD7084630";
  
  const isAuth = await kuraCredit.authorized(newCircle);
  console.log("New KuraCircle authorized:", isAuth);
  
  const oldAuth = await kuraCredit.authorized(oldCircle);
  console.log("Old KuraCircle authorized:", oldAuth);

  // Check circle state
  const kuraCircle = await ethers.getContractAt("KuraCircle", newCircle);
  const count = await kuraCircle.circleCount();
  console.log("Circle count:", count.toString());
  
  if (count > 0n) {
    const info = await kuraCircle.getCircleInfo(0n);
    console.log("Circle #0 info:");
    console.log("  admin:", info[0]);
    console.log("  memberCount:", info[1].toString());
    console.log("  maxMembers:", info[2].toString());
    console.log("  currentRound:", info[3].toString());
    console.log("  roundDeadline:", info[4].toString());
    console.log("  active:", info[5]);
    console.log("  totalRounds:", info[6].toString());
    console.log("  completed:", info[7]);

    const members = await kuraCircle.getMembers(0n);
    console.log("  members:", members);
  }

  // Check cUSDC operator
  const cusdc = new ethers.Contract("0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f", [
    "function isOperator(address holder, address spender) view returns (bool)"
  ], ethers.provider);
  
  const [deployer] = await ethers.getSigners();
  const isOp = await cusdc.isOperator(deployer.address, newCircle);
  console.log("\ncUSDC operator (deployer -> newCircle):", isOp);
}

main().catch(console.error);
