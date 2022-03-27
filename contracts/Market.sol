// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./IERC721.sol";

contract Market {
    enum ListingStatus {
        Active,
        Sold,
        Canceled
    }
    struct Listing {
        ListingStatus status;
        address seller;
        address token;
        uint256 token_id;
        uint256 price;
    }

    uint256 private _listingId = 0;
    mapping(uint256 => Listing) private _listings;

    event Listed(
        uint256 listingId,
        address seller,
        address token,
        uint256 tokenId,
        uint256 price
    );

    event Sale(
        uint256 listingId,
        address buyer,
        address token,
        uint256 tokenId,
        uint256 price
    );

    event Cancel(uint256 listingId, address seller);

    function getListing(uint256 listingId)
        public
        view
        returns (Listing memory)
    {
        return _listings[listingId];
    }

    function listToken(
        address token,
        uint256 token_id,
        uint256 price
    ) external {
        IERC721(token).transferFrom(msg.sender, address(this), token_id);
        Listing memory listing = Listing(
            ListingStatus.Active,
            msg.sender,
            token,
            token_id,
            price
        );

        _listingId++;
        _listings[_listingId] = listing;

        emit Listed(_listingId, msg.sender, token, token_id, price);
    }

    function buyToken(uint256 listingId) external payable {
        Listing storage listing = _listings[listingId];
        require(msg.sender != listing.seller, "Seller cannot be buyer");
        require(
            listing.status == ListingStatus.Active,
            "Listing is not active"
        );
        require(msg.value >= listing.price, "Insufficient payment");
        listing.status = ListingStatus.Sold;

        IERC721(listing.token).transferFrom(
            address(this),
            msg.sender,
            listing.token_id
        );

        payable(listing.seller).transfer(listing.price);

        emit Sale(
            listingId,
            msg.sender,
            listing.token,
            listing.token_id,
            listing.price
        );
    }

    function cancel(uint256 listingId) public {
        Listing storage listing = _listings[listingId];
        require(msg.sender == listing.seller, "only seller can cancel listing");
        require(
            listing.status == ListingStatus.Active,
            "Listing is not active"
        );

        listing.status = ListingStatus.Canceled;
        IERC721(listing.token).transferFrom(
            address(this),
            msg.sender,
            listing.token_id
        );

        emit Cancel(listingId, msg.sender);
    }
}
