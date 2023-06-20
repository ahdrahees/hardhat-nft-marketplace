const { network, deployments, getNamedAccounts, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNft Unit Test", function () {
          let basicNft, deployer
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              //   const { deploy } = deployments
              //   const args = []
              //   basicNft = await deploy("BasicNft", {
              //       from: deployer,
              //       log: true,
              //       args: args,
              //       waitConfirmations: 1,
              //   })
              await deployments.fixture(["basicnft"]) // This line will deploy BasicNft contract. it will run 01-deploy-basic-nft.sol file only because it contain "basicnft" tag
              basicNft = await ethers.getContract("BasicNft")
          })

          describe("constructor", function () {
              it("Initializes the contract correctly by setting a `name`, a `symbol` and s_tokenCounter token to the token collection.", async function () {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()

                  assert(name, "Rindappan")
                  assert(symbol, "RIN")
                  assert(tokenCounter.toString(), "0")
              })
          })

          describe("mintNft", function () {
              it("mint a nft", async function () {
                  const beforMintTokenCounter = await basicNft.getTokenCounter()
                  const _tokenCounter = await basicNft.mintNft()
                  const AfterMintTokenCounter = await basicNft.getTokenCounter()

                  assert(_tokenCounter, AfterMintTokenCounter)
                  assert(beforMintTokenCounter + 1, AfterMintTokenCounter)
              })

              it("Show the correct balance and owner of an NFT", async function () {
                  const deployerAddress = deployer.address
                  const txResponse = await basicNft.mintNft()
                  await txResponse.wait(1)
                  const deployerBalance = await basicNft.balanceOf(deployer) // if we put this balanceOf(deployer.address) , it will be this error Error: invalid address or ENS name (argument="name", value=undefined, code=INVALID_ARGUMENT, version=contracts/5.7.0)
                  assert.equal(deployerBalance.toString(), "1")
              })
          })

          describe("tokenURI", function () {
              it("checks the token URI", async function () {
                  const tokenURI = await basicNft.tokenURI(0)
                  assert(tokenURI, await basicNft.TOKEN_URI)
              })
          })

          describe("ownerOf", function () {
              it("checks the owner of the token", async function () {
                  const tokenId = await basicNft.getTokenCounter()
                  await basicNft.mintNft()
                  const owner = await basicNft.ownerOf(tokenId)

                  assert(owner, deployer)
              })
          })
      })
