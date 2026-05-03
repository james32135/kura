import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Encryptable } from "@cofhe/sdk";

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

    // Deploy full circle stack so KuraBid.isMember checks work
    const KuraCredit = await ethers.getContractFactory("KuraCredit");
    const kuraCredit = await KuraCredit.deploy();
    await kuraCredit.waitForDeployment();

    const KuraCircle = await ethers.getContractFactory("KuraCircle");
    const kuraCircle = await KuraCircle.deploy(
      await kuraCredit.getAddress(),
      ethers.ZeroAddress, // paymentToken (no contributions in bid tests)
      ethers.ZeroAddress  // roundOrder (set after)
    );
    await kuraCircle.waitForDeployment();

    const KuraRoundOrder = await ethers.getContractFactory("KuraRoundOrder");
    const roundOrder = await KuraRoundOrder.deploy(await kuraCircle.getAddress());
    await roundOrder.waitForDeployment();
    await kuraCircle.setRoundOrder(await roundOrder.getAddress());

    // Create circle (admin is member 0) and let bidders join
    cofheClient = await hre.cofhe.createClientWithBatteries(admin);
    const [encMin] = await cofheClient.encryptInputs([Encryptable.uint64(1n)]).execute();
    await kuraCircle.createCircle(10, 3600, 3, encMin, 0); // circleId = 0

    await kuraCircle.connect(bidder1).joinCircle(0);
    await kuraCircle.connect(bidder2).joinCircle(0);
    await kuraCircle.connect(bidder3).joinCircle(0);

    const KuraBid = await ethers.getContractFactory("KuraBid");
    kuraBid = await KuraBid.deploy(
      await kuraCircle.getAddress(),
      ethers.ZeroAddress  // paymentToken (no payout in unit tests)
    );
    await kuraBid.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(admin);
  });

  it("should allow member to submit encrypted sealed bid", async function () {
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const [encBid] = await client1.encryptInputs([Encryptable.uint64(25n)]).execute();
    const tx = await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, encBid);
    await tx.wait();

    expect(await kuraBid.hasBid(CIRCLE_ID, ROUND, bidder1.address)).to.equal(true);
    expect(await kuraBid.getRoundBidCount(CIRCLE_ID, ROUND)).to.equal(1n);
  });

  it("should silently ignore double bid in same round (no revert)", async function () {
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const [enc1] = await client1.encryptInputs([Encryptable.uint64(25n)]).execute();
    await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc1);

    // Second bid should silently succeed but not add another bid
    const [enc2] = await client1.encryptInputs([Encryptable.uint64(10n)]).execute();
    const tx = await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc2);
    await tx.wait(); // Should NOT revert

    // Still only 1 bid recorded
    expect(await kuraBid.getRoundBidCount(CIRCLE_ID, ROUND)).to.equal(1n);
  });

  it("should track lowest bid via FHE.lte + FHE.select", async function () {
    // Bidder1 bids 50
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const [enc1] = await client1.encryptInputs([Encryptable.uint64(50n)]).execute();
    await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc1);

    // Bidder2 bids 20 (lower)
    const client2 = await hre.cofhe.createClientWithBatteries(bidder2);
    const [enc2] = await client2.encryptInputs([Encryptable.uint64(20n)]).execute();
    await kuraBid.connect(bidder2).submitBid(CIRCLE_ID, ROUND, enc2);

    // Bidder3 bids 35
    const client3 = await hre.cofhe.createClientWithBatteries(bidder3);
    const [enc3] = await client3.encryptInputs([Encryptable.uint64(35n)]).execute();
    await kuraBid.connect(bidder3).submitBid(CIRCLE_ID, ROUND, enc3);

    // Lowest should be 20
    const lowestHandle = await kuraBid.getLowestBidHandle(CIRCLE_ID, ROUND);
    await hre.cofhe.mocks.expectPlaintext(lowestHandle, 20n);
  });

  // settleRound calls FHE.publishDecryptResult which requires a cryptographic signature
  // from the threshold network — this cannot be faked in unit tests.
  it.skip("should allow admin to settleRound with winner [requires threshold network]", async function () {
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const [enc1] = await client1.encryptInputs([Encryptable.uint64(30n)]).execute();
    await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc1);

    // Close round first (required before settleRound)
    await kuraBid.closeRound(CIRCLE_ID, ROUND);

    // Settle with winner info (empty signature — mock bypasses crypto verification)
    await kuraBid.settleRound(CIRCLE_ID, ROUND, bidder1.address, 30, "0x");

    const result = await kuraBid.getRoundResult(CIRCLE_ID, ROUND);
    expect(result.winner).to.equal(bidder1.address);
    expect(result.winningBid).to.equal(30n);
    expect(result.resolved).to.equal(true);
  });

  it.skip("should revert on double settleRound [requires threshold network]", async function () {
    const client1 = await hre.cofhe.createClientWithBatteries(bidder1);
    const [enc1] = await client1.encryptInputs([Encryptable.uint64(30n)]).execute();
    await kuraBid.connect(bidder1).submitBid(CIRCLE_ID, ROUND, enc1);

    await kuraBid.closeRound(CIRCLE_ID, ROUND);
    await kuraBid.settleRound(CIRCLE_ID, ROUND, bidder1.address, 30, "0x");

    await expect(
      kuraBid.settleRound(CIRCLE_ID, ROUND, bidder1.address, 30, "0x")
    ).to.be.revertedWith("Already resolved");
  });
});
