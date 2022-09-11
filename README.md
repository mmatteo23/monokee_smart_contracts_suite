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

<p>Tests and scripts were running on hardhat localhost blockchain. Use the following steps:</p>

<h2>1) Run localhost blockchain</h2>

```shell
npx hardhat node
```

<h2>2) Run tests to see what smart contracts do!</h2>
<p>Commands</p>

```shell
npx hardhat test --network localhost
```
