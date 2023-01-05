// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./ryder-nft.sol";

contract RyderMintV2 {
    uint256 constant BLOCK_HEIGHT_INCREMENT = 1;

    string public constant ERR_UNAUTHORIZED = "403";
    string public constant ERR_NOT_LAUNCHED = "506";
    string public constant ERR_SOLD_OUT = "507";
    string public constant ERR_PAYMENT_FAILED = "508";
    string public constant ERR_INVALID_PAYMENT = "509";
    string public constant ERR_NOT_ALLOWED = "510";
    string public constant ERR_NO_CLAIMS = "511";
    string public constant ERR_CLAIM_EXPIRED = "512";
    string public constant ERR_CLAIM_NOT_EXPIRED = "513";

    bool private mintLaunched = false;
    uint256 private mintPrice = 0.25 ether;

    uint256 private lowerMintId = 0;
    uint256 private upperMintId = 0;
    uint256 private lastTransferredId = 0;

    address payable private paymentRecipient;
    RyderNFT private nftAddress;
    uint256 private availableForPurchase = 0;

    mapping(uint256 => mapping(address => uint256)) nftClaims;
    mapping(uint256 => uint256) tokenMapping;
    mapping(address => bool) admins;

    modifier adminOnly() {
        require(admins[msg.sender], ERR_UNAUTHORIZED);
        _;
    }

    constructor(RyderNFT deployNftAddress, address[] memory deployAdmins) {
        nftAddress = deployNftAddress;
        admins[msg.sender] = true;
        paymentRecipient = payable(msg.sender);
        for (uint256 i = 0; i < deployAdmins.length; ++i)
            admins[deployAdmins[i]] = true;
    }

    function getNftClaims(uint256 height, address buyer)
        public
        view
        returns (uint256)
    {
        return nftClaims[height][buyer];
    }

    function buy() external payable {
        _buy(1);
    }

    function buy(uint256 amount) external payable {
        _buy(amount);
    }

    function getRandomSeed(uint256 height) public view returns (bytes32) {
        require(height < block.number, ERR_NOT_ALLOWED);
        require(block.number - height < 256, ERR_CLAIM_EXPIRED);
        return keccak256(abi.encode(blockhash(height), lastTransferredId));
    }

    function pickNextRandomTokenId(
        uint256 lowerBound,
        uint256 upperBound,
        uint256 height
    ) public view returns (uint256) {
        return
            lowerBound +
            (uint256(getRandomSeed(height)) % (upperBound - lowerBound));
    }

    function _buy(uint256 amount) private returns (uint256) {
        require(mintLaunched, ERR_NOT_LAUNCHED);
        require(availableForPurchase >= amount, ERR_SOLD_OUT);
        require(msg.value >= mintPrice * amount, ERR_INVALID_PAYMENT);
        (bool success, ) = paymentRecipient.call{value: msg.value}("");
        require(success, ERR_PAYMENT_FAILED);
        availableForPurchase -= amount;
        nftClaims[block.number + BLOCK_HEIGHT_INCREMENT][msg.sender] += amount;
        return block.number + BLOCK_HEIGHT_INCREMENT;
    }

    function refreshBuyClaims(uint256 height, address buyer)
        public
        returns (uint256)
    {
        require(
            height < block.number && block.number - height >= 256,
            ERR_CLAIM_NOT_EXPIRED
        );
        uint256 claims = getNftClaims(height, buyer);
        require(claims > 0, ERR_NO_CLAIMS);
        nftClaims[height][buyer] = 0;
        nftClaims[block.number + BLOCK_HEIGHT_INCREMENT][buyer] = claims;
        return block.number + BLOCK_HEIGHT_INCREMENT;
    }

    function claim(uint256 height) public returns (uint256) {
        return claimFor(height, msg.sender);
    }

    function claimFor(uint256 height, address buyer) public returns (uint256) {
        uint256 claims = getNftClaims(height, buyer);
        require(claims > 0, ERR_NO_CLAIMS);
        require(buyer == msg.sender || admins[msg.sender], ERR_UNAUTHORIZED);
        uint256 index = pickNextRandomTokenId(lowerMintId, upperMintId, height);
        uint256 transferId = tokenMapping[index] != 0
            ? tokenMapping[index]
            : index;
        tokenMapping[index] = tokenMapping[upperMintId] != 0
            ? tokenMapping[upperMintId]
            : upperMintId;
        --upperMintId;
        lastTransferredId = transferId;
        --nftClaims[height][buyer];
        nftAddress.safeTransferFrom(address(this), buyer, transferId);
        return transferId;
    }

    function claimMany(uint256[] calldata heights)
        public
        returns (uint256[] memory result)
    {
        result = new uint256[](heights.length);
        for (uint256 i = 0; i < heights.length; ++i)
            result[i] = claimFor(heights[i], msg.sender);
    }

    function getPriceInWei() external view returns (uint256) {
        return mintPrice;
    }

    function getMintLaunched() external view returns (bool) {
        return mintLaunched;
    }

    function getPaymentRecipient() external view returns (address payable) {
        return paymentRecipient;
    }

    function isAdmin(address who) external view returns (bool) {
        return admins[who];
    }

    // Admin functions

    function mintToContract(uint16 amount) external adminOnly {
        require(!mintLaunched, ERR_NOT_ALLOWED);
        if (upperMintId == 0) upperMintId = nftAddress.getTokenIdNonce();
        for (uint16 i = 0; i < amount; ++i) nftAddress.mint(address(this));
        lowerMintId = nftAddress.getTokenIdNonce() + 1;
        availableForPurchase = upperMintId - lowerMintId + 1;
    }

    function setLaunched(bool launched) external adminOnly {
        mintLaunched = launched;
    }

    function setPriceInWei(uint256 price) external adminOnly {
        mintPrice = price;
    }

    function setPaymentRecipient(address payable recipient) external adminOnly {
        paymentRecipient = recipient;
    }

    function setAdmin(address newAdmin, bool enabled) external adminOnly {
        require(newAdmin != msg.sender, ERR_NOT_ALLOWED);
        admins[newAdmin] = enabled;
    }
}
