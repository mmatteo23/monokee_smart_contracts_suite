// SPDX-License-Identifier: MIT
// Version: 1.0.0
// Author: Matteo Midena
// Business: Monokee

import "./DiplomaERC721.sol";
import "./TrustedSmartContractRegistry.sol";
import "./CredentialSchemaRegistry.sol";
import "./IVerificationRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "hardhat/console.sol";

pragma solidity ^0.8.0;

contract DiplomaIssuerManager is Pausable, Ownable {

    /**************************************
     *        Trusted SC referiments
     *************************************/
    
    //  !! this import isn't correct, because this approach isn't upgradeable !!

    // Trusted Smart Contract Registry
    TrustedSmartContractRegistry private _trustedSmartContractRegistry;
    // DiplomaNFT manager
    DiplomaERC721 private _diplomaERC721;
    // Schema registry
    CredentialSchemaRegistry private _credentialSchemaRegistry;
    // Verification registry
    IVerificationRegistry private _verificationRegistry;
    // ...

    /**************************************
     *              EVENTS
     *************************************/

    event ReleasedNewDiplomaNFT (
        address to,
        uint256 tokenId,
        uint256 date
    );

    event ConsumedDiplomaAccessToken (
        address sender,
        uint256 tokenId,
        uint256 date
    );

    /**************************************
     *             FUNCTIONS
     *************************************/

    constructor (IVerificationRegistry verificationRegistry, DiplomaERC721 diplomaERC721) {
        _verificationRegistry = verificationRegistry;
        _diplomaERC721 = diplomaERC721;
    }

    function _verification(address subject) internal view returns(bool) {
        return _verificationRegistry.isVerified(subject);
    }

    // this contract can mint the NFT for the student but with this system
    // the NFT hasn't metadata, so we need to pass the tokenURI here
    function acceptNewDiplomaRequest(string memory tokenURI) public {
        require(_verification(msg.sender), "VerificationRegistry: This subject isn't verified");

        uint256 tokenId = _diplomaERC721.safeMint(msg.sender, tokenURI);

        emit ReleasedNewDiplomaNFT(msg.sender, tokenId, block.timestamp);
    }

    function revokeDiplomaAccessToken(uint256 tokenId) public onlyOwner {

    }

    function consumeDiplomaAccessToken(uint256 _tokenId) public onlyOwner {
        /*
        bool contratto = _diplomaERC721.hasRole(DEFAULT_ADMIN_ROLE, address(this));
        bool sender = _diplomaERC721.hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        console.log("Contratto: ", contratto, "Sender: ", sender);
        */
        _diplomaERC721.burn(_tokenId);

        emit ConsumedDiplomaAccessToken(msg.sender, _tokenId, block.timestamp);
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