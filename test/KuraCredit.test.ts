import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("KuraCredit", function () {
  let kuraCredit: any;
  let kuraCircle: any;
  let owner: any;
  let member1: any;
  let member2: any;
  let requester: any;
  let cofheClient: any;

  beforeEach(async function () {
    [owner, member1, member2, requester] = await ethers.getSigners();

    // Deploy KuraCredit
    const KuraCredit = await ethers.getContractFactory("KuraCredit");
    kuraCredit = await KuraCredit.deploy();
    await kuraCredit.waitForDeployment();

    // Deploy KuraCircle (needed as authorized caller)
    const KuraCircle = await ethers.getContractFactory("KuraCircle");
    kuraCircle = await KuraCircle.deploy(await kuraCredit.getAddress());
    await kuraCircle.waitForDeployment();

    // Authorize KuraCircle to call recordContribution
    await kuraCredit.setAuthorized(await kuraCircle.getAddress(), true);

    // Also authorize owner directly for testing
    await kuraCredit.setAuthorized(owner.address, true);

    cofheClient = await hre.cofhe.createClientWithBatteries(owner);
  });

  it("should increment credit score by 1 on recordContribution", async function () {
    // Record 3 contributions for member1
    await kuraCredit.recordContribution(member1.address);
    await kuraCredit.recordContribution(member1.address);
    await kuraCredit.recordContribution(member1.address);

    // Check score = 3
    const scoreHandle = await kuraCredit.connect(member1).getMyScore();
    const scorePlaintext = await hre.cofhe.mocks.expectPlaintext(scoreHandle);
    expect(scorePlaintext).to.equal(3n);

    // Public count should also be 3
    expect(await kuraCredit.contributionCount(member1.address)).to.equal(3n);
  });

  it("should return ebool for verifyCreditworthiness (score >= threshold)", async function () {
    // Give member1 a score of 5
    for (let i = 0; i < 5; i++) {
      await kuraCredit.recordContribution(member1.address);
    }

    // Requester checks if score >= 3 (should be true)
    const reqClient = await hre.cofhe.createClientWithBatteries(requester);
    const encThreshold = await reqClient.encrypt(3n, "uint64");
    const tx = await kuraCredit.connect(requester).verifyCreditworthiness(member1.address, encThreshold);
    await tx.wait();

    // The ebool result should be accessible to the requester
    // In mock environment we verify the event was emitted
    await expect(tx)
      .to.emit(kuraCredit, "CreditVerified")
      .withArgs(member1.address, requester.address);
  });

  it("should allow only member to view own score via getMyScore", async function () {
    await kuraCredit.recordContribution(member1.address);

    // member1 can view their own score
    const handle = await kuraCredit.connect(member1).getMyScore();
    expect(handle).to.not.equal(ethers.ZeroHash);

    // member2 has no history — should revert
    await expect(
      kuraCredit.connect(member2).getMyScore()
    ).to.be.revertedWith("No credit history");
  });

  it("should revert verifyCreditworthiness with no credit history", async function () {
    const reqClient = await hre.cofhe.createClientWithBatteries(requester);
    const encThreshold = await reqClient.encrypt(1n, "uint64");

    await expect(
      kuraCredit.connect(requester).verifyCreditworthiness(member2.address, encThreshold)
    ).to.be.revertedWith("No credit history");
  });

  it("should restrict recordContribution to authorized callers only", async function () {
    // member1 is not authorized — should revert
    await expect(
      kuraCredit.connect(member1).recordContribution(member1.address)
    ).to.be.revertedWith("Not authorized");
  });
});
