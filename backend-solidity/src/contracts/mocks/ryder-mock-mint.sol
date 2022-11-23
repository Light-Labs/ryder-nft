// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "../ryder-nft.sol";

contract RyderMockMint {
    RyderNFT private nftAddress;

    constructor(RyderNFT deployNftAddress) {
        nftAddress = deployNftAddress;
    }

    function mint() external {
        _mint(1, msg.sender);
    }

    function mint(uint256 amount) external {
        _mint(amount, msg.sender);
    }

    function mint(address recipient) external {
        _mint(1, recipient);
    }

    function _mint(uint256 amount, address recipient) private {
        for (uint256 i = 0; i < amount; ++i) nftAddress.mint(recipient);
    }
}
