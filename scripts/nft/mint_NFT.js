require("dotenv").config();
const ethers = require('ethers');
const { API_URL, API_KEY, PRIVATE_KEY } = process.env;

const provider = new ethers.providers.AlchemyProvider('goerli', API_KEY);

const contract = require("../../artifacts/contracts/DiplomaERC721.sol/DiplomaERC721.json");

// Create a signer
const signer = new ethers.Wallet(PRIVATE_KEY, provider)

// Get contract ABI and address
const abi = contract.abi
const contractAddress = '0xad481be148F04bc618317B7102350AB091A0f058'

// Create a contract instance
const myNftContract = new ethers.Contract(contractAddress, abi, signer)

// Get the NFT Metadata IPFS URL
const tokenUri = "https://gateway.pinata.cloud/ipfs/QmcMSjXT2y8UYjmN2CMLj7LdKffeW3rM47Lu9J8AgY9o73"

// Call mintNFT function
const mintNFT = async () => {
    let nftTxn = await myNftContract.safeMint(signer.address, tokenUri)
    await nftTxn.wait()
    console.log(`NFT Minted! Check it out at: https://goerli.etherscan.io/tx/${nftTxn.hash}`)
}

mintNFT()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

