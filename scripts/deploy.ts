// This is a script for deploying your contracts. You can adapt it to deploy
// yours, or create new ones.

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { Contract, ContractFactory, ethers } from "ethers"
import * as hre from "hardhat"

const minter_role = ethers.utils.id("MINTER_ROLE");
console.log(minter_role);

async function main() {
  if (hre.network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
      "gets automatically created and destroyed every time. Use the Hardhat" +
      " option '--network localhost'"
    )
  }

  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const [deployer] = await hre.ethers.getSigners()
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  )

  console.log("Account balance:", (await deployer.getBalance()).toString(), "\n")

  // deploy VerificationRegistry
  
  const registryFactory: ContractFactory = await hre.ethers.getContractFactory(
    "VerificationRegistry2"
  )
  const registryContract: Contract = await registryFactory.deploy()
  await registryContract.deployed()
  console.log("Deployed VerificationRegistry2 at address:\t\t", registryContract.address)
  
  // const registryContractAddress = "0xE9a5A31088DFe5d64C1783aCD154D1484A99ff56";

  let ContractInstance = await hre.ethers.getContractFactory("MonokeeERC721");
  const diplomaERC721 = await ContractInstance.deploy("Diploma", "DPLM");
  await diplomaERC721.deployed();
  console.log("Deployed DiplomaERC721 contract at address:\t\t", diplomaERC721.address);

  ContractInstance = await hre.ethers.getContractFactory("DiplomaIssuerManager");
  const diplomaIssuerManager = await ContractInstance.deploy(registryContract.address, diplomaERC721.address);
  await diplomaIssuerManager.deployed();
  console.log("Deployed DiplomaIssuerManager contract at address: \t", diplomaIssuerManager.address);

  await diplomaERC721.connect(deployer).grantRole(minter_role, diplomaIssuerManager.address);
  console.log("\n???? Grant MINTER_ROLE to DiplomaIssuerManager, now this contract can mint students NFT diploma ????\n");
  /*
    // deploy PermissionedToken
    const pTokenFactory: ContractFactory = await hre.ethers.getContractFactory(
      "PermissionedToken"
    )
    const permissionedToken: Contract = await pTokenFactory.deploy(
      "Permissioned Token",
      "PUSD",
      "100000000000"
    )
    await permissionedToken.deployed()
    console.log("Permissioned Token Address:", permissionedToken.address)
  
    // set the registry on the permissioned token
    const setRegistryTx = await permissionedToken.setVerificationRegistry(
      registryContract.address
    )
    await setRegistryTx.wait()
  
    // deploy ThresholdToken
    const tTokenFactory: ContractFactory = await hre.ethers.getContractFactory(
      "ThresholdToken"
    )
    const thresholdToken: Contract = await tTokenFactory.deploy("100000000000")
    await thresholdToken.deployed()
    console.log("Threshold Token address:", thresholdToken.address)
    
    // set up a trusted verifier for demo purposes
    const verifiers = [
      // We will include the contract deployer in the set of Verifiers. This will
      // allow us to register verifications, with the assumption that the
      // deployer will have enough gas to complete the transactions.
      await deployer.getAddress(),
      // Verifier, will be used at runtime for demo purposes. We purposely do not
      // seed this account with ETH for gas for the sake of the demo.
      "0x71CB05EE1b1F506fF321Da3dac38f25c0c9ce6E1"
    ]
    await createTrustedVerifier(verifiers, registryContract)
    
    
    const addresses = [
    // Faucet Hardhat Account #0 (localhost)
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    // Faucet Production
    "0x695f7BC02730E0702bf9c8C102C254F595B24161",
    // Verifier
    "0x71CB05EE1b1F506fF321Da3dac38f25c0c9ce6E1",
    // Imitation Permissioned Pool Deposit Addresses
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", // DAI
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", // USDC
    "0x90f79bf6eb2c4f870365e785982e1f101e93b906" // USDT
  ]
  await registerVerifications(registryContract, addresses)
  */
}

async function registerVerifications(registry: Contract, addresses: string[]) {
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
  // We use a long expiration for these Verifications because we don't want
  // them to expire in the middle of the demo.
  const expiration = Math.floor(Date.now() / 1000) + 31_536_000 * 10 // 10 years

  for (const address of addresses) {
    const verificationResult = {
      schema: "centre.io/credentials/kyc",
      subject: address,
      expiration: expiration
    }

    // sign the structured result
    const [deployer] = await hre.ethers.getSigners()

    const signature = await deployer._signTypedData(
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
      `Registered Verification for address: ${address}, by verifier: ${await deployer.getAddress()}`
    )
  }
}

async function createTrustedVerifier(
  verifiers: string[],
  verificationRegistry: Contract
) {
  for (const address of verifiers) {
    const testVerifierInfo = {
      name: hre.ethers.utils.formatBytes32String("Centre Consortium"),
      did: "did:web:centre.io",
      url: "https://centre.io/about",
      signer: address
    }

    const setRegistryVerifierTx = await verificationRegistry.addVerifier(
      address,
      testVerifierInfo
    )
    await setRegistryVerifierTx.wait()

    console.log("Added trusted verifier:", address)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
