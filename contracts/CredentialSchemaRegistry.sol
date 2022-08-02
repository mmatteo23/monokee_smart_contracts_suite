// SPDX-License-Identifier: MIT
// Version: 1.0.0
// Author: Matteo Midena
// Business: Monokee

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

contract CredentialSchemaRegistry {
    using Counters for Counters.Counter;

    address private _owner;
    mapping(address => bool) private _schemaIssuers;

    struct Schema {
        string json;
        address author;
        bool trusted;
        uint256 registrationDate;
    }

    mapping (uint => Schema) private _registry;

    mapping (address => uint[]) private _registryForAuthor;
    Counters.Counter private _schemaCounter;

    /**************************************
     *              EVENTS
     *************************************/

    modifier onlyOwner() {
        require(
            _owner == msg.sender, 
            "only the owner can call this function"
        );
        _;
    }

    modifier onlySchemaIssuer() {
        require(
            _schemaIssuers[msg.sender] != false,
            "only registered issuer can call this function"
        );
        _;
    }

    /**************************************
     *              EVENTS
     *************************************/

    event SchemaRegistered (
        uint schemaId,
        string schemaJson,
        address author,
        bool trusted,
        uint256 registrationDate
    );

    event EditedSchemaTrust (
        uint schemaId,
        bool trusted,
        uint256 modificationDate
    );    

    /**************************************
     *             FUNCTIONS
     *************************************/

    constructor() {
        _owner = msg.sender;
    }

    function register(string memory _json, bool _trusted) public onlySchemaIssuer {
        _schemaCounter.increment();
        uint newIndex = _schemaCounter.current();
        // writing in double mapping
        _registry[newIndex] = Schema(_json, msg.sender, _trusted, block.timestamp);
        _registryForAuthor[msg.sender].push(newIndex);

        emit SchemaRegistered(newIndex, _json, msg.sender, _trusted, block.timestamp);
    }

    function editTrust(uint _schemaId, bool _trusted) public onlySchemaIssuer {
        Schema memory rs = _registry[_schemaId];
        rs.trusted = _trusted;
        _registry[_schemaId] = rs;

        emit EditedSchemaTrust(_schemaId, _trusted, block.timestamp);
    }

    function isTrusted(uint _schemaId) public view returns(bool) {
        require(
            _registry[_schemaId].author != address(0),
            "CredentialSchema not registered"
        );
        return _registry[_schemaId].trusted;
    }

    /**************************************
     *               VIEWS
     *************************************/

    function getSchemaCount() external view returns(uint256) {
        return _schemaCounter.current();
    }

    function getSchema(uint _schemaId) external view returns(Schema memory) {
        return _registry[_schemaId];
    }
}
