import * as hre from "hardhat"

async function main() {

  if (hre.network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    )
  }
  /*
  const VerificationRegistry = await hre.ethers.getContractFactory("VerificationRegistry");
  const vr = await VerificationRegistry.deploy();
  await vr.deployed();

  console.log("VerificationRegistry deployed to:", vr.address);
  */
  const DiplomaERC721 = await hre.ethers.getContractFactory("DiplomaERC721");
  const dplmToken = await DiplomaERC721.deploy();
  await dplmToken.deployed();

  console.log("DiplomaERC721 deployed to:", dplmToken.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
