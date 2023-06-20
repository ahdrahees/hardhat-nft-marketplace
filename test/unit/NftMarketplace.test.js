const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NftMarketplace unit test", function () {
          let nftMarketplace, basicNft, deployer, player, user
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              //   player = (await getNamedAccounts()).player
              const accounts = await ethers.getSigners()
              player = accounts[1]
              user = accounts[2]
              await deployments.fixture(["all"])
              nftMarketplace = await ethers.getContract("NftMarketplace")
              basicNft = await ethers.getContract("BasicNft")
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })
          it("list and can be bought", async function () {
              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              const playerConnectedNftMarketplace = await nftMarketplace.connect(player)
              await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                  value: PRICE,
              })
              const newOwner = await basicNft.ownerOf(TOKEN_ID)
              const deployerProceeds = await nftMarketplace.getProceeds(deployer)
              assert.equal(player.address, newOwner.toString())
              assert.equal(deployerProceeds.toString(), PRICE.toString())
          })
          describe("listItem", function () {
              it("revert if the price is less than or equal to zero", async function () {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
                  ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
              })
              it("reverts if we try to list already listed nft on marketplace", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)

                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__AlreadyListed")
              })
              it("revert if the sellet is not the owner of the NFT", async function () {
                  const playerConnectedNftMarketplace = await nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
              it("reverts if the marketplace is not approve to list the NFT", async function () {
                  await basicNft.mintNft() // new nft minted it has tokenId of 1
                  await expect(
                      nftMarketplace.listItem(basicNft.address, 1, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
              })
              it("list an NFT correctly and update listing", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == PRICE)
                  assert(listing.seller == deployer)
              })
              it("emit an event when NFT is listed", async function () {
                  await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      nftMarketplace,
                      "ItemListed"
                  )
              })
          })
          describe("buyItem", function () {
              beforeEach(async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              })
              it("revert if the nft is not listed on marketplace", async function () {
                  await basicNft.mintNft() // new nft minted it has tokenId of 1
                  // this nft is not listed
                  await expect(nftMarketplace.buyItem(basicNft.address, 1)).to.be.revertedWith(
                      "NftMarketplace__NotListed"
                  )
              })
              it("revert if the price is not met", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: ethers.utils.parseEther("0.01"),
                      })
                  ).to.be.revertedWith("NftMarketplace__PriceNotMet")
              })
              it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                  const userConnectedNftMarketplace = await nftMarketplace.connect(user)
                  await userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  const proceeds = await nftMarketplace.getProceeds(deployer)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)

                  assert.equal(listing.price.toString(), "0")
                  assert.equal(listing.seller, "0x0000000000000000000000000000000000000000")
                  assert(proceeds.toString() == PRICE.toString())
              })
              it("emit an event when NFT is bought", async function () {
                  const userConnectedNftMarketplace = await nftMarketplace.connect(user)
                  await await expect(
                      userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.emit(userConnectedNftMarketplace, "ItemBought")
              })
          })
          describe("cancelListing", function () {
              it("revert if the cancel listing nft is not listed on marketplace", async function () {
                  await basicNft.mintNft() // new nft minted it has tokenId of 1
                  // this nft is not listed
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, 1)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })
              it("revert if  cancelling is not from the seller", async function () {
                  const playerConnectedNftMarketplace = await nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
              it("cancel the listing of NFT and delete from s_listing", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)

                  assert.equal(listing.price.toString(), "0")
                  assert.equal(listing.seller, "0x0000000000000000000000000000000000000000")
              })
              it("emit an event when cancel listing", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                      nftMarketplace,
                      "ItemCanceled"
                  )
              })
          })
          describe("updateListing", function () {
              let newPrice
              beforeEach(async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  newPrice = ethers.utils.parseEther("0.1")
              })
              it("revert if the update list done not by the owner", async function () {
                  const playerConnectedNftMarketplace = await nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          newPrice
                      )
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
              it("revert if the update listing of nft that is not listed on marketplace", async function () {
                  await basicNft.mintNft() // new nft minted it has tokenId of 1
                  // this nft is not listed
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, 1, newPrice)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })
              it("revert if the  new price is less than or equal to zero", async function () {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, 0)
                  ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
              })
              it("update list correctly and set new Price", async function () {
                  await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, newPrice)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert.equal(listing.price.toString(), newPrice.toString())
              })
              it("it emit an event after updating listing", async function () {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, newPrice)
                  ).to.emit(nftMarketplace, "ItemListed")
              })
          })
          describe("withdrawProceeds", function () {
              it("doesn't allow zero proceeds withdrawal", async function () {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
                      "NftMarketplace__NoProceeds"
                  )
              })
              it("withdraw proceeds", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const userConnectedNftMarketplace = await nftMarketplace.connect(user)
                  await userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  const proceedsFromSelligNFT = await nftMarketplace.getProceeds(deployer)
                  await nftMarketplace.withdrawProceeds()
                  const proceedsAfterWithdraw = await nftMarketplace.getProceeds(deployer)

                  assert.equal(proceedsFromSelligNFT.toString(), PRICE.toString())
                  assert.equal(proceedsAfterWithdraw.toString(), "0")
              })
              it("call{} Failed to send Ether", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const userConnectedNftMarketplace = await nftMarketplace.connect(user)
                  await userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  const withdrawTx = await nftMarketplace.withdrawProceeds()
                  // Check if the transaction was successful
                  expect(withdrawTx)
                      .to.emit(nftMarketplace, "NftMarketplace__TransferFailed")
                      .withArgs()
              })
          })
      })
