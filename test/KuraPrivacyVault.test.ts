import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Encryptable } from "@cofhe/sdk";

describe("KuraPrivacyVault", function () {
  let vault: any;
  let owner: any;
  let member1: any;
  let member2: any;
  let outsider: any;
  let cofheClient: any;

  const CIRCLE_ID = 42n;

  beforeEach(async function () {
    [owner, member1, member2, outsider] = await ethers.getSigners();

    const KuraPrivacyVault = await ethers.getContractFactory("KuraPrivacyVault");
    vault = await KuraPrivacyVault.deploy();
    await vault.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(owner);

    // Initialize vault (owner becomes admin)
    await vault.connect(owner).initVault(CIRCLE_ID, false);
  });

  // ─── Vault initialization ─────────────────────────────────────────────────

  it("initializes vault with correct admin", async function () {
    expect(await vault.hasAccess(CIRCLE_ID, owner.address)).to.equal(true);
  });

  it("cannot initialize the same vault twice", async function () {
    await expect(vault.connect(owner).initVault(CIRCLE_ID, true))
      .to.be.revertedWith("Vault already initialized");
  });

  // ─── FHE.asEuint64: storeMetadata ────────────────────────────────────────

  it("stores encrypted metadata chunks", async function () {
    // Encode "KURA" = 4 bytes → 1 chunk (padded to 8 bytes)
    const [chunk1] = await cofheClient.encryptInputs([Encryptable.uint64(BigInt("0x4b5552410000000"))]).execute(); // "KURA\0\0\0\0"
    const [descChunk] = await cofheClient.encryptInputs([Encryptable.uint64(BigInt("0x4865790000000000"))]).execute(); // "Hey\0\0\0\0\0"

    await vault.connect(owner).storeMetadata(
      CIRCLE_ID,
      [chunk1],
      [descChunk]
    );

    const [nameCount, descCount] = await vault.getMetadataCounts(CIRCLE_ID);
    expect(nameCount).to.equal(1n);
    expect(descCount).to.equal(1n);
  });

  // ─── Access control: allowMemberToRead ───────────────────────────────────

  it("grants and revokes member access", async function () {
    // Need to store metadata first so FHE handles exist
    const [chunk] = await cofheClient.encryptInputs([Encryptable.uint64(0n)]).execute();
    await vault.connect(owner).storeMetadata(CIRCLE_ID, [chunk], [chunk]);

    // Grant member1 access
    await vault.connect(owner).allowMemberToRead(CIRCLE_ID, member1.address);
    expect(await vault.hasAccess(CIRCLE_ID, member1.address)).to.equal(true);

    // Revoke
    await vault.connect(owner).revokeMemberAccess(CIRCLE_ID, member1.address);
    expect(await vault.hasAccess(CIRCLE_ID, member1.address)).to.equal(false);
  });

  it("non-admin cannot grant access", async function () {
    await expect(
      vault.connect(outsider).allowMemberToRead(CIRCLE_ID, member1.address)
    ).to.be.revertedWith("Not vault admin");
  });

  // ─── getNameHandles / getDescHandles ─────────────────────────────────────

  it("admin can read name handles", async function () {
    const [chunk] = await cofheClient.encryptInputs([Encryptable.uint64(0n)]).execute();
    await vault.connect(owner).storeMetadata(CIRCLE_ID, [chunk], []);

    const handles = await vault.connect(owner).getNameHandles(CIRCLE_ID);
    expect(handles.length).to.equal(1);
    expect(handles[0]).to.not.equal(0n);
  });

  it("outsider cannot read handles without access", async function () {
    const [chunk] = await cofheClient.encryptInputs([Encryptable.uint64(0n)]).execute();
    await vault.connect(owner).storeMetadata(CIRCLE_ID, [chunk], []);

    await expect(vault.connect(outsider).getNameHandles(CIRCLE_ID))
      .to.be.revertedWith("No access");
  });

  // ─── Private circle toggle ────────────────────────────────────────────────

  it("setCirclePrivate toggles visibility flag", async function () {
    expect(await vault.isPrivateCircle(CIRCLE_ID)).to.equal(false);
    await vault.connect(owner).setCirclePrivate(CIRCLE_ID, true);
    expect(await vault.isPrivateCircle(CIRCLE_ID)).to.equal(true);
  });
});
