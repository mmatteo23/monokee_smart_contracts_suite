import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai"
import { BigNumber, Contract, Signer } from "ethers"
import { ethers } from "hardhat"
import { pinJSONToIPFS } from "../scripts/nft/pinata";
import { createTrustedVerifiers } from "../scripts/utils/createTrustedVerifiers";
import { verificationProcess } from "../scripts/utils/verificationProcess";

// custom types
type DiplomaMetadata = {
    name: string;
    image: string;
    description: string;
    details: string
};

// Useful constants
// create metadata for the NFT
const metadata = {
    name: "Diploma Access Token",
    description: "Student can exchange this token to obtain his diploma",
    image: "https://gateway.pinata.cloud/ipfs/QmNkus5BdawNLFvHrE5wc4dW5wpvDjCxESj3oVKWBdwqbZ",
    details: "ZGlkOnN0dWRlbnQ6MTIzNDU2O2RpZDpjb3JzbzoxMjM0NTY7ZGlkOnNjaGVtYToxMjM0NTY"
} as DiplomaMetadata;

// Do NOT use UTF-8 strings that are not a DataHexstring (https://docs.ethers.io/v5/api/utils/hashing/)
// Or equivalently use the identity function (only with this format the role is correct)
const minter_role = ethers.utils.id("MINTER_ROLE");

// Useful variables
let owner: SignerWithAddress, account1: Signer, account2: Signer, verifier2: SignerWithAddress;


describe("DiplomaIssuerManager", function () {

    // Get some accounts to do testing
    it("Should get some accounts for verification and not", async function () {
        [owner, account1, account2] = await ethers.getSigners();
        verifier2 = await ethers.getSigner("0x71CB05EE1b1F506fF321Da3dac38f25c0c9ce6E1");
    });

    let verificationRegistry: Contract, diplomaERC721: Contract, diplomaIssuerManager: Contract;
    describe("Dependences Initialization", function () {

        it("Deploy VerificationRegistry smart contract to the testnet", async () => {
            const deployer = await ethers.getContractFactory("VerificationRegistry2");
            verificationRegistry = await deployer.deploy();
            await verificationRegistry.deployed();
        });

        it("Deploy DiplomaERC721 smart contract to the testnet", async () => {
            const deployer = await ethers.getContractFactory("MonokeeERC721");
            diplomaERC721 = await deployer.deploy("Diploma", "DPLM");
            await diplomaERC721.deployed();
        });

        it("Should deploy DiplomaIssuerManager smart contract to testnet", async function () {
            const deployer = await ethers.getContractFactory("DiplomaIssuerManager");
            diplomaIssuerManager = await deployer.deploy(verificationRegistry.address, diplomaERC721.address);
            await diplomaIssuerManager.deployed();
        });

        it("Grant MINTER_ROLE to DiplomaIssuerManager so that can mint students NFT diploma", async () => {
            await diplomaERC721.connect(owner).grantRole(minter_role, diplomaIssuerManager.address);
            // Check Access Control to contract
            expect(await diplomaERC721.hasRole(minter_role, diplomaIssuerManager.address)).to.be.true;
        });

        it("Create trusted verifiers that can add verifications to the registry", async () => {
            await createTrustedVerifiers(
                [owner.address, verifier2.address],
                verificationRegistry
            );
        });

        it("Create Verification Records for the student accounts", async () => {
            await verificationProcess(
                verificationRegistry,
                [await account1.getAddress(), await account2.getAddress()],
                owner
            );
        })
    });

    describe("Contract tests", () => {
        let tokenId: BigNumber, tokenURI: string;
        it("Test diploma NFT issuing with automatic verification", async () => {

            //pinata pin request
            const pinataResponse = await pinJSONToIPFS(metadata);
            if (!pinataResponse.success) {
                return {
                    success: false,
                    status: "😢 Something went wrong while uploading your tokenURI.",
                }
            }
            tokenURI = pinataResponse.pinataUrl;

            const tx = await diplomaIssuerManager.connect(account1).acceptNewDiplomaRequest(tokenURI);
            // if we want to read data from contract events (or returned values),
            // we can't simply do: const value = tx.value, because the transaction
            // may not have already been written on the chain.
            const receipt = await tx.wait();

            //console.log(receipt.events[1].args.tokenId);
            tokenId = receipt.events[1].args.tokenId;
        });

        it("Consume NFT when student changes it for diploma", async () => {

            // Before consuming the AccessToken, the student needs to leave the control to the contract
            const tx = await diplomaERC721.connect(account1).approve(diplomaIssuerManager.address, tokenId);
            await tx.wait();

            // Then contract owner proceeds with access token consuming
            await expect(diplomaIssuerManager
                .connect(owner)
                .consumeDiplomaAccessToken(tokenId)
            ).to.emit(diplomaIssuerManager, "ConsumedDiplomaAccessToken");
        });

        it("Only the student that owns the NFT should do the approve", async () => {
            // Mint new NFT to the student
            const tx = await diplomaIssuerManager.connect(account1).acceptNewDiplomaRequest(tokenURI);
            const receipt = await tx.wait();
            const tokenId2 = receipt.events[1].args.tokenId;

            expect(diplomaERC721.connect(account2).approve(diplomaIssuerManager.address, tokenId2)).to.be.reverted;
        });

        it("Only the contract owner should consume the token after student approve", async () => {
            // Mint new NFT to the student
            const tx = await diplomaIssuerManager.connect(account1).acceptNewDiplomaRequest(tokenURI);
            const receipt = await tx.wait();
            const tokenId2 = receipt.events[1].args.tokenId;

            // Before consuming the AccessToken, the student needs to leave the control to the contract
            await diplomaERC721.connect(account1).approve(diplomaIssuerManager.address, tokenId2);

            // Then contract owner proceeds with access token consuming
            expect(diplomaIssuerManager.connect(verifier2).consumeDiplomaAccessToken(tokenId2)).to.be.reverted;
        });
    });
});