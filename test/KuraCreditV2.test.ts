import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("KuraCreditV2", function () {
  let creditV2: any;
  let owner: any;
  let kuraCircle: any;  // acting as authorized kuraCircle
  let member1: any;
  let member2: any;
  let outsider: any;
  let cofheClient: any;

  const CIRCLE_ID = 1n;

  beforeEach(async function () {
    [owner, kuraCircle, member1, member2, outsider] = await ethers.getSigners();

    const KuraCreditV2 = await ethers.getContractFactory("KuraCreditV2");
    creditV2 = await KuraCreditV2.deploy(kuraCircle.address);
    await creditV2.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(owner);
  });

  // ─── FHE.add: recordContribution ─────────────────────────────────────────

  it("should increment encrypted score on recordContribution", async function () {
    await creditV2.connect(kuraCircle).recordContribution(member1.address, 10n);
    await creditV2.connect(kuraCircle).recordContribution(member1.address, 10n);

    // getMyScore uses FHE.isAllowed (non-view)
    const handle = await creditV2.connect(member1).getMyScore();
    await hre.cofhe.mocks.expectPlaintext(handle, 20n);
  });

  // ─── FHE.mul + FHE.div: computeWeightedScore ─────────────────────────────

  it("computeWeightedScore applies weight × score / 100", async function () {
    await creditV2.connect(kuraCircle).recordContribution(member1.address, 50n);
    // weight 50 %, score 50 → weighted = 50*50/100 = 25
    const result = await creditV2.connect(kuraCircle).computeWeightedScore(member1.address, 50n);
    await hre.cofhe.mocks.expectPlaintext(result, 25n);
  });

  // ─── FHE.square: getSquaredScore ─────────────────────────────────────────

  it("getSquaredScore returns score²", async function () {
    await creditV2.connect(kuraCircle).recordContribution(member1.address, 4n);
    const result = await creditV2.connect(member1).getSquaredScore(member1.address);
    await hre.cofhe.mocks.expectPlaintext(result, 16n);
  });

  // ─── FHE.and: verifyTierInRange ──────────────────────────────────────────

  it("verifyTierInRange returns true when score within [lo, hi]", async function () {
    await creditV2.connect(kuraCircle).recordContribution(member1.address, 5n);
    // score = 5, range [2, 8] → should be true
    const result = await creditV2.connect(kuraCircle).verifyTierInRange(member1.address, 2n, 8n);
    await hre.cofhe.mocks.expectPlaintext(result, 1n);
  });

  it("verifyTierInRange returns false when score out of range", async function () {
    await creditV2.connect(kuraCircle).recordContribution(member1.address, 10n);
    // score = 10, range [2, 8] → false
    const result = await creditV2.connect(kuraCircle).verifyTierInRange(member1.address, 2n, 8n);
    await hre.cofhe.mocks.expectPlaintext(result, 0n);
  });

  // ─── FHE.allowSender + FHE.isAllowed: getEncryptedTier ───────────────────

  it("getEncryptedTier requires allowSender first", async function () {
    await creditV2.connect(kuraCircle).recordContribution(member1.address, 3n);
    // Without allowSender, isAllowed guard should reject
    await expect(creditV2.connect(member1).getEncryptedTier(member1.address)).to.be.reverted;
  });

  it("getEncryptedTier returns tier handle after allowSender", async function () {
    await creditV2.connect(kuraCircle).recordContribution(member1.address, 3n);
    await creditV2.connect(member1).allowMeTier(member1.address);
    const tier = await creditV2.connect(member1).getEncryptedTier(member1.address);
    expect(tier).to.not.equal(0n);
  });

  // ─── Access control ──────────────────────────────────────────────────────

  it("only kuraCircle can call recordContribution", async function () {
    await expect(
      creditV2.connect(outsider).recordContribution(member1.address, 5n)
    ).to.be.revertedWith("Not KuraCircle");
  });
});
