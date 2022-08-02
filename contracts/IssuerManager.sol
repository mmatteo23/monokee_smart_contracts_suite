// SPDX-License-Identifier: MIT
// Version: 1.0.0
// Author: Matteo Midena
// Business: Monokee

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./IVerificationRegistry.sol";
import "./MonokeeERC721.sol";

pragma solidity ^0.8.0;

/**
 * @title Interface defining basic Issuer functionality.
 */
abstract contract IssuerManager is Pausable, Ownable {

    IVerificationRegistry private _verificationRegistry;
    MonokeeERC721 private _tokenERC721;

    /**********************/
    /* EVENT DECLARATIONS */
    /**********************/
    event ReleasedNewToken (
        address to,
        uint256 tokenId,
        uint256 date
    );

    event ConsumedToken (
        address sender,
        uint256 tokenId,
        uint256 date
    );


    /**
     * @dev The contract constructor creates the contract with VerificationRegistry and MonokeeERC721
     * as input params.
     */
    constructor (IVerificationRegistry verificationRegistry, MonokeeERC721 tokenERC721) {
        _verificationRegistry = verificationRegistry;
        _tokenERC721 = tokenERC721;
    }

    /**
     * @dev This function forwards the verification process to _verificarionRegistry.
     */
    function _verification(address subject) internal view returns(bool) {
        return _verificationRegistry.isVerified(subject);
    }

    /**
     * @dev The contract accepts new token request.
     */
    function acceptNewRequest(string memory tokenURI) public {
        require(_verification(msg.sender), "VerificationRegistry: This subject isn't verified");

        uint256 tokenId = _tokenERC721.safeMint(msg.sender, tokenURI);

        emit ReleasedNewToken(msg.sender, tokenId, block.timestamp);
    }

    /**
     * @dev The contract owner consumes the user token.
     */
    function consumeDiplomaAccessToken(uint256 _tokenId) public onlyOwner {
        
        _tokenERC721.burn(_tokenId);

        emit ConsumedToken(msg.sender, _tokenId, block.timestamp);
    }

    /**************************************
     *             SECURITY
     *************************************/

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}