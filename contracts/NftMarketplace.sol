// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();

contract NftMarketplace {
    struct Listing {
        uint256 price;
        address seller;
    }

    // NFT Contract Address -> Token Id -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listing;

    // Events
    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    constructor() {}

    //////////////////////
    /// Main functions ///
    //////////////////////

    function listItem(address nftAddress, uint256 tokenId, uint256 price) external {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        // Two ways to list
        // 1. send nft to the contract. Transfer -> contract "hold" the nft. This will be gas expensive. If we do this the marketplace own the nft
        // 2. Owner can still hold their nft. and give the marketplace approval to sell the nft for them
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            // Check our nftmarketplace contract has approval for to handle the nft  to sell
            revert NftMarketplace__NotApprovedForMarketplace();
        }
        s_listing[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }
}

// 1. `listIem`: List NFTs on the marketplace
// 2. `buyItem`: Buy the NFTs
// 3. `cancelItem`: Cancel the listed item
// 4. `updateListing`: Update Price
// 5. `withdrawProceeds`: Withdraw payments for bought NFTs
