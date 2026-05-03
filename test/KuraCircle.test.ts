import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Encryptable } from "@cofhe/sdk";

describe("KuraCircle", function () {
  let kuraCredit: any;
  let kuraCircle: any;
  let roundOrder: any;
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

    // Deploy KuraCircle with new 3-arg constructor (paymentToken + roundOrder)
    const KuraCircle = await ethers.getContractFactory("KuraCircle");
    kuraCircle = await KuraCircle.deploy(
      await kuraCredit.getAddress(),
      ethers.ZeroAddress, // paymentToken (mock â€” no token transfers in unit tests)
      ethers.ZeroAddress  // roundOrder â€” set after via setRoundOrder
    );
    await kuraCircle.waitForDeployment();

    // Deploy KuraRoundOrder and wire it
    const KuraRoundOrder = await ethers.getContractFactory("KuraRoundOrder");
    roundOrder = await KuraRoundOrder.deploy(await kuraCircle.getAddress());
    await roundOrder.waitForDeployment();
    await kuraCircle.setRoundOrder(await roundOrder.getAddress());

    // Authorize KuraCircle on KuraCredit
    await kuraCredit.setAuthorized(await kuraCircle.getAddress(), true);
    // Also authorize admin for direct test calls
    await kuraCredit.setAuthorized(admin.address, true);

    // Create cofhe client for encryption
    cofheClient = await hre.cofhe.createClientWithBatteries(admin);
  });

  it("should allow admin to createCircle with encrypted minimum", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    const tx = await kuraCircle.createCircle(5, 3600, 3, encrypted, 0); // 5-arg: maxMem, dur, rounds, min, minTier
    await tx.wait();

    const info = await kuraCircle.getCircleInfo(0);
    expect(info.admin).to.equal(admin.address);
    expect(info.memberCount).to.equal(1n);
    expect(info.maxMembers).to.equal(5n);
    expect(info.active).to.equal(true);
  });

  it("should allow member to joinCircle", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);

    await kuraCircle.connect(member1).joinCircle(0);

    const info = await kuraCircle.getCircleInfo(0);
    expect(info.memberCount).to.equal(2n);
    expect(await kuraCircle.isMember(0, member1.address)).to.equal(true);
  });

  it("should reject joining a full circle", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(2, 3600, 2, encrypted, 0); // Max 2 members (admin + 1)

    await kuraCircle.connect(member1).joinCircle(0);

    await expect(
      kuraCircle.connect(member2).joinCircle(0)
    ).to.be.revertedWith("Circle full");
  });

  // contribute() calls paymentToken.confidentialTransferFrom which requires a real cUSDC deployment.
  // These tests pass on Arb Sepolia where cUSDC is deployed.
  it.skip("should allow member to contribute encrypted amount [requires cUSDC]", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
    await kuraCircle.connect(member1).joinCircle(0);

    // Start round
    await kuraCircle.startRound(0);

    // Member contributes
    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const [encContribution] = await memberClient.encryptInputs([Encryptable.uint64(100n)]).execute();
    const tx = await kuraCircle.connect(member1).contribute(0, encContribution);
    await tx.wait();

    expect(await kuraCircle.hasContributed(0, 1, member1.address)).to.equal(true);
  });

  it.skip("should accumulate valid contributions into the pool (FHE.add) [requires cUSDC]", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.connect(member2).joinCircle(0);
    await kuraCircle.startRound(0);

    // Member1 contributes 100
    const client1 = await hre.cofhe.createClientWithBatteries(member1);
    const [enc1] = await client1.encryptInputs([Encryptable.uint64(100n)]).execute();
    await kuraCircle.connect(member1).contribute(0, enc1);

    // Member2 contributes 200
    const client2 = await hre.cofhe.createClientWithBatteries(member2);
    const [enc2] = await client2.encryptInputs([Encryptable.uint64(200n)]).execute();
    await kuraCircle.connect(member2).contribute(0, enc2);

    // Pool should be 300 (100 + 200)
    const poolHandle = await kuraCircle.getPoolBalance(0);
    const poolPlaintext = await hre.cofhe.mocks.expectPlaintext(poolHandle);
    expect(poolPlaintext).to.equal(300n);
  });

  it.skip("should silently zero contribution below minimum (FHE.select) [requires cUSDC]", async function () {
    // Set minimum to 100
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(100n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.startRound(0);

    // Member contributes only 30 (below 100 min)
    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const [encContribution] = await memberClient.encryptInputs([Encryptable.uint64(30n)]).execute();
    await kuraCircle.connect(member1).contribute(0, encContribution);

    // Pool should still be 0 (contribution was below min, silently zeroed)
    const poolHandle = await kuraCircle.getPoolBalance(0);
    const poolPlaintext = await hre.cofhe.mocks.expectPlaintext(poolHandle);
    expect(poolPlaintext).to.equal(0n);
  });

  it.skip("should accumulate pool across multiple valid contributions [requires cUSDC]", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(10n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.connect(member2).joinCircle(0);
    await kuraCircle.startRound(0);

    const client1 = await hre.cofhe.createClientWithBatteries(member1);
    const [enc1] = await client1.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.connect(member1).contribute(0, enc1);

    const client2 = await hre.cofhe.createClientWithBatteries(member2);
    const [enc2] = await client2.encryptInputs([Encryptable.uint64(75n)]).execute();
    await kuraCircle.connect(member2).contribute(0, enc2);

    const poolHandle = await kuraCircle.getPoolBalance(0);
    const poolPlaintext = await hre.cofhe.mocks.expectPlaintext(poolHandle);
    expect(poolPlaintext).to.equal(125n);
  });

  it.skip("should revert on double contribution in same round [requires cUSDC]", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.startRound(0);

    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const [enc1] = await memberClient.encryptInputs([Encryptable.uint64(100n)]).execute();
    await kuraCircle.connect(member1).contribute(0, enc1);

    const [enc2] = await memberClient.encryptInputs([Encryptable.uint64(100n)]).execute();
    await expect(
      kuraCircle.connect(member1).contribute(0, enc2)
    ).to.be.revertedWith("Already contributed this round");
  });

  it("should revert on non-member contribute", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
    await kuraCircle.startRound(0);

    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const [enc] = await memberClient.encryptInputs([Encryptable.uint64(100n)]).execute();
    await expect(
      kuraCircle.connect(member1).contribute(0, enc)
    ).to.be.revertedWith("Not a member");
  });

  it.skip("should return contribution handle for member via getMyContribution [requires cUSDC]", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
    await kuraCircle.connect(member1).joinCircle(0);
    await kuraCircle.startRound(0);

    const memberClient = await hre.cofhe.createClientWithBatteries(member1);
    const [enc] = await memberClient.encryptInputs([Encryptable.uint64(100n)]).execute();
    await kuraCircle.connect(member1).contribute(0, enc);

    const handle = await kuraCircle.connect(member1).getMyContribution(0);
    // Handle should be a non-zero bytes32 (encrypted value exists)
    expect(handle).to.not.equal(ethers.ZeroHash);
  });

  it("should revert non-admin getPoolBalance", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
    await kuraCircle.connect(member1).joinCircle(0);

    await expect(
      kuraCircle.connect(member1).getPoolBalance(0)
    ).to.be.revertedWith("Only admin");
  });

  // -------------------------------------------------------------------------
  // Reputation Gate â€” Wave 3 novel feature #2
  // -------------------------------------------------------------------------
  describe("Reputation Gate", function () {
    it("should allow join on open circle (minCreditTier = 0)", async function () {
      const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);

      await kuraCircle.connect(member1).joinCircle(0);
      expect(await kuraCircle.isMember(0, member1.address)).to.equal(true);
    });

    it("should revert join when member tier < minCreditTier (Bronze gate)", async function () {
      const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      await kuraCircle.createCircle(5, 3600, 3, encrypted, 1); // Bronze: requires 5 contributions

      // Fresh wallet has 0 contributions â†’ tier 0 < 1 â†’ revert
      await expect(
        kuraCircle.connect(member1).joinCircle(0)
      ).to.be.revertedWith("Reputation tier too low");
    });

    it("should allow join after earning Bronze tier (5 contributions)", async function () {
      for (let i = 0; i < 5; i++) {
        await kuraCredit.recordContribution(member1.address);
      }

      const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      await kuraCircle.createCircle(5, 3600, 3, encrypted, 1);

      await kuraCircle.connect(member1).joinCircle(0);
      expect(await kuraCircle.isMember(0, member1.address)).to.equal(true);
    });

    it("should revert Silver gate (15 pts) for member with only Bronze (5 pts)", async function () {
      for (let i = 0; i < 5; i++) {
        await kuraCredit.recordContribution(member1.address);
      }

      const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      await kuraCircle.createCircle(5, 3600, 3, encrypted, 2); // Silver

      await expect(
        kuraCircle.connect(member1).joinCircle(0)
      ).to.be.revertedWith("Reputation tier too low");
    });

    it("should store minCreditTier via getMinCreditTier", async function () {
      const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      await kuraCircle.createCircle(5, 3600, 3, encrypted, 3); // Gold

      expect(await kuraCircle.getMinCreditTier(0)).to.equal(3);
    });

    it("should emit ReputationGated when minTier > 0", async function () {
      const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      const tx = await kuraCircle.createCircle(5, 3600, 3, encrypted, 2);
      await expect(tx).to.emit(kuraCircle, "ReputationGated").withArgs(0n, 2);
    });

    it("should NOT emit ReputationGated for open circles", async function () {
      const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      const tx = await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);
      await expect(tx).to.not.emit(kuraCircle, "ReputationGated");
    });
  });

  // -------------------------------------------------------------------------
  // setRoundOrder guards
  // -------------------------------------------------------------------------
  it("should revert setRoundOrder from non-owner", async function () {
    await expect(
      kuraCircle.connect(member1).setRoundOrder(ethers.ZeroAddress)
    ).to.be.revertedWith("Only owner");
  });

  it("should revert setRoundOrder after circles exist", async function () {
    const [encrypted] = await cofheClient.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraCircle.createCircle(5, 3600, 3, encrypted, 0);

    await expect(
      kuraCircle.setRoundOrder(ethers.ZeroAddress)
    ).to.be.revertedWith("Cannot change after circles created");
  });
});
