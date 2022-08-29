import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai"
import {
  Contract,
  Signer,
  Wallet
} from "ethers"
import { ethers } from "hardhat"

// *** Useful variables ***
let owner: SignerWithAddress,
 signer: SignerWithAddress,
 subject: SignerWithAddress,
 verifier: SignerWithAddress;
let verifiers: Array<string>, addresses: Array<string>;


describe("VerificationRegistry2", function () {
  
  it("Get some hardhat accounts to do testing", async () => {
    [owner, signer, subject] = await ethers.getSigners();
    verifier = await ethers.getSigner("0x71CB05EE1b1F506fF321Da3dac38f25c0c9ce6E1");
    
    verifiers = [await owner.getAddress(), await verifier.getAddress()];
    addresses = [await subject.getAddress(), await signer.getAddress()];
  });
  
  
  let contractOwnerAddress: string; // I use this variable to avoid multiple calls to owner.address (that is an async call)
  // deploy the contract
  let verificationRegistry: Contract
  it("Should deploy", async function () {
    const deployer = await ethers.getContractFactory("VerificationRegistry2");
    verificationRegistry = await deployer.deploy();
    await verificationRegistry.deployed();
    contractOwnerAddress = verificationRegistry.deployTransaction.from

    expect(verificationRegistry.deployTransaction.from).to.be.equal(owner.address);
  })

  it("Should not find a verifier for an untrusted address", async function () {
    await expect(verificationRegistry.getVerifier(owner.address)).to.be.reverted
  })

  // make the contract's owner a verifier in the contract
  it("The contract's owner should become a registered verifier", async () => {
    // create a test verifier
    const testVerifierInfo = {
      name: ethers.utils.formatBytes32String("Monokee"),
      did: "did:key:123456",
      url: "https://monokee.com/about",
      signer: signer.address,
      proof: "0x0x0x0xx0x0x0x0x0x0x0x0x0"
    }

    const setVerifierTx = await verificationRegistry.addVerifier(
      owner.address,
      testVerifierInfo
    )
    // wait until the transaction is mined
    await setVerifierTx.wait()
  });

  it("Should ensure owner address maps to a verifier", async () => {
    const isVerifier = await verificationRegistry.isVerifier(
      owner.address
    )
    expect(isVerifier).to.be.true
  })

  it("Should have one verifier", async function () {
    const verifierCount = await verificationRegistry.getVerifierCount()
    expect(verifierCount).to.be.equal(1)
  })

  it("Should find a verifier for owner address", async function () {
    // create a test verifier
    const testVerifierInfo = {
      name: ethers.utils.formatBytes32String("Monokee"),
      did: "did:key:123456",
      url: "https://monokee.com/about",
      signer: signer.address,
      proof: "0x0x0x0xx0x0x0x0x0x0x0x0x0"
    }
    
    const retrievedVerifierInfo = await verificationRegistry.getVerifier(
      owner.address
    )
    expect(retrievedVerifierInfo.name).to.equal(testVerifierInfo.name)
    expect(retrievedVerifierInfo.did).to.equal(testVerifierInfo.did)
    expect(retrievedVerifierInfo.url).to.equal(testVerifierInfo.url)
  })
  
  it("Should update an existing verifier", async function () {
    // create a test verifier
    const testVerifierInfo = {
      name: ethers.utils.formatBytes32String("Monokee"),
      did: "did:key:123456",
      url: "https://monokee.com/about",
      signer: signer.address,
      proof: "0x0x0x0xx0x0x0x0x0x0x0x0x0"
    }

    testVerifierInfo.url = "https://centre.io"
    const setVerifierTx = await verificationRegistry.updateVerifier(
      contractOwnerAddress,
      testVerifierInfo
    )
    // wait until the transaction is mined
    await setVerifierTx.wait()
    const retrievedVerifierInfo = await verificationRegistry.getVerifier(
      contractOwnerAddress
    )
    expect(retrievedVerifierInfo.url).to.equal(testVerifierInfo.url)
  })

  it("Should remove a verifier", async function () {
    const removeVerifierTx = await verificationRegistry.removeVerifier(
      contractOwnerAddress
    )
    // wait until the transaction is mined
    await removeVerifierTx.wait()
    const verifierCount = await verificationRegistry.getVerifierCount()
    expect(verifierCount).to.be.equal(0)
  })
  
  // now register a new verifier for verification tests
  it("Should register a new verifier", async function () {
    // create a test verifier
    const testVerifierInfo = {
      name: ethers.utils.formatBytes32String("Monokee"),
      did: "did:key:123456",
      url: "https://monokee.com/about",
      signer: await signer.getAddress(),
      proof: "0x0x0x0xx0x0x0x0x0x0x0x0x0"
    }

    const setVerifierTx = await verificationRegistry.addVerifier(
      contractOwnerAddress,
      testVerifierInfo
    )
    // wait until the transaction is mined
    await setVerifierTx.wait()
    const verifierCount = await verificationRegistry.getVerifierCount()
    expect(verifierCount).to.be.equal(1)
  })
  
  // get a deadline beyond which a test verification will expire
  // note this uses an external scanner service that is rate-throttled
  // add your own API keys to avoid the rate throttling
  // see https://docs.ethers.io/api-keys/
  let expiration = 9999999999
  
  // format an EIP712 typed data structure for the test verification result
  let domain = {}, types = {}, verificationResult = {}
  it("Should format a structured verification result", async function () {
    domain = {
      name: "VerificationRegistry",
      version: "1.0",
      chainId: 1337,
      verifyingContract: await verificationRegistry.resolvedAddress
    }
    types = {
      VerificationResult: [
        { name: "subject", type: "address" },
        { name: "expiration", type: "uint256" },
        { name: "signature", type: "string"},
        { name: "jsonResult", type: "string" },
        { name: "useCase", type: "string" }
      ]
    }

    verificationResult = {
      subject: await subject.getAddress(),
      expiration: expiration,
      signature: "asasasasasasasasasasasasasasasas",
      jsonResult: JSON.stringify({ "test": "result" }),
      useCase: "diploma"
    }
  })

  // create a digest and sign it
  let signature: string
  it("Should sign and verify typed data", async function () {
    signature = await signer._signTypedData(domain, types, verificationResult)
    const recoveredAddress = ethers.utils.verifyTypedData(
      domain,
      types,
      verificationResult,
      signature
    )
    expect(recoveredAddress).to.equal(signer.address)
  })

  // test whether a subject address has a verification and expect false
  it("Should see the subject has no registered valid verification record", async function () {
    const isVerified = await verificationRegistry.isVerified(
      contractOwnerAddress, "diploma"
    )
    expect(isVerified).to.be.false
  })

  // execute the contract's proof of the verification
  it("Should register the subject as verified and create a Verification Record", async function () {
    const verificationTx = await verificationRegistry.connect(owner).registerVerification(
      verificationResult,
      signature
    )
    await verificationTx.wait()
    const verificationCount = await verificationRegistry.getVerificationCount()
    expect(verificationCount).to.be.equal(1)
  })

  // test whether a subject address has a verification
  it("Should verify the subject has a registered and valid verification record", async function () {
    const isVerified = await verificationRegistry.isVerified(await subject.getAddress(), "diploma")
    expect(isVerified).to.be.true
  })

  let recordUUID = 0

  // get all verifications for a subject
  it("Get all verifications for a subject address", async function () {
    const records = await verificationRegistry.getVerificationsForSubject(
      subject.address,
      "diploma"
    )
    recordUUID = records[0].uuid
    expect(records.length).to.equal(1)
  })
  
  // get all verifications for a verifier
  it("Get all verifications for a verifier address", async function () {
    const records = await verificationRegistry.getVerificationsForVerifier(
      contractOwnerAddress,
      "diploma"
    )
    expect(records[0].uuid).to.equal(recordUUID)
    expect(records.length).to.equal(1)
  })
  
  // get a specific verification record by its uuid
  it("Get a verification using its uuid", async function () {
    const record = await verificationRegistry.getVerification(recordUUID, "diploma")
    expect(ethers.utils.getAddress(record.subject)).not.to.throw
  })
  
  // revoke a verification
  it("Revoke a verification based on its uuid", async function () {
    await verificationRegistry.revokeVerification(recordUUID, "diploma")
    const record = await verificationRegistry.getVerification(recordUUID, "diploma")
    expect(record.revoked).to.be.true
  })
  
  // a subject can remove verifications about itself -- note nothing on chains is really ever removed
  it("Should remove a verification", async function () {
    let record = await verificationRegistry.getVerification(recordUUID, "diploma")
    expect(ethers.utils.getAddress(record.subject)).not.to.throw
    const removeTx = await verificationRegistry.removeVerification(recordUUID, "diploma")
    removeTx.wait()
    record = await verificationRegistry.getVerification(recordUUID, "diploma")
    expect(ethers.utils.getAddress(record.subject)).to.throw
  })

})
