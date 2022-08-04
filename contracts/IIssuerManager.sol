// SPDX-License-Identifier: MIT
// Version: 1.0.0
// Author: Matteo Midena
// Business: Monokee

pragma solidity ^0.8.0;

interface IIssuerManager {
    
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
     * @dev The contract accepts new token request.
     */
    function acceptNewRequest(string memory tokenURI) external;

    /**
     * @dev The contract owner consumes the user token.
     */
    function consumeAccessToken(uint256 _tokenId) external;


}