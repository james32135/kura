import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("KuraDisputeResolution", function () {
  let dispute: any;
  let mockCircle: any;
  let owner: any;
  let admin: any;
  let member1: any;
  let member2: any;
  let outsider: any;
  let cofheClient: any;

  const CIRCLE_ID = 1n;
  const ROUND = 1n;

  beforeEach(async function () {
    [owner, admin, member1, member2, outsider] = await ethers.getSigners();

    // Deploy a mock KuraCircle that marks everyone as a member (for simplicity)
    const MockCircle = await ethers.getContractFactory("MockKuraCircleDispute");
    mockCircle = await MockCircle.deploy();
    await mockCircle.waitForDeployment();

    const KuraDisputeResolution = await ethers.getContractFactory("KuraDisputeResolution");
    dispute = await KuraDisputeResolution.deploy(await mockCircle.getAddress());
    await dispute.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(owner);
  });

  // ─── raiseDispute ────────────────────────────────────────────────────────

  it("member can raise a dispute with encrypted amount", async function () {
    const encAmount = await cofheClient.encrypt_uint64(50n);
    const tx = await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);
    await tx.wait();

    expect(await dispute.disputeCount()).to.equal(1n);
    const info = await dispute.getDisputeStatus(1);
    expect(info.status).to.equal(0n); // Pending
    expect(info.claimant).to.equal(member1.address);
  });

  it("member cannot raise two disputes for same circle/round", async function () {
    const encAmount = await cofheClient.encrypt_uint64(50n);
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    const encAmount2 = await cofheClient.encrypt_uint64(30n);
    await expect(
      dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount2)
    ).to.be.revertedWith("Dispute already exists");
  });

  it("non-member cannot raise a dispute", async function () {
    const encAmount = await cofheClient.encrypt_uint64(50n);
    // MockKuraCircleDispute should revert non-members
    await expect(
      dispute.connect(outsider).raiseDispute(CIRCLE_ID, ROUND, encAmount)
    ).to.be.reverted;
  });

  // ─── FHE.gte: checkDisputeValidity ───────────────────────────────────────

  it("checkDisputeValidity returns encrypted bool using FHE.gte", async function () {
    const encAmount = await cofheClient.encrypt_uint64(50n);
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    // The mock circle returns a pool balance as an encrypted value
    const result = await dispute.connect(admin).checkDisputeValidity(1);
    expect(result).to.not.equal(0n);
    // In mocked FHE: pool=1000 >= claim=50 → should decrypt to true (1)
    await hre.cofhe.mocks.expectPlaintext(result, 1n);
  });

  // ─── resolveDispute (admin blind resolution) ─────────────────────────────

  it("admin can approve a dispute", async function () {
    const encAmount = await cofheClient.encrypt_uint64(50n);
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    await dispute.connect(owner).resolveDispute(1, true); // owner is admin
    const info = await dispute.getDisputeStatus(1);
    expect(info.status).to.equal(1n); // Approved
  });

  it("admin can reject a dispute", async function () {
    const encAmount = await cofheClient.encrypt_uint64(50n);
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    await dispute.connect(owner).resolveDispute(1, false);
    const info = await dispute.getDisputeStatus(1);
    expect(info.status).to.equal(2n); // Rejected
  });

  it("non-admin cannot resolve a dispute", async function () {
    const encAmount = await cofheClient.encrypt_uint64(50n);
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    await expect(
      dispute.connect(outsider).resolveDispute(1, true)
    ).to.be.revertedWith("Only admin");
  });

  // ─── FHE.isAllowed: getMyClaimedAmount ───────────────────────────────────

  it("claimant can retrieve their own encrypted claimed amount", async function () {
    const encAmount = await cofheClient.encrypt_uint64(77n);
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    const handle = await dispute.connect(member1).getMyClaimedAmount(1);
    await hre.cofhe.mocks.expectPlaintext(handle, 77n);
  });

  it("other member cannot retrieve claimant's amount", async function () {
    const encAmount = await cofheClient.encrypt_uint64(77n);
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    await expect(dispute.connect(member2).getMyClaimedAmount(1))
      .to.be.reverted;
  });
});
