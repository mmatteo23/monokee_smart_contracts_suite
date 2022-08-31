import { expect } from "chai"
import { Contract } from "ethers"
import { ethers } from "hardhat"

// custom interfaces
interface SmartContract {
    addr: string;
    name: string;
    trusted: boolean;
    registrationDate: BigInteger;
}

// Useful variables
let owner, genericUser;

const sample_contract_address = "0x7564E5342ce825fC529f347dB96F9E68e16C9c17";
const sample_contract_name = "DiplomaERC721";

describe("TrustedSmartContractRegistry", function () {

    // deploy the contract, which makes this test provider the contract's owner
    let trustedSmartContractRegistry: Contract;
    let contractOwnerAddress: string;
    it("Should deploy", async function () {
        [owner, genericUser] = await ethers.getSigners();
        const deployer = await ethers.getContractFactory("TrustedSmartContractRegistry");
        trustedSmartContractRegistry = await deployer.deploy();
        await trustedSmartContractRegistry.deployed();
        contractOwnerAddress = trustedSmartContractRegistry.deployTransaction.from;
    });

    describe("Test write contract functions", () => {

        it("Register a new trusted smart contract", async () => {
            const tx = await trustedSmartContractRegistry
                .connect(owner)
                .register(sample_contract_address, sample_contract_name, true);

            const receipt = await tx.wait();

            expect(receipt.events[0].args.contractName).to.equal(sample_contract_name);
            expect(receipt.events[0].args.contractAddress).to.equal(sample_contract_address);
            expect(receipt.events[0].args.trusted).to.equal(true);
        });

        it("A generic user not able to register a new trusted contract", async () => {
            expect(trustedSmartContractRegistry.connect(genericUser).register(sample_contract_address, sample_contract_name, true)).to.be.reverted;
        });

        it("The sc's owner should edit registered trusted smart contract trust", async () => {
            let tx = await trustedSmartContractRegistry
                .connect(owner)
                .editTrust(sample_contract_address, false);
                
            const receipt = await tx.wait();

            expect(receipt.events[0].args.contractAddress).to.equal(sample_contract_address);
            expect(receipt.events[0].args.trusted).to.equal(false);
            expect(await trustedSmartContractRegistry.isTrusted(sample_contract_address)).to.be.false;
        });

        it("A generic user should not able to change the trust of a registered contract", async () => {
            expect(trustedSmartContractRegistry.connect(genericUser).editTrust(sample_contract_address, false)).to.be.reverted;
        });
    });

    describe("Test read contract functions", () => {

        it("getContractCount() should return the number of registered contracts", async () => {
            const contractNumber = await trustedSmartContractRegistry.getContractCount();

            expect(contractNumber).to.be.equal(1);
        });

        it("getContract() should return contract informations", async () => {
            let registerdContract: SmartContract;
            registerdContract = await trustedSmartContractRegistry.getContract(sample_contract_address);

            expect(registerdContract.addr).to.be.equal(sample_contract_address);
            expect(registerdContract.name).to.be.equal(sample_contract_name);
        });

        it("isTrusted(address) should return true if the contract is trusted", async () => {
            let trust = await trustedSmartContractRegistry.isTrusted(sample_contract_address);
        
            expect(trust).to.be.false;
            expect(trustedSmartContractRegistry.isTrusted("0x5df80424c525af935c46b14E727564f1c4B21930")).to.be.reverted;
        });
    });


});