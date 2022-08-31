// SPDX-License-Identifier: MIT
// Version: 1.0.0
// Author: Matteo Midena
// Business: Monokee

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";          // This library is used to help us decode signed and hashed data.
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";   // This library helps us with signature validation and hashing (it requires a name and a version)

import "./IVerificationRegistry2.sol";

//import "hardhat/console.sol";


contract VerificationRegistry2 is Ownable, EIP712("VerificationRegistry", "1.0"), IVerificationRegistry2 {

    // Verifier addresses mapped to metadata (VerifierInfo) about the Verifiers.
    mapping(address => VerifierInfo) private _verifiers;

    // Verifier signing keys mapped to verifier addresses
    mapping(address => address) private _signers;

    // Total number of active registered verifiers
    uint256 private _verifierCount;

    // All verification records keyed by their uuids
    mapping(string => mapping(bytes32 => VerificationRecord)) private _verifications;

    // Verifications mapped to subject addresses (those who receive verifications)
    mapping(address => mapping(string => bytes32[])) private _verificationsForSubject;

    // Verifications issued by a given trusted verifier (those who execute verifications)
    mapping(address => mapping(string => bytes32[])) private _verificationsForVerifier;

    // Total verifications registered (mapping keys not being enumerable, countable, etc)
    uint256 private _verificationRecordCount;

    /****************************************************************
     *
     *                          MODIFIERS
     *
     ***************************************************************/

    modifier onlyVerifier() {
        require(
            _verifiers[msg.sender].name != 0,
            "VerificationRegistry: Caller is not a Verifier"
        );
        _;
    }

    /****************************************************************
     *
     *                          FUNCTIONS
     *
     ***************************************************************/

    function addVerifier(address verifierAddress, VerifierInfo memory verifierInfo) 
        external 
        override 
        onlyOwner 
    {
        require(_verifiers[verifierAddress].name == 0, "VerificationRegistry: Verifier Address Exists");
        _verifiers[verifierAddress] = verifierInfo;
        _signers[verifierInfo.signer] = verifierAddress;
        _verifierCount++;
        
        emit VerifierAdded(verifierAddress, verifierInfo);
    }

    function updateVerifier(address verifierAddress, VerifierInfo memory verifierInfo) 
        external 
        override 
        onlyOwner 
    {
        require(_verifiers[verifierAddress].name != 0, "VerificationRegistry: Unknown Verifier Address");
        _verifiers[verifierAddress] = verifierInfo;
        _signers[verifierInfo.signer] = verifierAddress;
        
        emit VerifierUpdated(verifierAddress, verifierInfo);
    }

    function removeVerifier(address verifierAddress)
        external
        override
        onlyOwner 
    {
        require(_verifiers[verifierAddress].name != 0, "VerificationRegistry: Verifier Address Does Not Exist");
        delete _signers[_verifiers[verifierAddress].signer];
        delete _verifiers[verifierAddress];
        _verifierCount--;

        emit VerifierRemoved(verifierAddress);
    }

    // This method doesn't remove the record but change revoked flag. This is helpful when performing audits and tracking record history
    function revokeVerification(bytes32 uuid, string memory indexType) 
        external 
        override 
        onlyVerifier 
    {
        require(_verifications[indexType][uuid].verifier == msg.sender, "VerificationRegistry: Caller is not the original verifier");
        _verifications[indexType][uuid].revoked = true;
        
        emit VerificationRevoked(uuid);
    }

    function removeVerification(bytes32 uuid, string memory indexType)
        external 
        override 
        onlyVerifier 
    {
        require(_verifications[indexType][uuid].verifier == msg.sender, "VerificationRegistry: Caller is not the verifier of the referenced record");
        delete _verifications[indexType][uuid];
        
        emit VerificationRemoved(uuid);
    }



    /****************************************************************
     *
     *                    VERIFICATION LOGIC
     *
     ***************************************************************/

    function isVerified(address subject, string memory indexType) external override view returns (bool) {
        require(subject != address(0), "VerificationRegistry: Invalid address");
        bytes32[] memory subjectRecords = _verificationsForSubject[subject][indexType];
        for (uint i=0; i<subjectRecords.length; i++) {
            VerificationRecord memory record = _verifications[indexType][subjectRecords[i]];
            if (!record.revoked && record.expirationTime > block.timestamp) {       // if it isn't revoked and not expired
                return true;
            }
        }
        return false;
    }

    function registerVerification(VerificationResult memory verificationResult, bytes memory signature) 
        external 
        override 
        onlyVerifier 
        returns (VerificationRecord memory) 
    {
        // _validateVerificationResult is a function that uses EIP712 standard and verifies both the signature and the
        // format of the record before inserting it into the registry
        VerificationRecord memory verificationRecord = _validateVerificationResult(verificationResult, signature);
        require(
            verificationRecord.verifier == msg.sender,
            "VerificationRegistry: Caller is not the verifier of the verification"
        );
        _persistVerificationRecord(verificationRecord);
        
        emit VerificationResultConfirmed(verificationRecord);
        return verificationRecord;
    }

    function _persistVerificationRecord(VerificationRecord memory verificationRecord) internal {
        // persist the record count and the record itself, and map the record to verifier and subject
        _verificationRecordCount++;
        _verifications[verificationRecord.indexType][verificationRecord.uuid] = verificationRecord;
        _verificationsForSubject[verificationRecord.subject][verificationRecord.indexType].push(verificationRecord.uuid);
        _verificationsForVerifier[verificationRecord.verifier][verificationRecord.indexType].push(verificationRecord.uuid);
    }

    function _registerVerificationBySubject(VerificationResult memory verificationResult, bytes memory signature) 
        internal 
        returns (VerificationRecord memory) 
    {
        require(
            verificationResult.subject == msg.sender,
            "VerificationRegistry: Caller is not the verified subject"
        );
        VerificationRecord memory verificationRecord = _validateVerificationResult(verificationResult, signature);
        _persistVerificationRecord(verificationRecord);
        
        emit VerificationResultConfirmed(verificationRecord);
        return verificationRecord;
    }

    function _removeVerificationBySubject(bytes32 uuid, string memory indexType) internal {
        require(
            _verifications[indexType][uuid].subject == msg.sender,
            "VerificationRegistry: Caller is not the subject of the referenced record"
        );
        delete _verifications[indexType][uuid];

        emit VerificationRemoved(uuid);
    }

    function _validateVerificationResult(VerificationResult memory verificationResult, bytes memory signature) 
        internal 
        view 
        returns(VerificationRecord memory) 
    {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            keccak256("VerificationResult(address subject,uint256 expiration,string signature,string jsonResult,string useCase)"),
            verificationResult.subject,
            verificationResult.expiration,
            keccak256(bytes(verificationResult.signature)),
            keccak256(bytes(verificationResult.jsonResult)),
            keccak256(bytes(verificationResult.useCase))
        )));

        // recover the public address corresponding to the signature and regenerated hash
        address signerAddress = ECDSA.recover(digest, signature);

        // retrieve a verifier address for the recovered address
        address verifierAddress = _signers[signerAddress];
        
        // ensure the verifier is registered and its signer is the recovered address
        require(
            _verifiers[verifierAddress].signer == signerAddress,
            "VerificationRegistry: Signed digest cannot be verified"
        );

        // ensure that the result has not expired
        require(
            verificationResult.expiration > block.timestamp,
            "VerificationRegistry: Verification confirmation expired"
        );

        // create a VerificationRecord
        VerificationRecord memory verificationRecord = VerificationRecord({
            uuid: 0,
            verifier: verifierAddress,
            subject: verificationResult.subject,
            entryTime: block.timestamp,
            expirationTime: verificationResult.expiration,
            revoked: false,
            signature: verificationResult.signature,
            jsonResult: verificationResult.jsonResult,
            indexType: verificationResult.useCase
        });

        // generate a UUID for the record
        bytes32 uuid = _createVerificationRecordUUID(verificationRecord);
        verificationRecord.uuid = uuid;

        return verificationRecord;
    }

    function _createVerificationRecordUUID(VerificationRecord memory verificationRecord) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    verificationRecord.verifier,
                    verificationRecord.subject,
                    verificationRecord.entryTime,
                    verificationRecord.expirationTime,
                    verificationRecord.signature,
                    verificationRecord.indexType,
                    _verificationRecordCount
                )
            );
    }

    /****************************************************************
     *
     *                           VIEWS
     *
     ***************************************************************/

    function isVerifier(address account) external override view returns (bool) {
        return _verifiers[account].name != 0;
    }

    function getVerifierCount() external override view returns(uint) {
        return _verifierCount;
    }

    function getVerifier(address verifierAddress) external override view returns (VerifierInfo memory) {
        require(_verifiers[verifierAddress].name != 0, "VerificationRegistry: Unknown Verifier Address");
        return _verifiers[verifierAddress];
    }
    
    function getVerificationCount() external override view returns(uint256) {
        return _verificationRecordCount;
    }

    function getVerification(bytes32 uuid, string memory indexType) external override view returns (VerificationRecord memory) {
        return _verifications[indexType][uuid];
    }

    function getVerificationsForSubject(address subject, string memory indexType) external override view returns (VerificationRecord[] memory) {
        require(subject != address(0), "VerificationRegistry: Invalid address");
        bytes32[] memory subjectRecords = _verificationsForSubject[subject][indexType];
        VerificationRecord[] memory records = new VerificationRecord[](subjectRecords.length);
        for (uint i=0; i<subjectRecords.length; i++) {
            VerificationRecord memory record = _verifications[indexType][subjectRecords[i]];
            records[i] = record;
        }
        return records;
    }

    function getVerificationsForVerifier(address verifier, string memory indexType) external override view returns (VerificationRecord[] memory) {
        require(verifier != address(0), "VerificationRegistry: Invalid address");
        bytes32[] memory verifierRecords = _verificationsForVerifier[verifier][indexType];
        VerificationRecord[] memory records = new VerificationRecord[](verifierRecords.length);
        for (uint i=0; i<verifierRecords.length; i++) {
            VerificationRecord memory record = _verifications[indexType][verifierRecords[i]];
            records[i] = record;
        }
        return records;
    }
}


