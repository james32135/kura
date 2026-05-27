import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Encryptable } from "@cofhe/sdk";

describe("KuraDisputeResolution", function () {
  let dispute: any;
  let mockCircle: any;
  let owner: any;
  let admin: any;
  let member1: any;
  let member2: any;
  let outsider: any;
  let cofheClient: any;   // used for admin/owner calls
  let member1Client: any; // must match msg.sender for raiseDispute
  let member2Client: any;

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
    member1Client = await hre.cofhe.createClientWithBatteries(member1);
    member2Client = await hre.cofhe.createClientWithBatteries(member2);

    // Register members and initialise pool balance (trivial-encrypt so ACL is bypassed in mock)
    await mockCircle.addMember(CIRCLE_ID, owner.address);
    await mockCircle.addMember(CIRCLE_ID, admin.address);
    await mockCircle.addMember(CIRCLE_ID, member1.address);
    await mockCircle.addMember(CIRCLE_ID, member2.address);
    await mockCircle.initPool(CIRCLE_ID, 1000n);
    // Allow KuraDisputeResolution to use the pool handle in FHE.gte
    await mockCircle.allowPool(CIRCLE_ID, await dispute.getAddress());
  });

  // ─── raiseDispute ────────────────────────────────────────────────────────

  it("member can raise a dispute with encrypted amount", async function () {
    const [encAmount] = await member1Client.encryptInputs([Encryptable.uint64(50n)]).execute();
    const tx = await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);
    await tx.wait();

    expect(await dispute.disputeCount()).to.equal(1n);
    const info = await dispute.getDisputeStatus(1);
    expect(info.status).to.equal(0n); // Pending
    expect(info.claimant).to.equal(member1.address);
  });

  it("member cannot raise two disputes for same circle/round", async function () {
    const [encAmount] = await member1Client.encryptInputs([Encryptable.uint64(50n)]).execute();
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    const [encAmount2] = await member1Client.encryptInputs([Encryptable.uint64(30n)]).execute();
    await expect(
      dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount2)
    ).to.be.revertedWith("Dispute already exists");
  });

  it("non-member cannot raise a dispute", async function () {
    const outsiderClient = await hre.cofhe.createClientWithBatteries(outsider);
    const [encAmount] = await outsiderClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    // outsider is not registered in mockCircle
    await expect(
      dispute.connect(outsider).raiseDispute(CIRCLE_ID, ROUND, encAmount)
    ).to.be.reverted;
  });

  // ─── FHE.gte: checkDisputeValidity ───────────────────────────────────────

  it("checkDisputeValidity returns encrypted bool using FHE.gte", async function () {
    const [encAmount] = await member1Client.encryptInputs([Encryptable.uint64(50n)]).execute();
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    // checkDisputeValidity creates a new FHE handle (FHE.gte) → staticCall-first pattern
    const handle = await dispute.connect(admin).checkDisputeValidity.staticCall(1);
    await dispute.connect(admin).checkDisputeValidity(1); // persist handle in mock storage
    // pool=1000 >= claim=50 → true (1)
    await hre.cofhe.mocks.expectPlaintext(handle, 1n);
  });

  // ─── resolveDispute (admin blind resolution) ─────────────────────────────

  it("admin can approve a dispute", async function () {
    const [encAmount] = await member1Client.encryptInputs([Encryptable.uint64(50n)]).execute();
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    await dispute.connect(owner).resolveDispute(1, true); // owner is admin
    const info = await dispute.getDisputeStatus(1);
    expect(info.status).to.equal(1n); // Approved
  });

  it("admin can reject a dispute", async function () {
    const [encAmount] = await member1Client.encryptInputs([Encryptable.uint64(50n)]).execute();
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    await dispute.connect(owner).resolveDispute(1, false);
    const info = await dispute.getDisputeStatus(1);
    expect(info.status).to.equal(2n); // Rejected
  });

  it("non-admin cannot resolve a dispute", async function () {
    const [encAmount] = await member1Client.encryptInputs([Encryptable.uint64(50n)]).execute();
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    await expect(
      dispute.connect(outsider).resolveDispute(1, true)
    ).to.be.revertedWith("Only admin");
  });

  // ─── FHE.isAllowed: getMyClaimedAmount ───────────────────────────────────

  it("claimant can retrieve their own encrypted claimed amount", async function () {
    const [encAmount] = await member1Client.encryptInputs([Encryptable.uint64(77n)]).execute();
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    // getMyClaimedAmount returns the stored handle — use staticCall to get it
    const handle = await dispute.connect(member1).getMyClaimedAmount.staticCall(1);
    await hre.cofhe.mocks.expectPlaintext(handle, 77n);
  });

  it("other member cannot retrieve claimant's amount", async function () {
    const [encAmount] = await member1Client.encryptInputs([Encryptable.uint64(77n)]).execute();
    await dispute.connect(member1).raiseDispute(CIRCLE_ID, ROUND, encAmount);

    await expect(dispute.connect(member2).getMyClaimedAmount(1))
      .to.be.reverted;
  });
});
