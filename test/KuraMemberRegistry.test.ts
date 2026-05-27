import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("KuraMemberRegistry", function () {
  let registry: any;
  let kuraCircleMock: any;  // simple owner acting as kuraCircle
  let owner: any;
  let circle: any;  // acting as kuraCircle (the authorized caller)
  let member1: any;
  let member2: any;
  let member3: any;
  let outsider: any;
  let cofheClient: any;

  const CIRCLE_ID = 1n;

  beforeEach(async function () {
    [owner, circle, member1, member2, member3, outsider] = await ethers.getSigners();

    // Deploy registry — pass `circle` as the kuraCircle address
    const KuraMemberRegistry = await ethers.getContractFactory("KuraMemberRegistry");
    registry = await KuraMemberRegistry.deploy(circle.address);
    await registry.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(owner);
  });

  // ─── FHE.asEaddress + FHE.eq + FHE.or: isMember ─────────────────────────

  it("should register members and return correct count", async function () {
    await registry.connect(circle).registerMember(CIRCLE_ID, member1.address);
    await registry.connect(circle).registerMember(CIRCLE_ID, member2.address);
    expect(await registry.memberCount(CIRCLE_ID)).to.equal(2n);
  });

  it("isMember returns ebool=true for a registered member", async function () {
    await registry.connect(circle).registerMember(CIRCLE_ID, member1.address);
    // isMember creates new FHE handles → staticCall-first to get the handle, then real tx to persist
    const handle = await registry.connect(member1).isMember.staticCall(CIRCLE_ID, member1.address);
    await registry.connect(member1).isMember(CIRCLE_ID, member1.address);
    await hre.cofhe.mocks.expectPlaintext(handle, 1n);
  });

  it("isMember returns ebool=false for outsider", async function () {
    await registry.connect(circle).registerMember(CIRCLE_ID, member1.address);
    const handle = await registry.connect(outsider).isMember.staticCall(CIRCLE_ID, outsider.address);
    await registry.connect(outsider).isMember(CIRCLE_ID, outsider.address);
    await hre.cofhe.mocks.expectPlaintext(handle, 0n);
  });

  it("isMember works with multiple members (FHE.or accumulation)", async function () {
    await registry.connect(circle).registerMember(CIRCLE_ID, member1.address);
    await registry.connect(circle).registerMember(CIRCLE_ID, member2.address);
    await registry.connect(circle).registerMember(CIRCLE_ID, member3.address);
    // member2 should be found even though it's not slot 0
    const handle = await registry.connect(member2).isMember.staticCall(CIRCLE_ID, member2.address);
    await registry.connect(member2).isMember(CIRCLE_ID, member2.address);
    await hre.cofhe.mocks.expectPlaintext(handle, 1n);
  });

  // ─── FHE.allowSender: allowMemberSelf ────────────────────────────────────

  it("allowMemberSelf grants read access to own slot", async function () {
    await registry.connect(circle).registerMember(CIRCLE_ID, member1.address);
    // Should not revert — grants FHE.allow to member1
    await expect(registry.connect(member1).allowMemberSelf(CIRCLE_ID, 0)).to.not.be.reverted;
  });

  it("getEncMemberSlot works after allowMemberSelf is called", async function () {
    await registry.connect(circle).registerMember(CIRCLE_ID, member1.address);
    // Grant access first; in mock mode FHE.isAllowed ACL is not strictly enforced on mathOp inputs
    await registry.connect(member1).allowMemberSelf(CIRCLE_ID, 0);
    // getEncMemberSlot has FHE.isAllowed (non-view) → use staticCall to get the handle
    const slot = await registry.connect(member1).getEncMemberSlot.staticCall(CIRCLE_ID, 0);
    expect(slot).to.not.equal(0n); // non-zero handle
  });

  // ─── FHE.rem: getRandomSlotIndex ─────────────────────────────────────────

  it.skip("getRandomSlotIndex returns encrypted slot within [0, count) via FHE.rem [rem unsupported in mock]", async function () {
    // FHE.rem is not supported in the mock environment — skipped
  });

  // ─── Only KuraCircle can register ────────────────────────────────────────

  it("non-kuraCircle caller cannot register members", async function () {
    await expect(
      registry.connect(outsider).registerMember(CIRCLE_ID, member1.address)
    ).to.be.revertedWith("Not KuraCircle");
  });
});
