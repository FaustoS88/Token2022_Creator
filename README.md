# Solana Token-2022 Creator

A Node.js script to create and manage Solana Token-2022 tokens with interactive CLI interface. This tool simplifies the token creation process on Solana, handling everything from wallet setup to metadata management and authority revocation.

## Features

- Interactive CLI interface with emoji-rich feedback
- Support for mainnet and devnet networks
- Existing wallet integration or new vanity wallet generation
- Vanity token address generation
- Metadata creation and initialization
- Token minting with customizable supply
- Authority management (mint, metadata, metadata-pointer)
- Automatic/custom compute unit price adjustment
- CSV export for wallet and token information

## Prerequisites

- Node.js (v14 or higher)
- Solana CLI tools
- A funded Solana wallet (minimum 0.2 SOL recommended)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Usage

Run the script:

```bash
node create-token2022.js
```

## Example Session

Here's a complete example of creating a token with the script:

```plaintext
node side_projects/strategies/AMM_bot/to
ken2022-creator/create-token2022.js

📁 Creating project folder...
Enter project directory name (default: new-token): test
✅ Created and moved to test folder

🌐 Network Setup
Network configuration: Config File: /Users/user/.config/solana/cli/config.yml
RPC URL: https://api.mainnet-beta.solana.com 
WebSocket URL: wss://api.mainnet-beta.solana.com/ (computed)
Keypair Path: /Users/user/.config/solana/id.json 
Commitment: confirmed 


👛 Wallet Setup
Would you like to:
1. Use your currently configured CLI wallet
2. Generate a new vanity wallet
Enter choice (1 or 2): 1
✅ Using existing wallet: aixxxxxxxxxxxxxxxxxxxxxxxxxxxxgw9fy6
📂 Keypair path: /Users/user/.config/solana/id.json

💾 Saving wallet information...
✅ Wallet information saved to wallet-info.csv

💰 Wallet Funding Required
Provider Wallet Address: aixxxxxxxxxxxxxxxxxxxxxxxxxxPtxx9fy6

📋 Steps to follow:
1. Copy the provider wallet address above
2. Send SOL to this address (recommended: at least 1 SOL)
3. Wait for the transaction to confirm

Current balance: 0.207374832 SOL

Have you funded the wallet? (yes/no): yes

✅ Wallet funded successfully! Balance: 0.207374832 SOL

🔑 Token Mint Account Setup
Would you like to create a vanity address for your token? (yes/no): yes
Enter characters you want your token address to start with (e.g. "test"): ai
Generating token address starting with 'ai'...
Current Solana config: Config File: /Users/user/.config/solana/cli/config.yml
RPC URL: https://api.mainnet-beta.solana.com 
WebSocket URL: wss://api.mainnet-beta.solana.com/ (computed)
Keypair Path: /Users/user/.config/solana/id.json 
Commitment: confirmed 

✅ Created token mint keypair: aiBj7pHvrxxxxxxxxxxxxxxxxxxk9VN2HNp1R.json

🪙 Creating token...
Enter token decimals (usually 9): 9
✅ Token created successfully: aiBj7xxxxxxxxxxxxxxxxxN2HNp1R

🖼️  Manual Metadata Upload Process:
1. First, you need to upload your image to Web3.Storage
2. Then create and upload the metadata.json file
Enter token name: test
Enter token symbol: test
Enter token description: it's a test for my script
Enter external URL: https://solana.com/es
Enter token category (e.g., Utility Token): Utility

📋 Steps to follow:
1. Go to https://web3.storage/
2. Upload your token image
3. Copy the IPFS URL for your image
4. Open metadata-template.json that was just created
5. Add the image IPFS URL to the metadata file
6. Upload the complete metadata.json to Web3.Storage
7. Copy the metadata IPFS URL

Paste the final metadata.json IPFS URL here: https://bafybeiarxxxxxxxxxxxxxxxxxxxxxxxxu7dwzmop7yh5i.ipfs.w3s.link/metadata-template.json

📝 Initializing metadata...
✅ Metadata initialized successfully

💳 Creating token accounts...
Creating token account for provider...
> ✅ Created token account for provider: MdSrHqgxxxxxxxxxxxxxxxxxxxxxtBka7cdDB

💾 Saving wallet information...
✅ Wallet information saved to wallet-info.csv

💰 Minting tokens...
Enter token supply to mint (default: 1000000000): 1000000000
✅ 1000000000 tokens minted successfully to provider account: MdSrHqgxxxxxxxxxxxxxxxxxxxxxxtBka7cdDB

🔒 Revoking authorities...
Would you like to revoke all authorities making the token immutable? (yes/no): yes

Revoking mint authority...

Transaction failed. Increase compute unit price by 1000 and retry or insert custom compute unit amount? (yes/no/amount): yes
Retrying with compute unit price: 2000
✅ Mint authority revoked

Revoking metadata authority...
✅ Metadata authority revoked

Revoking metadata-pointer authority...
✅ Metadata-pointer authority revoked

✅ All authorities have been successfully revoked
⚠️  Warning: These actions cannot be undone. The token is now immutable.

💾 Saving token information...
✅ Token information saved to token-info.csv

🎉 Token creation completed successfully!
Token Address: aiBjxxxxxxxxxxxxxxxxxxxxxxxVN2HNp1R
Provider Token Account: MdSxxxxxxxxxxxxxxxxxxxxxxtBka7cdDB
Token Mint Keypair: aiBjxxxxxxxxxxxxxxxxVN2HNp1R.json

✅ Check wallet-info.csv and token-info.csv for all details
```

## Output Files

The script generates two CSV files:

1. wallet-info.csv: Contains wallet information including:
   - Wallet type
   - Public key
   - Private key (encrypted)
   - Seed phrase (if applicable)
   - Associated token account addresses

2. token-info.csv: Contains token information including:
   - Token mint address
   - Decimals
   - Total supply
   - Mint keypair file location (if vanity address was created)

## Features in Detail

### Wallet Setup
- Use existing Solana CLI wallet
- Generate new vanity wallet with custom prefix

### Token Creation
- Custom decimal places
- Vanity address generation
- Automatic metadata initialization
- Configurable token supply

### Metadata Management
- Interactive metadata creation and template generation
- Support for custom attributes and properties
- Guidance on using decentralized storage solutions (like Web3.Storage, IPFS, or Arweave)
- Manual metadata URI integration after separate upload process

### Authority Management
- Optional authority revocation
- Automatic compute unit price adjustment
- Progressive transaction retry mechanism

### Error Handling and Network Load Management
- Dynamic compute unit price adjustment based on network conditions
- Automatic retry mechanism for failed transactions
- Graceful handling of increased gas fees during high network load
- Progressive scaling of compute units to ensure transaction success
- Real-time monitoring of transaction status and network congestion

## Security Notes

- Wallet information is stored locally in CSV format including:
  - Public key
  - Private key (encrypted)
  - Seed phrase (if applicable)
  - Associated token account addresses
- Private keys should be handled with care
- Consider backing up the generated CSV files securely

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.