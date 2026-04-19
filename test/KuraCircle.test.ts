import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("KuraCircle", function () {
  let kuraCredit: any;
  let kuraCircle: any;
  let admin: any;
  let member1: any;
  let member2: any;
  let member3: any;
  let cofheClient: any;

  beforeEach(async function () {
    [admin, member1, member2, member3] = await ethers.getSigners();

    // Deploy KuraCredit
    const KuraCredit = await ethers.getContractFactory("KuraCredit");
    kuraCredit = await KuraCredit.deploy();
    await kuraCredit.waitForDeployment();

    // Deploy KuraCircle with KuraCredit address
    const KuraCircle = await ethers.getContractFactory("KuraCircle");
    kuraCircle = await KuraCircle.deploy(await kuraCredit.getAddress());
    await kuraCircle.waitForDeployment();

    // Authorize KuraCircle on KuraCredit
    await kuraCredit.setAuthorized(await kuraCircle.getAddress(), true);

    // Create cofhe client for encryption
    cofheClient = await hre.cofhe.createClientWithBatteries(admin);
  });

  it("should allow admin to createCircle with encrypted minimum", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    const tx = await kuraCircle.createCircle(5, 3600, encrypted);
    await tx.wait();

    const info = await kuraCircle.getCircleInfo(0);
    expect(info.admin).to.equal(admin.address);
    expect(info.memberCount).to.equal(1n);
    expect(info.maxMembers).to.equal(5n);
    expect(info.active).to.equal(true);
  });

  it("should allow member to joinCircle", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);

    await kuraCircle.connect(member1).joinCircle(0);

    const info = await kuraCircle.getCircleInfo(0);
    expect(info.memberCount).to.equal(2n);
    expect(await kuraCircle.isMember(0, member1.address)).to.equal(true);
  });

  it("should reject joining a full circle", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    await kuraCircle.createCircle(2, 3600, encrypted); // Max 2 members (admin + 1)

    await kuraCircle.connect(member1).joinCircle(0);

    await expect(
      kuraCircle.connect(member2).joinCircle(0)
    ).to.be.revertedWith("Circle full");
  });

  it("should allow member to contribute encrypted amount", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);
    await kuraCircle.connect(member1).joinCircle(0);

    // Start round
    await kuraCircle.startRound(0);

    // Member contributes
    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const encContribution = await memberClient.encrypt(100n, "uint64");
    const tx = await kuraCircle.connect(member1).contribute(0, encContribution);
    await tx.wait();

    expect(await kuraCircle.hasContributed(0, 1, member1.address)).to.equal(true);
  });

  it("should accumulate valid contributions into the pool (FHE.add)", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.connect(member2).joinCircle(0);
    await kuraCircle.startRound(0);

    // Member1 contributes 100
    const client1 = await hre.cofhe.createClientWithBatteries(member1);
    const enc1 = await client1.encrypt(100n, "uint64");
    await kuraCircle.connect(member1).contribute(0, enc1);

    // Member2 contributes 200
    const client2 = await hre.cofhe.createClientWithBatteries(member2);
    const enc2 = await client2.encrypt(200n, "uint64");
    await kuraCircle.connect(member2).contribute(0, enc2);

    // Pool should be 300 (100 + 200)
    const poolHandle = await kuraCircle.getPoolBalance(0);
    const poolPlaintext = await hre.cofhe.mocks.expectPlaintext(poolHandle);
    expect(poolPlaintext).to.equal(300n);
  });

  it("should silently zero contribution below minimum (FHE.select)", async function () {
    // Set minimum to 100
    const encrypted = await cofheClient.encrypt(100n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.startRound(0);

    // Member contributes only 30 (below 100 min)
    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const encContribution = await memberClient.encrypt(30n, "uint64");
    await kuraCircle.connect(member1).contribute(0, encContribution);

    // Pool should still be 0 (contribution was below min, silently zeroed)
    const poolHandle = await kuraCircle.getPoolBalance(0);
    const poolPlaintext = await hre.cofhe.mocks.expectPlaintext(poolHandle);
    expect(poolPlaintext).to.equal(0n);
  });

  it("should accumulate pool across multiple valid contributions", async function () {
    const encrypted = await cofheClient.encrypt(10n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.connect(member2).joinCircle(0);
    await kuraCircle.startRound(0);

    const client1 = await hre.cofhe.createClientWithBatteries(member1);
    const enc1 = await client1.encrypt(50n, "uint64");
    await kuraCircle.connect(member1).contribute(0, enc1);

    const client2 = await hre.cofhe.createClientWithBatteries(member2);
    const enc2 = await client2.encrypt(75n, "uint64");
    await kuraCircle.connect(member2).contribute(0, enc2);

    const poolHandle = await kuraCircle.getPoolBalance(0);
    const poolPlaintext = await hre.cofhe.mocks.expectPlaintext(poolHandle);
    expect(poolPlaintext).to.equal(125n);
  });

  it("should revert on double contribution in same round", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.startRound(0);

    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const enc1 = await memberClient.encrypt(100n, "uint64");
    await kuraCircle.connect(member1).contribute(0, enc1);

    const enc2 = await memberClient.encrypt(100n, "uint64");
    await expect(
      kuraCircle.connect(member1).contribute(0, enc2)
    ).to.be.revertedWith("Already contributed this round");
  });

  it("should revert on non-member contribute", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);
    await kuraCircle.startRound(0);

    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const enc = await memberClient.encrypt(100n, "uint64");
    await expect(
      kuraCircle.connect(member1).contribute(0, enc)
    ).to.be.revertedWith("Not a member");
  });

  it("should return contribution handle for member via getMyContribution", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.startRound(0);

    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const enc = await memberClient.encrypt(100n, "uint64");
    await kuraCircle.connect(member1).contribute(0, enc);

    const handle = await kuraCircle.connect(member1).getMyContribution(0);
    // Handle should be a non-zero bytes32 (encrypted value exists)
    expect(handle).to.not.equal(ethers.ZeroHash);
  });

  it("should revert non-admin getPoolBalance", async function () {
    const encrypted = await cofheClient.encrypt(50n, "uint64");
    await kuraCircle.createCircle(5, 3600, encrypted);
    await kuraCircle.connect(member1).joinCircle(0);

    await expect(
      kuraCircle.connect(member1).getPoolBalance(0)
    ).to.be.revertedWith("Only admin");
  });
});
