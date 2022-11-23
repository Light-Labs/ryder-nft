// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./ryder-nft.sol";

contract RyderMint {
    uint256 constant MAX_MINT_PER_PRINCIPAL = 2;

    string public constant ERR_UNAUTHORIZED = "403";
    string public constant ERR_ALREADY_DONE = "505";
    string public constant ERR_NOT_LAUNCHED = "506";
    string public constant ERR_MAX_MINT_REACHED = "507";
    string public constant ERR_PAYMENT_FAILED = "508";
    string public constant ERR_INVALID_PAYMENT = "509";

    bool mintLaunched = false;
    uint256 private mintPrice = 1 ether;
    bool private publicMint = false;
    address payable private paymentRecipient;
    address private nftAddress;

    mapping(address => bool) allowList;
    mapping(address => uint256) mintCount;
    mapping(address => bool) admins;

    modifier adminOnly() {
        require(admins[msg.sender], ERR_UNAUTHORIZED);
        _;
    }

    constructor(address deployNftAddress, address[] memory deployAdmins) {
        nftAddress = deployNftAddress;
        admins[msg.sender] = true;
        paymentRecipient = payable(msg.sender);
        for (uint256 i = 0; i < deployAdmins.length; ++i)
            admins[deployAdmins[i]] = true;
    }

    function mint() external payable {
        _mint(1);
    }

    function mint(uint256 amount) external payable {
        _mint(amount);
    }

    function _mint(uint256 amount) private {
        require(mintLaunched, ERR_NOT_LAUNCHED);
        require(allowList[msg.sender] || publicMint, ERR_UNAUTHORIZED);
        require(amount <= 20, ERR_UNAUTHORIZED);
        require(
            publicMint ||
                mintCount[msg.sender] + amount <= MAX_MINT_PER_PRINCIPAL,
            ERR_MAX_MINT_REACHED
        );
        require(msg.value >= mintPrice * amount, ERR_INVALID_PAYMENT);
        mintCount[msg.sender] += amount;
        (bool success, ) = paymentRecipient.call{value: msg.value}("");
        require(success, ERR_PAYMENT_FAILED);
        for (uint256 i = 0; i < amount; ++i)
            RyderNFT(nftAddress).mint(msg.sender);
    }

    function isAllowListed(address who) external view returns (bool) {
        return allowList[who];
    }

    function getPriceInWei() external view returns (uint256) {
        return mintPrice;
    }

    function getMintLaunched() external view returns (bool) {
        return mintLaunched;
    }

    function getPublicMint() external view returns (bool) {
        return publicMint;
    }

    function getPaymentRecipient() external view returns (address payable) {
        return paymentRecipient;
    }

    function getMintCount(address who) external view returns (uint256) {
        return mintCount[who];
    }

    function isAdmin(address who) external view returns (bool) {
        return admins[who];
    }

    // Admin functions

    function setLaunched(bool launched) external adminOnly {
        mintLaunched = launched;
    }

    function setPublicMint(bool isPublic) external adminOnly {
        publicMint = isPublic;
    }

    function setPriceInWei(uint256 price) external adminOnly {
        mintPrice = price;
    }

    function setAllowListedMany(address[] calldata entries) external adminOnly {
        for (uint256 i; i < entries.length; ++i) allowList[entries[i]] = true;
    }

    function setPaymentRecipient(address payable recipient) external adminOnly {
        paymentRecipient = recipient;
    }

    function setAdmin(address newAdmin, bool enabled) external adminOnly {
        admins[newAdmin] = enabled;
    }
}
