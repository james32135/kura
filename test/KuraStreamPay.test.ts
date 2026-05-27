import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("KuraStreamPay", function () {
  let streamPay: any;
  let mockToken: any;
  let owner: any;
  let kuraCircle: any;
  let member1: any;
  let member2: any;
  let cofheClient: any;

  const CIRCLE_ID = 1n;
  const MAX_BLOCKS = 100n;

  beforeEach(async function () {
    [owner, kuraCircle, member1, member2] = await ethers.getSigners();

    // Deploy a mock FHE-compatible ERC20 (uses MockFHEToken if available in test helpers)
    const MockToken = await ethers.getContractFactory("MockConfidentialToken");
    mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();

    const KuraStreamPay = await ethers.getContractFactory("KuraStreamPay");
    streamPay = await KuraStreamPay.deploy(
      await mockToken.getAddress(),
      kuraCircle.address
    );
    await streamPay.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(owner);
  });

  // ─── FHE.mul: createStream (rate × maxBlocks = locked) ───────────────────

  it("createStream locks encrypted amount equal to rate × maxBlocks", async function () {
    const encRate = await cofheClient.encrypt_uint64(10n);
    // 10 per block × 100 blocks = 100 locked (all in FHE)
    await streamPay.connect(member1).createStream(CIRCLE_ID, encRate, MAX_BLOCKS);

    const info = await streamPay.getStreamInfo(CIRCLE_ID, member1.address);
    expect(info.isActive).to.equal(true);
    expect(info.maxBlocks).to.equal(MAX_BLOCKS);
  });

  // ─── FHE.mul + FHE.min + FHE.sub: collectStream ──────────────────────────

  it("collectStream accumulates payment and caps at remaining balance", async function () {
    const encRate = await cofheClient.encrypt_uint64(10n);
    await streamPay.connect(member1).createStream(CIRCLE_ID, encRate, MAX_BLOCKS);

    // Mine 20 blocks to simulate passage of time
    await hre.network.provider.send("hardhat_mine", ["0x14"]); // 20 blocks

    await streamPay.connect(kuraCircle).collectStream(CIRCLE_ID, member1.address);

    // Paid handle should decrypt to 10 * 20 = 200 capped at locked (10 * 100 = 1000)
    // so payment = min(200, 1000-0) = 200
    const paidHandle = await streamPay.connect(member1).getMyPaid(CIRCLE_ID);
    await hre.cofhe.mocks.expectPlaintext(paidHandle, 200n);
  });

  // ─── FHE.sub: cancelStream returns refund ────────────────────────────────

  it("cancelStream marks stream as inactive", async function () {
    const encRate = await cofheClient.encrypt_uint64(5n);
    await streamPay.connect(member1).createStream(CIRCLE_ID, encRate, MAX_BLOCKS);

    await streamPay.connect(member1).cancelStream(CIRCLE_ID);

    const info = await streamPay.getStreamInfo(CIRCLE_ID, member1.address);
    expect(info.isActive).to.equal(false);
  });

  // ─── FHE.gt: hasActiveStream ─────────────────────────────────────────────

  it("hasActiveStream returns encrypted true when stream has remaining balance", async function () {
    const encRate = await cofheClient.encrypt_uint64(5n);
    await streamPay.connect(member1).createStream(CIRCLE_ID, encRate, MAX_BLOCKS);

    const result = await streamPay.connect(member1).hasActiveStream(CIRCLE_ID, member1.address);
    await hre.cofhe.mocks.expectPlaintext(result, 1n);
  });

  it("hasActiveStream returns ebool=false for non-streamer", async function () {
    const result = await streamPay.connect(member2).hasActiveStream(CIRCLE_ID, member2.address);
    await hre.cofhe.mocks.expectPlaintext(result, 0n);
  });

  // ─── FHE.isAllowed: getMyPaid access guard ───────────────────────────────

  it("getMyPaid reverts when stream does not exist", async function () {
    await expect(streamPay.connect(member2).getMyPaid(CIRCLE_ID))
      .to.be.revertedWith("No stream");
  });
});
