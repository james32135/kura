import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("KuraBid", function () {
  let kuraBid: any;
  let admin: any;
  let bidder1: any;
  let bidder2: any;
  let bidder3: any;
  let cofheClient: any;

  const CIRCLE_ID = 0;
  const ROUND = 1;

  beforeEach(async function () {
    [admin, bidder1, bidder2, bidder3] = await ethers.getSigners();

    const KuraBid = await ethers.getContractFactory("KuraBid");
    kuraBid = await KuraBid.deploy();
    await kuraBid.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(admin);
  });

  it("should allow member to submit encrypted sealed bid", async function () {
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const encBid = await client1.encrypt(25n, "uint64");
    const tx = await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, encBid);
    await tx.wait();

    expect(await kuraBid.hasBid(CIRCLE_ID, ROUND, bidder1.address)).to.equal(true);
    expect(await kuraBid.getRoundBidCount(CIRCLE_ID, ROUND)).to.equal(1n);
  });

  it("should silently ignore double bid in same round (no revert)", async function () {
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const enc1 = await client1.encrypt(25n, "uint64");
    await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc1);

    // Second bid should silently succeed but not add another bid
    const enc2 = await client1.encrypt(10n, "uint64");
    const tx = await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc2);
    await tx.wait(); // Should NOT revert

    // Still only 1 bid recorded
    expect(await kuraBid.getRoundBidCount(CIRCLE_ID, ROUND)).to.equal(1n);
  });

  it("should track lowest bid via FHE.lte + FHE.select", async function () {
    // Bidder1 bids 50
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const enc1 = await client1.encrypt(50n, "uint64");
    await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc1);

    // Bidder2 bids 20 (lower)
    const client2 = await hre.cofhe.createClientWithBatteries(bidder2);
    const enc2 = await client2.encrypt(20n, "uint64");
    await kuraBid.connect(bidder2).submitBid(CIRCLE_ID, ROUND, enc2);

    // Bidder3 bids 35
    const client3 = await hre.cofhe.createClientWithBatteries(bidder3);
    const enc3 = await client3.encrypt(35n, "uint64");
    await kuraBid.connect(bidder3).submitBid(CIRCLE_ID, ROUND, enc3);

    // Lowest should be 20
    const lowestHandle = await kuraBid.getLowestBidHandle(CIRCLE_ID, ROUND);
    const lowestPlaintext = await hre.cofhe.mocks.expectPlaintext(lowestHandle);
    expect(lowestPlaintext).to.equal(20n);
  });

  it("should allow admin to settleRound with winner", async function () {
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const enc1 = await client1.encrypt(30n, "uint64");
    await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc1);

    // Close round first (required before settleRound)
    await kuraBid.closeRound(CIRCLE_ID, ROUND);

    // Settle with winner info
    await kuraBid.settleRound(CIRCLE_ID, ROUND, bidder1.address, 30);

    const result = await kuraBid.getRoundResult(CIRCLE_ID, ROUND);
    expect(result.winner).to.equal(bidder1.address);
    expect(result.winningBid).to.equal(30n);
    expect(result.resolved).to.equal(true);
  });

  it("should revert on double settleRound", async function () {
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const enc1 = await client1.encrypt(30n, "uint64");
    await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc1);

    await kuraBid.closeRound(CIRCLE_ID, ROUND);
    await kuraBid.settleRound(CIRCLE_ID, ROUND, bidder1.address, 30);

    await expect(
      kuraBid.settleRound(CIRCLE_ID, ROUND, bidder1.address, 30)
    ).to.be.revertedWith("Already resolved");
  });
});
