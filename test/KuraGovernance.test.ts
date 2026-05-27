import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Encryptable } from "@cofhe/sdk";

/// @dev Signs a mock decrypt result the same way the CoFHE mock network does.
/// Private key matches MOCKS_DECRYPT_RESULT_SIGNER_PRIVATE_KEY used by hre.cofhe plugin.
async function mockGetDecryptSig(ctHash: bigint, value: bigint): Promise<string> {
  const MOCK_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const wallet = new ethers.Wallet(MOCK_PRIVATE_KEY);
  const msgHash = ethers.keccak256(
    ethers.solidityPacked(["uint256", "uint256"], [ctHash, value])
  );
  return wallet.signingKey.sign(msgHash).serialized;
}

describe("KuraGovernance", function () {
  let governance: any;
  let mockCircle: any;
  let mockCredit: any;
  let owner: any;
  let member1: any;
  let member2: any;
  let member3: any;
  let outsider: any;
  let cofheClient: any;    // owner
  let member1Client: any; // must match msg.sender for submitVote
  let member2Client: any;
  let member3Client: any;

  const CIRCLE_ID = 1n;
  const QUORUM = 2n;
  const DURATION = 2 * 60 * 60; // 2 hours in seconds

  beforeEach(async function () {
    [owner, member1, member2, member3, outsider] = await ethers.getSigners();

    const MockCircle = await ethers.getContractFactory("MockKuraCircleGov");
    mockCircle = await MockCircle.deploy();
    await mockCircle.waitForDeployment();

    const MockCredit = await ethers.getContractFactory("MockKuraCreditGov");
    mockCredit = await MockCredit.deploy();
    await mockCredit.waitForDeployment();

    const KuraGovernance = await ethers.getContractFactory("KuraGovernance");
    governance = await KuraGovernance.deploy(
      await mockCircle.getAddress(),
      await mockCredit.getAddress()
    );
    await governance.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(owner);
    member1Client = await hre.cofhe.createClientWithBatteries(member1);
    member2Client = await hre.cofhe.createClientWithBatteries(member2);
    member3Client = await hre.cofhe.createClientWithBatteries(member3);

    // Register members so isMember() checks pass
    await mockCircle.addMember(CIRCLE_ID, owner.address);
    await mockCircle.addMember(CIRCLE_ID, member1.address);
    await mockCircle.addMember(CIRCLE_ID, member2.address);
    await mockCircle.addMember(CIRCLE_ID, member3.address);
  });

  // ─── createProposal ───────────────────────────────────────────────────────

  it("member can create a proposal", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Increase min contribution", DURATION, QUORUM);
    expect(await governance.proposalCount()).to.equal(1n);

    const info = await governance.getProposal(1);
    expect(info.status).to.equal(0n); // Active
    expect(info.proposer).to.equal(member1.address);
  });

  it("non-member cannot create a proposal", async function () {
    await expect(
      governance.connect(outsider).createProposal(CIRCLE_ID, "Test", DURATION, QUORUM)
    ).to.be.revertedWith("Not a member");
  });

  // ─── FHE.select + FHE.add: submitVote ────────────────────────────────────

  it("members can cast encrypted votes (yes and no)", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Test proposal", DURATION, QUORUM);

    const [yesVote] = await member1Client.encryptInputs([Encryptable.bool(true)]).execute();
    const [noVote] = await member2Client.encryptInputs([Encryptable.bool(false)]).execute();

    await governance.connect(member1).submitVote(1, yesVote);
    await governance.connect(member2).submitVote(1, noVote);

    expect(await governance.hasVoted(1, member1.address)).to.equal(true);
    expect(await governance.hasVoted(1, member2.address)).to.equal(true);
  });

  it("member cannot vote twice on same proposal", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Test proposal", DURATION, QUORUM);
    const [vote] = await member1Client.encryptInputs([Encryptable.bool(true)]).execute();

    await governance.connect(member1).submitVote(1, vote);
    await expect(governance.connect(member1).submitVote(1, vote))
      .to.be.revertedWith("Already voted");
  });

  // ─── FHE.not: getEncVoteAbsenceProof ─────────────────────────────────────

  it("non-voter gets encrypted absence proof via FHE.not", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Test proposal", DURATION, QUORUM);
    // member3 did NOT vote

    // getEncVoteAbsenceProof creates new FHE handles (FHE.not) → staticCall-first pattern
    const proof = await governance.connect(member3).getEncVoteAbsenceProof.staticCall(1, member3.address);
    await governance.connect(member3).getEncVoteAbsenceProof(1, member3.address); // persist
    // FHE.not(false) = true → should decrypt to 1
    await hre.cofhe.mocks.expectPlaintext(proof, 1n);
  });

  it("voter gets absence proof = false via FHE.not", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Test proposal", DURATION, QUORUM);
    const [vote] = await member1Client.encryptInputs([Encryptable.bool(true)]).execute();
    await governance.connect(member1).submitVote(1, vote);

    const proof = await governance.connect(member1).getEncVoteAbsenceProof.staticCall(1, member1.address);
    await governance.connect(member1).getEncVoteAbsenceProof(1, member1.address); // persist
    // FHE.not(true) = false → should decrypt to 0
    await hre.cofhe.mocks.expectPlaintext(proof, 0n);
  });

  // ─── FHE.gte: verifyMajority ─────────────────────────────────────────────

  it("verifyMajority returns encrypted bool based on yes count", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Test proposal", DURATION, QUORUM);

    const [yesVote] = await member1Client.encryptInputs([Encryptable.bool(true)]).execute();
    const [yesVote2] = await member2Client.encryptInputs([Encryptable.bool(true)]).execute();
    await governance.connect(member1).submitVote(1, yesVote);
    await governance.connect(member2).submitVote(1, yesVote2);

    // verifyMajority creates a new FHE handle (FHE.gte) → staticCall-first pattern
    // yes count = 2, threshold = 1 → FHE.gte(2, 1) = true
    const result = await governance.connect(owner).verifyMajority.staticCall(1, 1n);
    await governance.connect(owner).verifyMajority(1, 1n); // persist
    await hre.cofhe.mocks.expectPlaintext(result, 1n);
  });

  // ─── FHE.publishDecryptResult: closeVote ────────────────────────────────
  // (closeVoteBatch uses verifyDecryptResultBatch which is NOT in mock — use closeVote instead)

  it("admin can close vote using closeVote and emit final result", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Test proposal", DURATION, QUORUM);

    const [yesVote] = await member1Client.encryptInputs([Encryptable.bool(true)]).execute();
    const [yesVote2] = await member2Client.encryptInputs([Encryptable.bool(true)]).execute();
    const [noVote] = await member3Client.encryptInputs([Encryptable.bool(false)]).execute();
    await governance.connect(member1).submitVote(1, yesVote);
    await governance.connect(member2).submitVote(1, yesVote2);
    await governance.connect(member3).submitVote(1, noVote);

    const [encYes, encTotal] = await governance.connect(owner).getVoteHandles(1);

    // Sign the decrypted values with the mock signer private key
    const yesSig = await mockGetDecryptSig(encYes, 2n);
    const totalSig = await mockGetDecryptSig(encTotal, 3n);

    await governance.connect(owner).closeVote(1, 2n, 3n, yesSig, totalSig);

    const info = await governance.getProposal(1);
    // 2/3 majority > 50% and quorum (2) met → Passed
    expect(info.status).to.equal(1n); // Passed
    expect(info.plainYesCount).to.equal(2n);
    expect(info.plainTotalVotes).to.equal(3n);
  });

  it("non-admin cannot close vote", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Test proposal", DURATION, QUORUM);
    await expect(
      governance.connect(outsider).closeVote(1, 0n, 0n, "0x", "0x")
    ).to.be.revertedWith("Only admin");
  });

  // ─── cancelProposal ───────────────────────────────────────────────────────

  it("proposer can cancel their own proposal", async function () {
    await governance.connect(member1).createProposal(CIRCLE_ID, "Test proposal", DURATION, QUORUM);
    await governance.connect(member1).cancelProposal(1);

    const info = await governance.getProposal(1);
    expect(info.status).to.equal(3n); // Cancelled
  });
});
