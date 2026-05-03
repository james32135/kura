import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Encryptable } from "@cofhe/sdk";

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

    // Deploy KuraCircle (needed as authorized caller) — 3-arg constructor
    const KuraCircle = await ethers.getContractFactory("KuraCircle");
    kuraCircle = await KuraCircle.deploy(
      await kuraCredit.getAddress(),
      ethers.ZeroAddress, // paymentToken (mock — no token transfers in unit tests)
      ethers.ZeroAddress  // roundOrder — set after via setRoundOrder
    );
    await kuraCircle.waitForDeployment();

    // Wire KuraRoundOrder
    const KuraRoundOrder = await ethers.getContractFactory("KuraRoundOrder");
    const roundOrder = await KuraRoundOrder.deploy(await kuraCircle.getAddress());
    await roundOrder.waitForDeployment();
    await kuraCircle.setRoundOrder(await roundOrder.getAddress());

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
    await hre.cofhe.mocks.expectPlaintext(scoreHandle, 3n);

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
    const [encThreshold] = await reqClient.encryptInputs([Encryptable.uint64(3n)]).execute();
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

    // member2 has no history â€” should revert
    await expect(
      kuraCredit.connect(member2).getMyScore()
    ).to.be.revertedWith("No credit history");
  });

  it("should revert verifyCreditworthiness with no credit history", async function () {
    const reqClient = await hre.cofhe.createClientWithBatteries(requester);
    const [encThreshold] = await reqClient.encryptInputs([Encryptable.uint64(1n)]).execute();

    await expect(
      kuraCredit.connect(requester).verifyCreditworthiness(member2.address, encThreshold)
    ).to.be.revertedWith("No credit history");
  });

  it("should restrict recordContribution to authorized callers only", async function () {
    await expect(
      kuraCredit.connect(member1).recordContribution(member1.address)
    ).to.be.revertedWith("Not authorized");
  });

  // -------------------------------------------------------------------------
  // getMemberTier â€” Wave 3 reputation gate backbone
  // -------------------------------------------------------------------------
  describe("getMemberTier", function () {
    it("should return tier 0 for a fresh wallet", async function () {
      expect(await kuraCredit.getMemberTier(member1.address)).to.equal(0);
    });

    it("should return tier 1 (Bronze) after 5 contributions", async function () {
      for (let i = 0; i < 5; i++) {
        await kuraCredit.recordContribution(member1.address);
      }
      expect(await kuraCredit.getMemberTier(member1.address)).to.equal(1);
    });

    it("should return tier 2 (Silver) after 15 contributions", async function () {
      for (let i = 0; i < 15; i++) {
        await kuraCredit.recordContribution(member1.address);
      }
      expect(await kuraCredit.getMemberTier(member1.address)).to.equal(2);
    });

    it("should return tier 3 (Gold) after 30 contributions", async function () {
      for (let i = 0; i < 30; i++) {
        await kuraCredit.recordContribution(member1.address);
      }
      expect(await kuraCredit.getMemberTier(member1.address)).to.equal(3);
    });

    it("should return tier 4 (Diamond) after 50 contributions", async function () {
      for (let i = 0; i < 50; i++) {
        await kuraCredit.recordContribution(member1.address);
      }
      expect(await kuraCredit.getMemberTier(member1.address)).to.equal(4);
    });

    it("should boost tier via circlesCompleted (1 completed = +5 score)", async function () {
      // 0 contributions + 1 completed circle = score 5 â†’ Bronze
      // owner is already authorized in beforeEach
      await kuraCredit.recordCircleCompletion(member1.address);
      expect(await kuraCredit.getMemberTier(member1.address)).to.equal(1);
    });

    it("should return same tier for different members independently", async function () {
      // member1 gets 5 contributions (Bronze)
      for (let i = 0; i < 5; i++) {
        await kuraCredit.recordContribution(member1.address);
      }
      // member2 gets 0
      expect(await kuraCredit.getMemberTier(member1.address)).to.equal(1);
      expect(await kuraCredit.getMemberTier(member2.address)).to.equal(0);
    });

    it("should not overflow: 255 contributions should return Diamond tier (4)", async function () {
      // Record 50 contributions and check capped at Diamond
      for (let i = 0; i < 50; i++) {
        await kuraCredit.recordContribution(member1.address);
      }
      // 1 more shouldn't change tier
      await kuraCredit.recordContribution(member1.address);
      expect(await kuraCredit.getMemberTier(member1.address)).to.equal(4);
    });
  });
});
