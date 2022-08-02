require('dotenv').config();
const axios = require('axios');
const ethers = require('ethers');

const key = process.env.REACT_APP_PINATA_KEY;
const secret = process.env.REACT_APP_PINATA_SECRET;
const { API_KEY, PRIVATE_KEY } = process.env;

const provider = new ethers.providers.AlchemyProvider('goerli', API_KEY);

// Get contract ABI and address for contract interaction
const contract = require("../../artifacts/contracts/DiplomaERC721.sol/DiplomaERC721.json");
const abi = contract.abi;
const contractAddress = '0x7564E5342ce825fC529f347dB96F9E68e16C9c17';

// Create a signer
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Create a contract instance
const myNftContract = new ethers.Contract(contractAddress, abi, signer);

const pinJSONToIPFS = async(JSONBody) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    return axios
        .post(url, JSONBody, {
            headers: {
                pinata_api_key: key,
                pinata_secret_api_key: secret,
            }
        })
        .then(function (response) {
           return {
               success: true,
               pinataUrl: "https://gateway.pinata.cloud/ipfs/" + response.data.IpfsHash
           };
        })
        .catch(function (error) {
            console.log(error)
            return {
                success: false,
                message: error.message,
            }
           
        });
};

const mintNFT = async (urlImage, name, description, details) => {

    //error handling
    if (urlImage.trim() == "" || (name.trim() == "" || description.trim() == "") || details.trim() == "") { 
        return {
            success: false,
            status: "❗Please make sure all fields are completed before minting.",
        }
    }

    //make metadata
    const metadata = new Object();
    metadata.name = name;
    metadata.image = urlImage;
    metadata.description = description;
    metadata.details = details;

    //pinata pin request
    const pinataResponse = await pinJSONToIPFS(metadata);
    if (!pinataResponse.success) {
        return {
            success: false,
            status: "😢 Something went wrong while uploading your tokenURI.",
        }
    } 
    const tokenURI = pinataResponse.pinataUrl;  

    //set up Ethereum transaction
    let nftTxn = await myNftContract.safeMint(signer.address, tokenURI);
    await nftTxn.wait();

    return nftTxn;
}

// Diploma example minter
const urlImage = "https://gateway.pinata.cloud/ipfs/QmNkus5BdawNLFvHrE5wc4dW5wpvDjCxESj3oVKWBdwqbZ";
const name = "Diploma Access Token";
const description = "Student can exchange this token to obtain his diploma";
const details = "ZGlkOnN0dWRlbnQ6MTIzNDU2O2RpZDpjb3JzbzoxMjM0NTY7ZGlkOnNjaGVtYToxMjM0NTY";

console.log("Hello student!\nI'm minting NFT diploma for you and upload a json file with diploma metadata to Pinata\n");
console.log("NFT specs:\n");
console.table({
    _name: name,
    _description: description,
    _image: urlImage,
    _details: details
});
console.log("Please wait...\n");

mintNFT(urlImage, name, description, details)
    .then(
        (nftTxn) =>  {
            console.log(`✅ NFT Minted! Check it out at: https://goerli.etherscan.io/tx/${nftTxn.hash}`)
            process.exit(0);
    })
    .catch(
        (error) => {
            console.error("😥 Something went wrong: " + error.message);
            process.exit(1);
    });