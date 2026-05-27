import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("KuraCreditV2", function () {
  let creditV2: any;
  let owner: any;
  let kuraCircle: any;  // acting as authorized caller
  let member1: any;
  let outsider: any;
  let cofheClient: any;

  const NO_WEIGHT_CIRCLE = 99n;  // circle with no explicit weight → default 1x increment

  beforeEach(async function () {
    [owner, kuraCircle, member1, outsider] = await ethers.getSigners();

    const KuraCreditV2 = await ethers.getContractFactory("KuraCreditV2");
    creditV2 = await KuraCreditV2.deploy();          // no-arg constructor
    await creditV2.waitForDeployment();

    // kuraCircle is authorized to call recordContributionWeighted
    await creditV2.setAuthorized(kuraCircle.address, true);
    // kuraCircle is also a verifier so it can call getSquaredScore / getEncryptedTier / verifyTierInRange
    await creditV2.setVerifier(kuraCircle.address, true);

    cofheClient = await hre.cofhe.createClientWithBatteries(owner);
  });

  // ─── FHE.add: recordContributionWeighted (no circle weight → 1x) ─────────

  it("should increment encrypted score on recordContributionWeighted", async function () {
    await creditV2.connect(kuraCircle).recordContributionWeighted(member1.address, NO_WEIGHT_CIRCLE);
    await creditV2.connect(kuraCircle).recordContributionWeighted(member1.address, NO_WEIGHT_CIRCLE);
    await creditV2.connect(kuraCircle).recordContributionWeighted(member1.address, NO_WEIGHT_CIRCLE);

    // getMyScore returns the stored handle — use staticCall to get it without sending a tx
    const handle = await creditV2.connect(member1).getMyScore.staticCall();
    await hre.cofhe.mocks.expectPlaintext(handle, 3n);
  });

  // ─── FHE.mul + FHE.div: weighted contribution (circleWeight 200 bps = 2x) ─

  it("weighted contribution applies weight × 1 / 100", async function () {
    // weight 200 bps = 2x; one contribution → score += (1 × 200) / 100 = 2
    await creditV2.setCircleWeight(1n, 200n);
    await creditV2.connect(kuraCircle).recordContributionWeighted(member1.address, 1n);

    const handle = await creditV2.connect(member1).getMyScore.staticCall();
    await hre.cofhe.mocks.expectPlaintext(handle, 2n);
  });

  // ─── FHE.square: getSquaredScore ─────────────────────────────────────────

  it("getSquaredScore returns score²", async function () {
    // score = 2 (one contribution at 2x weight); squared = 4
    await creditV2.setCircleWeight(1n, 200n);
    await creditV2.connect(kuraCircle).recordContributionWeighted(member1.address, 1n);

    // getSquaredScore creates a new handle → staticCall-first pattern
    const handle = await creditV2.connect(member1).getSquaredScore.staticCall(member1.address);
    await creditV2.connect(member1).getSquaredScore(member1.address);  // persist in mock storage
    await hre.cofhe.mocks.expectPlaintext(handle, 4n);
  });

  // ─── FHE.and + FHE.gte + FHE.lte: verifyTierInRange ─────────────────────

  it("verifyTierInRange returns true when score is in tier range", async function () {
    // One contribution → score = 1 (tier 0, None)
    await creditV2.connect(kuraCircle).recordContributionWeighted(member1.address, NO_WEIGHT_CIRCLE);

    // Tier 0 range: score ∈ [0, 4]. Score = 1 → should be true
    const handle = await creditV2.connect(member1).verifyTierInRange.staticCall(member1.address, 0, 0);
    await creditV2.connect(member1).verifyTierInRange(member1.address, 0, 0);
    await hre.cofhe.mocks.expectPlaintext(handle, 1n);
  });

  it("verifyTierInRange returns false when score is out of range", async function () {
    // One contribution → score = 1, tier 0. Bronze range [5, 29].
    await creditV2.connect(kuraCircle).recordContributionWeighted(member1.address, NO_WEIGHT_CIRCLE);

    // Checking tier 1–2 (Bronze–Silver): minThreshold=5, maxThreshold=29. Score 1 < 5 → false
    const handle = await creditV2.connect(member1).verifyTierInRange.staticCall(member1.address, 1, 2);
    await creditV2.connect(member1).verifyTierInRange(member1.address, 1, 2);
    await hre.cofhe.mocks.expectPlaintext(handle, 0n);
  });

  // ─── FHE.select chain: getEncryptedTier ──────────────────────────────────

  it("getEncryptedTier returns correct tier handle", async function () {
    // 5 contributions at 1x → score = 5 → tier 1 (Bronze)
    for (let i = 0; i < 5; i++) {
      await creditV2.connect(kuraCircle).recordContributionWeighted(member1.address, NO_WEIGHT_CIRCLE);
    }

    // getEncryptedTier creates new handles → staticCall-first pattern
    const handle = await creditV2.connect(member1).getEncryptedTier.staticCall(member1.address);
    await creditV2.connect(member1).getEncryptedTier(member1.address);  // persist
    await hre.cofhe.mocks.expectPlaintext(handle, 1n);  // tier 1 = Bronze
  });

  // ─── Access control ──────────────────────────────────────────────────────

  it("only authorized callers can call recordContributionWeighted", async function () {
    await expect(
      creditV2.connect(outsider).recordContributionWeighted(member1.address, NO_WEIGHT_CIRCLE)
    ).to.be.revertedWith("Not authorized");
  });
});
