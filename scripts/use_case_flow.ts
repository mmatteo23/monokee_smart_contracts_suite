import { expect } from "chai"
import { BigNumber, Contract, Signer } from "ethers"
import { ethers } from "hardhat"
import hre from "hardhat"
import { pinJSONToIPFS } from "../scripts/nft/pinata";
import { Address } from "cluster";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// *** custom types ***
type DiplomaMetadata = {
    name: string;
    image: string;
    description: string;
    details: string
};

// *** Useful constants ***
// Do NOT use UTF-8 strings that are not a DataHexstring (https://docs.ethers.io/v5/api/utils/hashing/)
// Or equivalently use the identity function (only with this format the role is correct)
const minter_role = ethers.utils.id("MINTER_ROLE");

// create metadata for the NFT
const metadata = {
    name: "Diploma Access Token",
    description: "Student can exchange this token to obtain his diploma",
    image: "https://gateway.pinata.cloud/ipfs/QmNkus5BdawNLFvHrE5wc4dW5wpvDjCxESj3oVKWBdwqbZ",
    details: "ZGlkOnN0dWRlbnQ6MTIzNDU2O2RpZDpjb3JzbzoxMjM0NTY7ZGlkOnNjaGVtYToxMjM0NTY"
} as DiplomaMetadata;

// *** Useful variables ***
let owner: SignerWithAddress, student1: Signer, student2: Signer, verifier: SignerWithAddress;
let verifiers: Array<string>, addresses: Array<string>;
let verificationRegistry: Contract, diplomaIssuerManager: Contract, diplomaERC721: Contract;
let tokenId;

async function getHardhatAccounts() {
    console.log("################################################## 🔴 Test accounts 🔴 ######################################################");
    [owner, student1, student2] = await ethers.getSigners();
    verifier = await ethers.getSigner("0x71CB05EE1b1F506fF321Da3dac38f25c0c9ce6E1");

    verifiers = [await owner.getAddress(), await verifier.getAddress()];
    addresses = [await student1.getAddress(), await student2.getAddress()];

    console.log("Owner (and Verifier) Address: \t", await owner.getAddress(), " with balance \t", await (await owner.getBalance()).toString());
    console.log("Student1 Address: \t\t", await student1.getAddress(), " with balance \t", await (await student1.getBalance()).toString());
    console.log("Student2 Address: \t\t", await student2.getAddress(), " with balance \t", await (await student2.getBalance()).toString());
    console.log("Verifier Address: \t\t", await verifier.getAddress(), " with balance \t", await (await verifier.getBalance()).toString());
    console.log("\n");
}

async function deploySmartContracts() {
    console.log("#################################################### 🔴 Contracts 🔴 ########################################################");
    let deployer;

    deployer = await ethers.getContractFactory("VerificationRegistry");
    verificationRegistry = await deployer.deploy();
    await verificationRegistry.deployed();
    console.log("Deployed VerificationRegistry contract at address: \t", verificationRegistry.address);

    deployer = await ethers.getContractFactory("DiplomaERC721");
    diplomaERC721 = await deployer.deploy();
    await diplomaERC721.deployed();
    console.log("Deployed DiplomaERC721 contract at address: \t\t", diplomaERC721.address);

    deployer = await ethers.getContractFactory("DiplomaIssuerManager");
    diplomaIssuerManager = await deployer.deploy(verificationRegistry.address, diplomaERC721.address);
    await diplomaIssuerManager.deployed();
    console.log("Deployed DiplomaIssuerManager contract at address: \t", diplomaIssuerManager.address);

    await diplomaERC721.connect(owner).grantRole(minter_role, diplomaIssuerManager.address);
    console.log("\n🚨 Grant MINTER_ROLE to DiplomaIssuerManager, now this contract can mint students NFT diploma 🚨\n");
}

async function createTrustedVerifiers(verifiers: string[], verificationRegistry: Contract) {
    console.log("########################################## 🔴 Trusted Verifiers Registration 🔴 ###############################################\n");
    console.log("Create trusted verifiers that can add verifications to the registry:")
    for (const address of verifiers) {
        const testVerifierInfo = {
            name: hre.ethers.utils.formatBytes32String("Monokee"),
            did: "did:web:123456",
            url: "https://monokee.it",
            signer: address
        }

        const setRegistryVerifierTx = await verificationRegistry.addVerifier(
            address,
            testVerifierInfo
        )
        await setRegistryVerifierTx.wait()

        console.log("\t🔑 Added trusted verifier:", address)
    }
}

async function verificationProcess(registry: Contract, addresses: string[]) {
    const domain = {
        name: "VerificationRegistry",
        version: "1.0",
        chainId: hre.network.config.chainId ?? 1337,
        verifyingContract: registry.address
    }

    const types = {
        VerificationResult: [
            { name: "schema", type: "string" },
            { name: "subject", type: "address" },
            { name: "expiration", type: "uint256" }
        ]
    }

    // I use a long expiration for these Verifications because I don't want
    // them to expire in the middle of the demo.
    const expiration = Math.floor(Date.now() / 1000) + 31_536_000 * 10 // 10 years

    for (const address of addresses) {
        const verificationResult = {
            schema: "monokee.io/credentials/kyc",
            subject: address,
            expiration: expiration
        }

        // sign the structured result
        //const [deployer] = await hre.ethers.getSigners()

        const signature = await owner._signTypedData(
            domain,
            types,
            verificationResult
        )

        const tx = await registry.registerVerification(
            verificationResult,
            signature
        )
        await tx.wait()

        console.log(
            `\t✅ Registered Verification for address: ${address}, by verifier: ${await owner.getAddress()}`
        )
    }
}

async function issueDiplomaNFTtoStudent(student: Signer, metadata: DiplomaMetadata) {

    console.log("\t 2.1) NFT metadata:");
    console.table(metadata);
    console.log("\n")

    //pinata pin request
    const pinataResponse = await pinJSONToIPFS(metadata);
    if (!pinataResponse.success) {
        return {
            success: false,
            status: "😢 Something went wrong while uploading your tokenURI.",
        }
    }
    const tokenURI = pinataResponse.pinataUrl;
    console.log("\t 2.2) 🪅   Use Pinata API to pin NFT metadata on IPFS. Returned tokenURI: ", tokenURI, "\n");

    const tx = await diplomaIssuerManager.connect(student).acceptNewDiplomaRequest(tokenURI);
    // if we want to read data from contract events (or returned values),
    // we can't simply do: const value = tx.value, because the transaction
    // may not have already been written on the chain.
    const receipt = await tx.wait();

    const tokenId = receipt.events[1].args.tokenId;
    console.log("\t 2.3) 🚀  Minted NFT token to", await student.getAddress(), "with tokenId #", tokenId.toString(), "\n");

    return tokenId;
}

async function consumeStudentToken(student: Signer, token: BigNumber) {

    console.log("\t 3.1) 👐  Student1 calls the approve(address, tokenId) DiplomaERC721 method, so the DiplomaIssuerManager can consume the student NFT\n");
    // Before consuming the AccessToken, the student needs to leave the control to the contract
    const tx = await diplomaERC721.connect(student).approve(diplomaIssuerManager.address, token);
    await tx.wait();

    console.log("\t 3.2) 🔥  DiplomaIssuerManager owner now can invoke consumeDiplomaAccessToken(tokenId) \n");
    await diplomaIssuerManager.connect(owner).consumeDiplomaAccessToken(tokenId);
}


async function main() {

    // Preliminary checks
    if (hre.network.name === "hardhat") {
        console.warn(
            "⚠️ You are trying to deploy a contract to the Hardhat Network, which" +
            "gets automatically created and destroyed every time. Use the Hardhat" +
            " option '--network localhost'"
        )
    }

    console.log("Start program flow script...\n");

    await getHardhatAccounts();

    await deploySmartContracts();

    await createTrustedVerifiers(verifiers, verificationRegistry);

    console.log("\n############################################## 🔵 Show functionalities 🔵 ###################################################\n");

    console.log("\nPhase 1: Student1 and Student2 proceed with the verification process");
    await verificationProcess(verificationRegistry, addresses);

    console.log("\nPhase 2: Student1 requests for DiplomaNFT after he/she has passed the verification process\n");
    tokenId = await issueDiplomaNFTtoStudent(student1, metadata);

    console.log("\nPhase 3: DiplomaIssuerManager consumes Student1's NFT when he/she decides to swap it for Diploma Verifiable Credential\n");
    await consumeStudentToken(student1, tokenId);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

