# Monokee Smart Contract Suite

This repo contains the smart contracts that will be used from Monokee to perform issuance, verification and revocation of Verifiable Credentials.

<h1>Installation</h1>
Before use this project:

```shell
npm install
```

And create a .env file with your keys. Like this one:

```
TESTNET_PRIVATE_KEY=changeme
GOERLI_RPC_URL=https://rpc.ankr.com/eth_goerli

# Alchemy Keys
API_URL = "your_alchemy_url"
API_KEY = "your_alchemy_key"
# Metamask PRIVATE_KEY
PRIVATE_KEY = "your_pv_key"

# Pinata Keys
REACT_APP_PINATA_KEY = "your_pinata_key"
REACT_APP_PINATA_SECRET = "your_pinata_secret"
```

</code>

<h1>Try it</h1>

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```
