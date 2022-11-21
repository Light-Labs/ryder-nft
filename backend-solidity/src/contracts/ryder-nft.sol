// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// import "hardhat/console.sol";
import "./tokens/nf-token.sol";
import "./tokens/erc721-metadata.sol";

contract RyderNFT is NFToken, ERC721Metadata {
    string public constant NFT_NAME = "Ryder NFT";
    string public constant NFT_SYMBOL = "RYD";

    uint256 constant MAX_TOKENS = 5003;

    uint256 constant TIER_LOWER_BOUND_T2 = 103;
    uint256 constant TIER_LOWER_BOUND_T3 = 4368;
    uint256 constant TIER_LOWER_BOUND_T4 = 4868;
    uint256 constant TIER_LOWER_BOUND_T5 = 4968;
    uint256 constant TIER_LOWER_BOUND_T6 = 4988;
    uint256 constant TIER_LOWER_BOUND_T7 = 4998;

    string public constant ERR_UNAUTHORIZED = "403";
    string public constant ERR_ALREADY_DONE = "505";
    string public constant ERR_MAX_MINT_REACHED = "507";

    bool private dicksonParameterSet = false;
    uint256 private dicksonParameter = 0;
    uint256 private tokenIdNonce = 5003;
    uint256 private mintLimit = 2000;
    string private nftTokenUriBase = "ipfs://ipfs/Qm../"; // without .json
    string private nftTokenUriSuffix = ".json";
    bool private metadataFrozen = false;

    mapping(address => bool) minters;
    mapping(address => bool) admins;

    modifier adminOnly() {
        require(admins[msg.sender], ERR_UNAUTHORIZED);
        _;
    }

    constructor(address[] memory deployAdmins) {
        supportedInterfaces[0x01ffc9a7] = true; // ERC165
        supportedInterfaces[0x5b5e139f] = true; // ERC721Metadata
        admins[msg.sender] = true;
        for (uint256 i = 0; i < deployAdmins.length; ++i)
            admins[deployAdmins[i]] = true;
    }

    // ERC721 metadata

    function name() external pure returns (string memory _name) {
        _name = NFT_NAME;
    }

    function symbol() external pure returns (string memory _symbol) {
        _symbol = NFT_SYMBOL;
    }

    function tokenURI(uint256 tokenId)
        external
        view
        validNFToken(tokenId)
        returns (string memory)
    {
        return
            string.concat(
                nftTokenUriBase,
                uint256ToString(tokenId),
                nftTokenUriSuffix
            );
    }

    function mint(address recipient) external {
        require(minters[msg.sender], ERR_UNAUTHORIZED);
        require(tokenIdNonce > mintLimit, ERR_ALREADY_DONE);
        _mint(recipient, tokenIdNonce);
        --tokenIdNonce;
    }

    function burn(uint256 tokenId) external canTransfer(tokenId) {
        _burn(tokenId);
    }

    function getBalance(address who) external view returns (uint256) {
        return _getOwnerNFTCount(who);
    }

    function tokenIdToTierId(uint256 _tokenId) public view returns (uint256) {
        return
            !dicksonParameterSet
                ? 0
                : (_tokenId**5 +
                    dicksonParameter *
                    _tokenId**3 +
                    3002 *
                    dicksonParameter**2 *
                    _tokenId +
                    dicksonParameter) % MAX_TOKENS;
    }

    function tier(uint256 tierId) public pure returns (uint256) {
        if (tierId >= TIER_LOWER_BOUND_T2) return 1;
        if (tierId >= TIER_LOWER_BOUND_T3) return 2;
        if (tierId >= TIER_LOWER_BOUND_T4) return 3;
        if (tierId >= TIER_LOWER_BOUND_T5) return 4;
        if (tierId >= TIER_LOWER_BOUND_T6) return 5;
        if (tierId >= TIER_LOWER_BOUND_T7) return 6;
        return 7;
    }

    /**
     *
     */
    function tierById(uint256 tokenId)
        external
        view
        validNFToken(tokenId)
        returns (uint256)
    {
        return tier(tokenIdToTierId(tokenId));
    }

    // Admin functions

    function setDicksonParameter(uint256 _dicksonParameter) external adminOnly {
        require(!dicksonParameterSet, ERR_ALREADY_DONE);
        dicksonParameter = _dicksonParameter;
        dicksonParameterSet = true;
    }

    function setTokenUri(
        string memory tokenUriBase,
        string memory tokenUriSuffix
    ) external adminOnly {
        require(!metadataFrozen, ERR_UNAUTHORIZED);
        nftTokenUriBase = tokenUriBase;
        nftTokenUriSuffix = tokenUriSuffix;
    }

    function freezeMetadata() external adminOnly {
        require(!metadataFrozen, ERR_UNAUTHORIZED);
        metadataFrozen = true;
    }

    function setMinter(address minter, bool enabled) external adminOnly {
        minters[minter] = enabled;
    }

    function setAdmin(address newAdmin, bool enabled) external adminOnly {
        admins[newAdmin] = enabled;
    }

    function setMintLimit(uint256 newLimit) external adminOnly {
        require(newLimit < tokenIdNonce, ERR_MAX_MINT_REACHED);
        mintLimit = newLimit;
    }

    // Helpers

    // Courtesy of https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Strings.sol
    bytes16 private constant _SYMBOLS = "0123456789abcdef";

    function uint256ToString(uint256 value)
        internal
        pure
        returns (string memory)
    {
        unchecked {
            uint256 length = log10(value) + 1;
            string memory buffer = new string(length);
            uint256 ptr;
            /// @solidity memory-safe-assembly
            assembly {
                ptr := add(buffer, add(32, length))
            }
            while (true) {
                ptr--;
                /// @solidity memory-safe-assembly
                assembly {
                    mstore8(ptr, byte(mod(value, 10), _SYMBOLS))
                }
                value /= 10;
                if (value == 0) break;
            }
            return buffer;
        }
    }

    // Courtesy of https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/Math.sol
    function log10(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >= 10**64) {
                value /= 10**64;
                result += 64;
            }
            if (value >= 10**32) {
                value /= 10**32;
                result += 32;
            }
            if (value >= 10**16) {
                value /= 10**16;
                result += 16;
            }
            if (value >= 10**8) {
                value /= 10**8;
                result += 8;
            }
            if (value >= 10**4) {
                value /= 10**4;
                result += 4;
            }
            if (value >= 10**2) {
                value /= 10**2;
                result += 2;
            }
            if (value >= 10**1) {
                result += 1;
            }
        }
        return result;
    }
}
