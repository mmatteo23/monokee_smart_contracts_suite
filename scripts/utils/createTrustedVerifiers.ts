import { Contract } from "ethers"
import { ethers } from "hardhat"
import hre from "hardhat"

export const createTrustedVerifiers = async (verifiers: string[], verificationRegistry: Contract) => {
    for (const address of verifiers) {
        const testVerifierInfo = {
            name: hre.ethers.utils.formatBytes32String("Monokee"),
            did: "did:web:123456",
            url: "https://monokee.it",
            signer: address,
            proof: "0x0x0x0xx0x0x0x0x0x0x0x0x0"
        }

        const setRegistryVerifierTx = await verificationRegistry.addVerifier(
            address,
            testVerifierInfo
        )
        await setRegistryVerifierTx.wait()
    }
}