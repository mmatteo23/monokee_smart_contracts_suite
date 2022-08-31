require("dotenv").config();
const ethers = require('ethers');
const { API_KEY, PRIVATE_KEY } = process.env;

const provider = new ethers.providers.AlchemyProvider('goerli', API_KEY);

const contract = require("../../artifacts/contracts/DiplomaERC721.sol/DiplomaERC721.json");

// Create a signer
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Get contract ABI and address
const abi = contract.abi;
const contractAddress = '0x7564E5342ce825fC529f347dB96F9E68e16C9c17';

// Create a contract instance
const myNftContract = new ethers.Contract(contractAddress, abi, signer);

const tokenURI = async () => {
    let tx = await myNftContract.tokenURI(4);

    return tx;
}


tokenURI()
    .then(
        (token) => {
            console.log(token);
            process.exit(0);
        })
    .catch(
        (error) => {
            console.error("😥 Something went wrong: " + error.message);
            process.exit(1);
        })

