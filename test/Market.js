const { expectRevert, expectEvent, BN } = require("@openzeppelin/test-helpers");
const { assert } = require("console");
const Market = artifacts.require("Market");
const NFT = artifacts.require("NFT");

contract("Market", (accounts) => {
  let market;
  let token;
  let minter = accounts[1];
  let buyer = accounts[2];

  const tokenId = new BN(1);
  const price = new BN(1000);
  const listingId = new BN(1);

  describe("List token", () => {
    before(async () => {
      market = await Market.new();
      token = await NFT.new();

      await token.mint({ from: minter });
    });

    it("should prevent listing - contact not approved", () => {
      expectRevert(
        market.listToken(token.address, tokenId, price),
        "ERC721: transfer caller is not owner nor approved"
      );
    });

    it("should execute listing", async () => {
      await token.approve(market.address, tokenId, { from: minter });
      const tx = await market.listToken(token.address, tokenId, price, {
        from: minter,
      });

      expectEvent(tx, "Listed", {
        listingId,
        seller: minter,
        token: token.address,
        tokenId,
        price,
      });

      return token.ownerOf(tokenId).then((owner) => {
        assert(owner, market.address);
      });
    });
  });

  describe("Buy listing", () => {
    before(async () => {
      market = await Market.new();
      token = await NFT.new();

      await token.mint({ from: minter });
      await token.approve(market.address, tokenId, { from: minter });

      await market.listToken(token.address, tokenId, price, { from: minter });
    });

    it("should prevent sell - seller can not be buyer", () => {
      return expectRevert(
        market.buyToken(listingId, { from: minter }),
        "Seller cannot be buyer"
      );
    });

    it("should prevent sell - insufficient price", () => {
      return expectRevert(
        market.buyToken(listingId, { from: buyer, value: price - 1 }),
        "Insufficient payment"
      );
    });

    it("should execute sell", async () => {
      const tx = await market.buyToken(listingId, {
        from: buyer,
        value: price,
      });

      expectEvent(tx, "Sale", {
        listingId,
        buyer,
        token: token.address,
        tokenId,
        price,
      });

      return token.ownerOf(tokenId).then((owner) => {
        assert(owner, buyer);
      });
    });

    it("should prevent sell - listing is not active", () => {
      return expectRevert(
        market.buyToken(listingId, { from: buyer, value: price }),
        "Listing is not active"
      );
    });
  });

  describe("Cancel listing", () => {
    before(async () => {
      market = await Market.new();
      token = await NFT.new();

      await token.mint({ from: minter });
      await token.approve(market.address, tokenId, { from: minter });

      await market.listToken(token.address, tokenId, price, { from: minter });
    });

    it("should prevent cancellation - only seller can cancel", () => {
      return expectRevert(
        market.cancel(listingId, { from: buyer }),
        "only seller can cancel listing"
      );
    });

    it("should execute cancellation", async () => {
      let tx = await market.cancel(listingId, { from: minter });

      expectEvent(tx, "Cancel", { listingId, seller: minter });
    });

    it("should prevent sell - listing is not active", () => {
      return expectRevert(
        market.cancel(listingId, { from: minter }),
        "Listing is not active"
      );
    });
  });
});
