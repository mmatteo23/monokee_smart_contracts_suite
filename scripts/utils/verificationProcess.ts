import { Contract } from "ethers"
import { ethers } from "hardhat"
import hre from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export const verificationProcess = async (registry: Contract, addresses: string[], owner: SignerWithAddress) => {
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
    }
}