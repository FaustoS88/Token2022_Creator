# Solana Token-2022 Creator

A Node.js script to create and manage Solana Token-2022 tokens with interactive CLI interface. This tool simplifies the token creation process on Solana, handling everything from wallet setup to metadata.

## Features

- Interactive CLI interface with emoji-rich feedback
- Support for mainnet and devnet networks
- Existing wallet integration or new vanity wallet generation
- Vanity token address generation
- Metadata creation and initialization
- Token minting with customizable supply
- Authority management (mint, metadata, metadata-pointer)
- Automatic/custom compute unit price adjustment with dynamic retry logic
- CSV export for wallet and token information
- **Professional logging with [Winston](https://www.npmjs.com/package/winston)** (all CLI output is now managed by Winston, with timestamps and log levels)

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
    > **Note:** This project uses the [winston](https://www.npmjs.com/package/winston) logging library for all CLI output.  
    > If you upgrade from a previous version, please run `npm install` to ensure all dependencies are installed.

## Usage

Run the script:

```bash
node create-token2022.js
```

You can control the verbosity of logging via the environment variable `LOG_LEVEL` (e.g., `info`, `debug`, `warn`, `error`).

For example, to enable debug/verbose output:
```bash
LOG_LEVEL=debug node create-token2022.js
```

## Example Session

Here's a complete example of creating a token with the script and the new logging output:

```plaintext
Token2022_Creator % node /Users/faustosaccoccio/Documents/moondev/Token2022_Creator/create-token2022-1.js
[2025-05-21 09:31:08] info: 📁 Creating project folder...
Enter project directory name (default: new-token): test
[2025-05-21 09:31:12] info: Created and moved to test folder
[2025-05-21 09:31:12] info: 🌐 Network Setup
[2025-05-21 09:31:12] info: 👛 Wallet Setup
Would you like to:
1. Use your currently configured CLI wallet
2. Generate a new vanity wallet
Enter choice (1 or 2): 1
[2025-05-21 09:31:14] info: Using existing wallet: aixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxfy6
[2025-05-21 09:31:14] info: Wallet information saved to wallet-info.csv
[2025-05-21 09:31:14] info: 💰 Wallet Funding Required
[2025-05-21 09:31:14] info: Provider Wallet Address: aixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxfy6
[2025-05-21 09:31:14] info: Steps to follow:
1. Copy the provider wallet address above
2. Send SOL to this address (recommended: at least 1 SOL)
3. Wait for the transaction to confirm
[2025-05-21 09:31:14] info: Current balance: 0.193552754 SOL

Have you funded the wallet? (yes/no): yes
[2025-05-21 09:31:16] info: Wallet funded successfully! Balance: 0.193552754 SOL
[2025-05-21 09:31:16] info: 🔑 Token Mint Account Setup
Would you like to create a vanity address for your token? (yes/no): yes
Enter characters you want your token address to start with (e.g. "test"): 1
[2025-05-21 09:31:19] info: Generating token address starting with '1'...
[2025-05-21 09:31:19] info: Created token mint keypair: 1644SWrBtbjDeHN2CiW8ctqySLQRrbTU62SrrRysTsg.json
[2025-05-21 09:31:19] info: 🪙 Creating token...
Enter token decimals (usually 9): 9
> [2025-05-21 09:31:26] info: Token created successfully: 16xxxxxxxxxxxxxxxxxxxxxxxxxxxxsTsg
[2025-05-21 09:31:26] info: 🖼️  Manual Metadata Upload Process:
[2025-05-21 09:31:26] info: 1. First, you need to upload your image to Web3.Storage
2. Then create and upload the metadata.json file
Enter token name: test
Enter token symbol: test
Enter token description: test
Enter external URL: https://test.com
Enter token category (e.g., Utility Token): utility
[2025-05-21 09:31:49] info: Steps to follow:
1. Go to https://web3.storage/
2. Upload your token image
3. Copy the IPFS URL for your image
4. Open metadata-template.json that was just created
5. Add the image IPFS URL to the metadata file
6. Upload the complete metadata.json to Web3.Storage
7. Copy the metadata IPFS URL

Paste the final metadata.json IPFS URL here: www.test.com
[2025-05-21 09:31:54] info: 📝 Initializing metadata...
[2025-05-21 09:31:56] info: Metadata initialized successfully
[2025-05-21 09:31:56] info: 💳 Creating token accounts...
[2025-05-21 09:31:56] info: Creating token account for provider...
[2025-05-21 09:31:58] info: Created token account for provider: CkA7mXm9XaobsytGGt1toVGNdsqaLMkfUBUJ9u7RkBmi
[2025-05-21 09:31:58] info: Wallet information saved to wallet-info.csv
[2025-05-21 09:31:58] info: 💰 Minting tokens...
Enter token supply to mint (default: 1000000000): 1000000000
> [2025-05-21 09:32:13] info: 1000000000 tokens minted successfully to provider account: CkA7mXm9XaobsytGGt1toVGNdsqaLMkfUBUJ9u7RkBmi
[2025-05-21 09:32:13] info: 🔒 Revoking authorities...
Would you like to revoke all authorities making the token immutable? (yes/no): yes
[2025-05-21 09:32:17] info: Revoking mint authority...
[2025-05-21 09:32:20] info: Mint authority revoked
[2025-05-21 09:32:20] info: Revoking metadata authority...
[2025-05-21 09:32:32] info: Metadata authority revoked
[2025-05-21 09:32:32] info: Revoking metadata-pointer authority...
[2025-05-21 09:32:35] info: Metadata-pointer authority revoked
[2025-05-21 09:32:35] info: All authorities have been successfully revoked
[2025-05-21 09:32:35] warn: These actions cannot be undone. The token is now immutable.
[2025-05-21 09:32:35] info: Token information saved to token-info.csv
[2025-05-21 09:32:35] info: 🎉 Token creation completed successfully!
[2025-05-21 09:32:35] info: Token Address: 16xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxsTsg
[2025-05-21 09:32:35] info: Provider Token Account: Ckxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxmi
[2025-05-21 09:32:35] info: Token Mint Keypair: 16xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxsTsg.json
[2025-05-21 09:32:35] info: Check wallet-info.csv and token-info.csv for all details
[2025-05-21 09:32:35] info: To verify your token:
1. Check token balance: spl-token accounts
2. View token metadata: spl-token display 16xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxsTsg
3. View transaction history on Solana Explorer
```

## Output Files

The script generates two CSV files:

1. **wallet-info.csv**: Contains wallet information including:
   - Wallet type
   - Public key
   - Private key (encrypted)
   - Seed phrase (if applicable)
   - Associated token account addresses

2. **token-info.csv**: Contains token information including:
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
- Automatic retry mechanism for failed transactions (prompting for compute price increase if needed)
- Graceful handling of increased gas fees during high network load
- Progressive scaling of compute units to ensure transaction success
- Real-time monitoring of transaction status and network congestion
- **All errors, warnings, and info are printed via Winston logger with timestamps and log levels for clarity**

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