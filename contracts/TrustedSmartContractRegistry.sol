// SPDX-License-Identifier: MIT
// Version: 1.0.0
// Author: Matteo Midena
// Business: Monokee

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TrustedSmartContractRegistry is Ownable {
    using Counters for Counters.Counter;

    struct SmartContract {
        address addr;
        string name;
        bool trusted;
        uint256 registrationDate;
    }

    mapping (address => SmartContract) private _registry;
    Counters.Counter private _contractCounter;

    /**************************************
     *              EVENTS
     *************************************/

    event SmartContractRegistered (
        string contractName,
        address contractAddress,
        bool trusted,
        uint256 registrationDate
    );

    event EditedSmartContractTrust (
        address contractAddress,
        bool trusted,
        uint256 modificationDate
    );
    

    /**************************************
     *             FUNCTIONS
     *************************************/

    function register(address _addr, string memory _name, bool _trusted) public onlyOwner {
        _registry[_addr] = SmartContract(_addr, _name, _trusted, block.timestamp);
        _contractCounter.increment();
        emit SmartContractRegistered(_name, _addr, _trusted, block.timestamp);
    }

    function editTrust(address _addr, bool _trusted) public onlyOwner {
        SmartContract memory sc = _registry[_addr];
        sc.trusted = _trusted;
        _registry[_addr] = sc;
        
        emit EditedSmartContractTrust(_addr, _trusted, block.timestamp);
    }

    function isTrusted(address _addr) public view returns(bool) {
        require(
            _registry[_addr].addr != address(0),
            "This contract is not registered"
        );
        return _registry[_addr].trusted;
    }

    /**************************************
     *               VIEWS
     *************************************/

    function getContractCount() external view returns(uint256) {
        return _contractCounter.current();
    }

    function getContract(address _addr) external view returns(SmartContract memory) {
        return _registry[_addr];
    }
}
