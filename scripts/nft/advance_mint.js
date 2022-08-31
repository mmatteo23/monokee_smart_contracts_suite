
import {pinJSONToIPFS} from './pinata.js'

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