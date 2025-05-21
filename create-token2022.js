require('dotenv').config();
const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');
const readline = require('readline');
const { promisify } = require('util');
const execAsync = promisify(exec);
const csv = require('csv-writer').createObjectCsvWriter;
const Utils = require('./utils');
const logger = require('./logger');

class TokenCreator {
    constructor() {
        this.connection = new Connection(
            'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
        this.walletInfo = {};
        this.tokenInfo = {};
        this.network = 'mainnet';
        this.useExistingWallet = false;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async question(query) {
        return new Promise(resolve => this.rl.question(query, resolve));
    }

    async createProjectFolder() {
        logger.info('📁 Creating project folder...');
        let folderName = await this.question('Enter project directory name (default: new-token): ');
        folderName = folderName.trim() || 'new-token';

        try {
            if (!fs.existsSync(folderName)) {
                fs.mkdirSync(folderName, { recursive: true });
                process.chdir(folderName);
                logger.info(`Created and moved to ${folderName} folder`);
            } else {
                process.chdir(folderName);
                logger.info(`Moved to existing ${folderName} folder`);
            }
        } catch (error) {
            logger.error('Error creating/accessing folder: ' + error.message);
            throw error;
        }
    }

    async setupNetwork() {
        logger.info('🌐 Network Setup');
        await execAsync('solana config set -um');
        this.network = 'mainnet';
        const { stdout } = await execAsync('solana config get');
        logger.debug('Network configuration: ' + stdout.replace(/\n/g, ' | '));
    }

    /**
     * Executes a solana/spl-token command and robustly retries on common blockchain errors.
     * Prompts user on transient errors to retry with increased compute unit price or custom value.
     * @param {string} baseCommand - The command string (with {{COMPUTE_PRICE}} as a placeholder).
     * @param {number} initialPrice - The initial compute unit price.
     * @param {number} maxRetries - Maximum number of retries before giving up.
     */
    async executeWithAdjustedComputePrice(baseCommand, initialPrice = 1000, maxRetries = 5) {
        let computeUnitPrice = initialPrice;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const command = baseCommand.replace('{{COMPUTE_PRICE}}', computeUnitPrice);
                logger.debug(`Executing command: ${command}`);
                const result = await execAsync(command);
                return result;
            } catch (error) {
                const errMsg = ((error.stderr || error.message || '') + '').toLowerCase();
                // These are transient and user-actionable errors
                if (
                    errMsg.includes('blockhashnotfound') ||
                    errMsg.includes('blockhash not found') ||
                    errMsg.includes('unable to confirm transaction') ||
                    errMsg.includes('transaction expired') ||
                    errMsg.includes('compute unit') ||
                    errMsg.includes('gas') ||
                    errMsg.includes('insufficient fee-payer funds') ||
                    errMsg.includes('rpc error')
                ) {
                    retries++;
                    logger.warn(`Transaction failed with error: "${errMsg.split('\n')[0]}"`);
                    const response = await this.question(
                        `\nTransaction failed with error: "${errMsg.split('\n')[0]}".\nIncrease compute unit price by 1000 and retry or insert custom compute unit amount? (yes/no/amount): `
                    );

                    if (response.toLowerCase() === 'yes') {
                        computeUnitPrice += 1000;
                        logger.info(`Retrying with compute unit price: ${computeUnitPrice}`);
                    } else if (response.toLowerCase() === 'no') {
                        throw error;
                    } else if (!isNaN(response)) {
                        computeUnitPrice = parseInt(response);
                        logger.info(`Retrying with custom compute unit price: ${computeUnitPrice}`);
                    } else {
                        throw new Error('Invalid response. Transaction aborted.');
                    }
                } else {
                    logger.error('Unrecoverable error: ' + errMsg);
                    throw error;
                }
            }
        }
        throw new Error('Maximum retries reached. Transaction failed.');
    }

    async setupWallet() {
        logger.info('👛 Wallet Setup');
        const walletChoice = await this.question(
            'Would you like to:\n' +
            '1. Use your currently configured CLI wallet\n' +
            '2. Generate a new vanity wallet\n' +
            'Enter choice (1 or 2): '
        );

        if (walletChoice === '1') {
            // Use existing wallet
            const { stdout: configOutput } = await execAsync('solana config get');
            const keypairPath = Utils.parseKeypairPath(configOutput);

            if (!keypairPath) {
                throw new Error('Could not find keypair path in Solana config');
            }

            try {
                const absolutePath = path.isAbsolute(keypairPath)
                    ? keypairPath
                    : path.resolve(process.env.HOME, '.config/solana/cli', keypairPath);

                if (!fs.existsSync(absolutePath)) {
                    throw new Error(`Keypair file not found at: ${absolutePath}`);
                }

                const keypairData = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
                const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

                this.walletInfo.provider = {
                    publicKey: keypair.publicKey.toString(),
                    privateKey: bs58.encode(keypair.secretKey),
                    outfile: absolutePath
                };

                logger.info(`Using existing wallet: ${keypair.publicKey.toString()}`);
                logger.debug(`Keypair path: ${absolutePath}`);
            } catch (error) {
                logger.error('Error accessing keypair file: ' + error.message);
                logger.warn('Failed to access existing wallet. Would you like to try again or create a new one?');
                return this.setupWallet();
            }
        } else {
            // Generate new vanity wallet
            const prefix = await this.question('Enter characters you want your wallet to start with (e.g. "key"): ');
            logger.info(`Generating wallet starting with '${prefix}'...`);

            const { stdout } = await execAsync(
                `solana-keygen grind --starts-with ${prefix}:1`
            );

            const outfile = stdout.match(/Wrote keypair to (.+\.json)/)[1];
            await execAsync(`solana config set --keypair ${outfile}`);
            const keypairData = JSON.parse(fs.readFileSync(outfile, 'utf-8'));
            const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

            this.walletInfo.provider = {
                publicKey: keypair.publicKey.toString(),
                privateKey: bs58.encode(keypair.secretKey),
                seedPhrase: stdout.match(/recovery seed phrase: (.*)/)?.[1]?.trim() || '',
                outfile
            };

            logger.info(`Created new wallet: ${keypair.publicKey.toString()}`);
        }
        await this.saveWalletInfo();
    }

    async createTokenMintKeypair() {
        logger.info('🔑 Token Mint Account Setup');
        const createVanity = await this.question(
            'Would you like to create a vanity address for your token? (yes/no): '
        );

        if (createVanity.toLowerCase() === 'yes') {
            const prefix = await this.question('Enter characters you want your token address to start with (e.g. "test"): ');
            logger.info(`Generating token address starting with '${prefix}'...`);

            const { stdout } = await execAsync(
                `solana-keygen grind --starts-with ${prefix}:1`
            );

            const mintKeypairFile = stdout.match(/Wrote keypair to (.+\.json)/)[1];
            this.tokenInfo.mintKeypair = mintKeypairFile;

            await execAsync(`solana config set --keypair ${this.walletInfo.provider.outfile}`);
            const { stdout: configOutput } = await execAsync('solana config get');
            logger.debug('Current Solana config: ' + configOutput.replace(/\n/g, ' | '));

            logger.info(`Created token mint keypair: ${mintKeypairFile}`);
            return mintKeypairFile;
        }
        return null;
    }

    async saveWalletInfo() {
        const csvWriter = csv({
            path: 'wallet-info.csv',
            header: [
                { id: 'type', title: 'WALLET_TYPE' },
                { id: 'publicKey', title: 'PUBLIC_KEY' },
                { id: 'privateKey', title: 'PRIVATE_KEY' },
                { id: 'seedPhrase', title: 'SEED_PHRASE' },
                { id: 'ataAddress', title: 'ASSOCIATED_TOKEN_ACCOUNT' }
            ]
        });

        const records = Object.entries(this.walletInfo).map(([type, info]) => ({
            type,
            publicKey: info.publicKey,
            privateKey: info.privateKey,
            seedPhrase: info.seedPhrase || '',
            ataAddress: info.ataAddress || 'Not created yet'
        }));

        await csvWriter.writeRecords(records);
        logger.info('Wallet information saved to wallet-info.csv');
    }

    async checkWalletFunding() {
        if (this.useExistingWallet) {
            logger.info('💰 Using existing wallet - skipping funding check');
            return;
        }

        logger.info('💰 Wallet Funding Required');
        logger.info(`Provider Wallet Address: ${this.walletInfo.provider.publicKey}`);
        logger.info('Steps to follow:\n1. Copy the provider wallet address above\n2. Send SOL to this address (recommended: at least 1 SOL)\n3. Wait for the transaction to confirm');

        try {
            const publicKey = new PublicKey(this.walletInfo.provider.publicKey);
            const balance = await this.connection.getBalance(publicKey);
            logger.info(`Current balance: ${balance / 1e9} SOL`);
        } catch (error) {
            logger.warn('Could not check balance. Please verify funding manually.');
        }

        const confirmation = await this.question('\nHave you funded the wallet? (yes/no): ');
        if (confirmation.toLowerCase() !== 'yes') {
            logger.info('Please fund the wallet before continuing.');
            return await this.checkWalletFunding();
        }

        try {
            const publicKey = new PublicKey(this.walletInfo.provider.publicKey);
            const balance = await this.connection.getBalance(publicKey);
            if (balance === 0) {
                logger.warn('Wallet still shows 0 balance. Are you sure it\'s funded?');
                return await this.checkWalletFunding();
            }
            logger.info(`Wallet funded successfully! Balance: ${balance / 1e9} SOL`);
        } catch (error) {
            logger.warn('Could not verify balance. Proceeding based on your confirmation...');
        }
    }

    async handleManualMetadata() {
        logger.info('🖼️  Manual Metadata Upload Process:');
        logger.info('1. First, you need to upload your image to Web3.Storage\n2. Then create and upload the metadata.json file');

        const metadata = {
            name: await this.question('Enter token name: '),
            symbol: await this.question('Enter token symbol: '),
            description: await this.question('Enter token description: '),
            external_url: await this.question('Enter external URL: '),
            attributes: [
                {
                    trait_type: "Category",
                    value: await this.question('Enter token category (e.g., Utility Token): ')
                }
            ]
        };

        fs.writeFileSync(
            'metadata-template.json',
            JSON.stringify(metadata, null, 2)
        );

        logger.info('Steps to follow:\n1. Go to https://web3.storage/\n2. Upload your token image\n3. Copy the IPFS URL for your image\n4. Open metadata-template.json that was just created\n5. Add the image IPFS URL to the metadata file\n6. Upload the complete metadata.json to Web3.Storage\n7. Copy the metadata IPFS URL\n');

        const metadataUrl = await this.question('Paste the final metadata.json IPFS URL here: ');
        return {
            metadata,
            metadataUrl
        };
    }

    async createToken() {
        logger.info('🪙 Creating token...');
        const decimals = await this.question('Enter token decimals (usually 9): ');

        try {
            if (!this.tokenInfo.mintKeypair) {
                throw new Error('Token mint keypair must be created first');
            }

            const createTokenCmd = `spl-token create-token \
                --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
                --enable-metadata \
                --decimals ${decimals} \
                --with-compute-unit-price {{COMPUTE_PRICE}} \
                ${this.tokenInfo.mintKeypair}`;

            const { stdout: tokenOutput } = await this.executeWithAdjustedComputePrice(createTokenCmd);
            const tokenAddress = tokenOutput.match(/Creating token ([a-zA-Z0-9]+)/)[1];
            this.tokenInfo.address = tokenAddress;
            this.tokenInfo.decimals = decimals;

            logger.info('Token created successfully: ' + tokenAddress);
            return tokenAddress;
        } catch (error) {
            logger.error('Error creating token: ' + (error.stderr || error.message));
            throw error;
        }
    }

    async createTokenAccounts(tokenAddress) {
        logger.info('💳 Creating token accounts...');

        if (!this.walletInfo.provider.publicKey || !this.walletInfo.provider.privateKey) {
            throw new Error('Critical wallet information missing before ATA creation');
        }

        for (const [walletType, info] of Object.entries(this.walletInfo)) {
            logger.info(`Creating token account for ${walletType}...`);

            const createAccountCmd = `spl-token create-account ${tokenAddress} \
                --owner ${info.publicKey} \
                --fee-payer ${this.walletInfo['provider'].outfile} \
                --with-compute-unit-price {{COMPUTE_PRICE}}`;

            const { stdout } = await this.executeWithAdjustedComputePrice(createAccountCmd);

            const ataAddress = stdout.match(/Creating account ([a-zA-Z0-9]+)/)?.[1];
            this.walletInfo[walletType] = {
                ...this.walletInfo[walletType],
                ataAddress
            };

            logger.info(`Created token account for ${walletType}: ${ataAddress}`);
        }

        await this.saveWalletInfo();
    }

    async initializeMetadata(tokenAddress, metadata, metadataUrl) {
        logger.info('📝 Initializing metadata...');

        const initMetadataCmd = `spl-token initialize-metadata ${tokenAddress} \
            "${metadata.name}" \
            "${metadata.symbol}" \
            "${metadataUrl}" \
            --with-compute-unit-price {{COMPUTE_PRICE}}`;

        await this.executeWithAdjustedComputePrice(initMetadataCmd);

        logger.info('Metadata initialized successfully');
    }

    async mintTokens(tokenAddress) {
        logger.info('💰 Minting tokens...');

        const supply = await this.question('Enter token supply to mint (default: 1000000000): ');
        const finalSupply = supply || "1000000000";
        const providerAta = this.walletInfo.provider.ataAddress;

        const mintCmd = `spl-token mint ${tokenAddress} ${finalSupply} ${providerAta} \
            --with-compute-unit-price {{COMPUTE_PRICE}}`;

        await this.executeWithAdjustedComputePrice(mintCmd);

        logger.info(`${finalSupply} tokens minted successfully to provider account: ${providerAta}`);
        this.tokenInfo.totalSupply = finalSupply;
    }

    async revokeAuthorities(tokenAddress) {
        logger.info('🔒 Revoking authorities...');

        const shouldRevoke = await this.question(
            'Would you like to revoke all authorities making the token immutable? (yes/no): '
        );

        if (shouldRevoke.toLowerCase() !== 'yes') {
            logger.info('Skipping authority revocation...');
            return;
        }

        try {
            logger.info('Revoking mint authority...');
            const revokeMintCmd = `spl-token authorize ${tokenAddress} mint --disable \
                --with-compute-unit-price {{COMPUTE_PRICE}}`;
            await this.executeWithAdjustedComputePrice(revokeMintCmd);
            logger.info('Mint authority revoked');

            logger.info('Revoking metadata authority...');
            const revokeMetadataCmd = `spl-token authorize ${tokenAddress} metadata --disable \
                --with-compute-unit-price {{COMPUTE_PRICE}}`;
            await this.executeWithAdjustedComputePrice(revokeMetadataCmd);
            logger.info('Metadata authority revoked');

            logger.info('Revoking metadata-pointer authority...');
            const revokePointerCmd = `spl-token authorize ${tokenAddress} metadata-pointer --disable \
                --with-compute-unit-price {{COMPUTE_PRICE}}`;
            await this.executeWithAdjustedComputePrice(revokePointerCmd);
            logger.info('Metadata-pointer authority revoked');

            logger.info('All authorities have been successfully revoked');
            logger.warn('These actions cannot be undone. The token is now immutable.');

        } catch (error) {
            logger.error('Error revoking authorities: ' + (error.stderr || error.message));
            throw error;
        }
    }

    async saveTokenInfo() {
        const csvWriter = csv({
            path: 'token-info.csv',
            header: [
                { id: 'type', title: 'TYPE' },
                { id: 'address', title: 'ADDRESS' },
                { id: 'details', title: 'DETAILS' }
            ]
        });

        const records = [
            {
                type: 'Token Mint',
                address: this.tokenInfo.address,
                details: `Decimals: ${this.tokenInfo.decimals}, Supply: ${this.tokenInfo.totalSupply}`
            }
        ];

        if (this.tokenInfo.mintKeypair) {
            records.push({
                type: 'Token Mint Keypair',
                address: this.tokenInfo.mintKeypair,
                details: 'Vanity address keypair file'
            });
        }

        await csvWriter.writeRecords(records);
        logger.info('Token information saved to token-info.csv');
    }

    async create() {
        try {
            await this.createProjectFolder();
            await this.setupNetwork();
            await this.setupWallet();
            await this.checkWalletFunding();
            await this.createTokenMintKeypair();
            const tokenAddress = await this.createToken();
            const { metadata, metadataUrl } = await this.handleManualMetadata();
            await this.initializeMetadata(tokenAddress, metadata, metadataUrl);
            await this.createTokenAccounts(tokenAddress);
            await this.mintTokens(tokenAddress);
            await this.revokeAuthorities(tokenAddress);
            await this.saveTokenInfo();

            logger.info('🎉 Token creation completed successfully!');
            logger.info(`Token Address: ${this.tokenInfo.address}`);
            logger.info(`Provider Token Account: ${this.walletInfo.provider.ataAddress}`);
            if (this.tokenInfo.mintKeypair)
                logger.info(`Token Mint Keypair: ${this.tokenInfo.mintKeypair}`);
            logger.info('Check wallet-info.csv and token-info.csv for all details');
            logger.info('To verify your token:\n1. Check token balance: spl-token accounts\n2. View token metadata: spl-token display ' + this.tokenInfo.address + '\n3. View transaction history on Solana Explorer');
        } catch (error) {
            logger.error('Error creating token: ' + (error.stderr || error.message));
            throw error;
        } finally {
            this.rl.close();
        }
    }
}

if (require.main === module) {
    const creator = new TokenCreator();
    creator.create().catch(err => logger.error(err.stderr || err.message));
}

module.exports = TokenCreator;