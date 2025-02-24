// src/scripts/create-token2022.js
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
        console.log('\n📁 Creating project folder...');
        let folderName = await this.question('Enter project directory name (default: new-token): ');
        folderName = folderName.trim() || 'new-token'; // Use default if empty or just spaces
        
        try {
            if (!fs.existsSync(folderName)) {
                fs.mkdirSync(folderName, { recursive: true });
                process.chdir(folderName);
                console.log(`✅ Created and moved to ${folderName} folder`);
            } else {
                process.chdir(folderName);
                console.log(`✅ Moved to existing ${folderName} folder`);
            }
        } catch (error) {
            console.error('Error creating/accessing folder:', error);
            throw error;
        }
    }

    async setupNetwork() {
        console.log('\n🌐 Network Setup');
        await execAsync('solana config set -um');
        this.network = 'mainnet';
        
        const { stdout } = await execAsync('solana config get');
        console.log('Network configuration:', stdout);
    }

    async executeWithAdjustedComputePrice(baseCommand, initialPrice = 1000) {
        let computeUnitPrice = initialPrice;
        
        while (true) {
            try {
                const command = baseCommand.replace('{{COMPUTE_PRICE}}', computeUnitPrice);
                const result = await execAsync(command);
                return result;
            } catch (error) {
                if (error.stderr && (error.stderr.includes('BlockhashNotFound') || 
                    error.stderr.includes('compute unit') || 
                    error.stderr.includes('gas'))) {
                    
                    const response = await this.question(
                        `\nTransaction failed. Increase compute unit price by 1000 and retry or insert custom compute unit amount? (yes/no/amount): `
                    );

                    if (response.toLowerCase() === 'yes') {
                        computeUnitPrice += 1000;
                        console.log(`Retrying with compute unit price: ${computeUnitPrice}`);
                    } else if (response.toLowerCase() === 'no') {
                        throw error;
                    } else if (!isNaN(response)) {
                        computeUnitPrice = parseInt(response);
                        console.log(`Retrying with custom compute unit price: ${computeUnitPrice}`);
                    } else {
                        throw new Error('Invalid response. Transaction aborted.');
                    }
                } else {
                    throw error;
                }
            }
        }
    }

    async setupWallet() {
        console.log('\n👛 Wallet Setup');
        const walletChoice = await this.question(
            'Would you like to:\n' +
            '1. Use your currently configured CLI wallet\n' +
            '2. Generate a new vanity wallet\n' +
            'Enter choice (1 or 2): '
        );
    
        if (walletChoice === '1') {
            // Use existing wallet
            const { stdout: configOutput } = await execAsync('solana config get');
            const keypairPathMatch = configOutput.match(/Keypair Path: (.+)/);
            
            if (!keypairPathMatch) {
                throw new Error('Could not find keypair path in Solana config');
            }
            
            const keypairPath = keypairPathMatch[1].trim(); // Remove any trailing spaces
            
            try {
                // Check if path is absolute or relative
                const absolutePath = path.isAbsolute(keypairPath) 
                    ? keypairPath 
                    : path.resolve(process.env.HOME, '.config/solana/cli', keypairPath);
    
                if (!fs.existsSync(absolutePath)) {
                    throw new Error(`Keypair file not found at: ${absolutePath}`);
                }
    
                // Store existing wallet info
                const keypairData = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
                const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
                
                this.walletInfo.provider = {
                    publicKey: keypair.publicKey.toString(),
                    privateKey: bs58.encode(keypair.secretKey),
                    outfile: absolutePath
                };
                
                console.log(`✅ Using existing wallet: ${keypair.publicKey.toString()}`);
                console.log(`📂 Keypair path: ${absolutePath}`);
            } catch (error) {
                console.error('Error accessing keypair file:', error);
                // Give user another chance to choose wallet setup
                console.log('\n⚠️  Failed to access existing wallet. Would you like to try again or create a new one?');
                return this.setupWallet();
            }
        } else {
            // Generate new vanity wallet
            const prefix = await this.question('Enter characters you want your wallet to start with (e.g. "key"): ');
            console.log(`Generating wallet starting with '${prefix}'...`);
            
            const { stdout } = await execAsync(
                `solana-keygen grind --starts-with ${prefix}:1`
            );
            
            const outfile = stdout.match(/Wrote keypair to (.+\.json)/)[1];
            
            // Update Solana config to use new keypair
            await execAsync(`solana config set --keypair ${outfile}`);
            
            const keypairData = JSON.parse(fs.readFileSync(outfile, 'utf-8'));
            const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
            
            this.walletInfo.provider = {
                publicKey: keypair.publicKey.toString(),
                privateKey: bs58.encode(keypair.secretKey),
                seedPhrase: stdout.match(/recovery seed phrase: (.*)/)?.[1]?.trim() || '',
                outfile
            };
            
            console.log(`✅ Created new wallet: ${keypair.publicKey.toString()}`);
        }
    
        await this.saveWalletInfo();
    }

    async createTokenMintKeypair() {
        console.log('\n🔑 Token Mint Account Setup');
        const createVanity = await this.question(
            'Would you like to create a vanity address for your token? (yes/no): '
        );
    
        if (createVanity.toLowerCase() === 'yes') {
            const prefix = await this.question('Enter characters you want your token address to start with (e.g. "test"): ');
            console.log(`Generating token address starting with '${prefix}'...`);
            
            const { stdout } = await execAsync(
                `solana-keygen grind --starts-with ${prefix}:1`
            );
            
            const mintKeypairFile = stdout.match(/Wrote keypair to (.+\.json)/)[1];
            this.tokenInfo.mintKeypair = mintKeypairFile;
    
            // Make sure our wallet is set as the default signer
            await execAsync(`solana config set --keypair ${this.walletInfo.provider.outfile}`);
            
            // Verify the config
            const { stdout: configOutput } = await execAsync('solana config get');
            console.log('Current Solana config:', configOutput);
            
            console.log(`✅ Created token mint keypair: ${mintKeypairFile}`);
            return mintKeypairFile;
        }
        
        return null;
    }

    async saveWalletInfo() {
        console.log('\n💾 Saving wallet information...');

        const csvWriter = csv({
            path: 'wallet-info.csv',
            header: [
                {id: 'type', title: 'WALLET_TYPE'},
                {id: 'publicKey', title: 'PUBLIC_KEY'},
                {id: 'privateKey', title: 'PRIVATE_KEY'},
                {id: 'seedPhrase', title: 'SEED_PHRASE'},
                {id: 'ataAddress', title: 'ASSOCIATED_TOKEN_ACCOUNT'}
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
        console.log('✅ Wallet information saved to wallet-info.csv');
    }

    async checkWalletFunding() {
        if (this.useExistingWallet) {
            console.log('\n💰 Using existing wallet - skipping funding check');
            return;
        }

        console.log('\n💰 Wallet Funding Required');
        console.log(`Provider Wallet Address: ${this.walletInfo.provider.publicKey}`);
        
        console.log('\n📋 Steps to follow:');
        console.log('1. Copy the provider wallet address above');
        console.log('2. Send SOL to this address (recommended: at least 1 SOL)');
        console.log('3. Wait for the transaction to confirm');

        try {
            const publicKey = new PublicKey(this.walletInfo.provider.publicKey);
            const balance = await this.connection.getBalance(publicKey);
            console.log(`\nCurrent balance: ${balance / 1e9} SOL`);
        } catch (error) {
            console.log('\nCould not check balance. Please verify funding manually.');
        }

        const confirmation = await this.question('\nHave you funded the wallet? (yes/no): ');
        if (confirmation.toLowerCase() !== 'yes') {
            console.log('Please fund the wallet before continuing.');
            return await this.checkWalletFunding();
        }

        try {
            const publicKey = new PublicKey(this.walletInfo.provider.publicKey);
            const balance = await this.connection.getBalance(publicKey);
            if (balance === 0) {
                console.log('\n⚠️  Warning: Wallet still shows 0 balance. Are you sure it\'s funded?');
                return await this.checkWalletFunding();
            }
            console.log(`\n✅ Wallet funded successfully! Balance: ${balance / 1e9} SOL`);
        } catch (error) {
            console.log('\n⚠️  Could not verify balance. Proceeding based on your confirmation...');
        }
    }

    async handleManualMetadata() {
        console.log('\n🖼️  Manual Metadata Upload Process:');
        console.log('1. First, you need to upload your image to Web3.Storage');
        console.log('2. Then create and upload the metadata.json file');
        
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

        console.log('\n📋 Steps to follow:');
        console.log('1. Go to https://web3.storage/');
        console.log('2. Upload your token image');
        console.log('3. Copy the IPFS URL for your image');
        console.log('4. Open metadata-template.json that was just created');
        console.log('5. Add the image IPFS URL to the metadata file');
        console.log('6. Upload the complete metadata.json to Web3.Storage');
        console.log('7. Copy the metadata IPFS URL\n');

        const metadataUrl = await this.question('Paste the final metadata.json IPFS URL here: ');
        return {
            metadata,
            metadataUrl
        };
    }

    async createToken() {
        console.log('\n🪙 Creating token...');
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
            
            console.log('✅ Token created successfully:', tokenAddress);
            return tokenAddress;
        } catch (error) {
            console.error('❌ Error creating token:', error);
            throw error;
        }
    }   

    async createTokenAccounts(tokenAddress) {
        console.log('\n💳 Creating token accounts...');
        
        if (!this.walletInfo.provider.publicKey || !this.walletInfo.provider.privateKey) {
            throw new Error('Critical wallet information missing before ATA creation');
        }
        
        for (const [walletType, info] of Object.entries(this.walletInfo)) {
            console.log(`Creating token account for ${walletType}...`);
            
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
            
            console.log(`✅ Created token account for ${walletType}: ${ataAddress}`);
        }
    
        await this.saveWalletInfo();
    }

    async initializeMetadata(tokenAddress, metadata, metadataUrl) {
        console.log('\n📝 Initializing metadata...');

        const initMetadataCmd = `spl-token initialize-metadata ${tokenAddress} \
            "${metadata.name}" \
            "${metadata.symbol}" \
            "${metadataUrl}" \
            --with-compute-unit-price {{COMPUTE_PRICE}}`;
        
        await this.executeWithAdjustedComputePrice(initMetadataCmd);
        
        console.log('✅ Metadata initialized successfully');
    }

    async mintTokens(tokenAddress) {
        console.log('\n💰 Minting tokens...');
        
        const supply = await this.question('Enter token supply to mint (default: 1000000000): ');
        const finalSupply = supply || "1000000000";
        const providerAta = this.walletInfo.provider.ataAddress;
        
        const mintCmd = `spl-token mint ${tokenAddress} ${finalSupply} ${providerAta} \
            --with-compute-unit-price {{COMPUTE_PRICE}}`;
        
        await this.executeWithAdjustedComputePrice(mintCmd);
        
        console.log(`✅ ${finalSupply} tokens minted successfully to provider account: ${providerAta}`);
        this.tokenInfo.totalSupply = finalSupply;
    }

    async revokeAuthorities(tokenAddress) {
        console.log('\n🔒 Revoking authorities...');
    
        const shouldRevoke = await this.question(
            'Would you like to revoke all authorities making the token immutable? (yes/no): '
        );
    
        if (shouldRevoke.toLowerCase() !== 'yes') {
            console.log('Skipping authority revocation...');
            return;
        }
    
        try {
            // 1. Revoke mint authority
            console.log('\nRevoking mint authority...');
            const revokeMintCmd = `spl-token authorize ${tokenAddress} mint --disable \
                --with-compute-unit-price {{COMPUTE_PRICE}}`;
            
            await this.executeWithAdjustedComputePrice(revokeMintCmd);
            console.log('✅ Mint authority revoked');
    
            // 2. Revoke basic metadata updates
            console.log('\nRevoking metadata authority...');
            const revokeMetadataCmd = `spl-token authorize ${tokenAddress} metadata --disable \
                --with-compute-unit-price {{COMPUTE_PRICE}}`;
            
            await this.executeWithAdjustedComputePrice(revokeMetadataCmd);
            console.log('✅ Metadata authority revoked');
    
            // 3. Revoke metadata pointer updates
            console.log('\nRevoking metadata-pointer authority...');
            const revokePointerCmd = `spl-token authorize ${tokenAddress} metadata-pointer --disable \
                --with-compute-unit-price {{COMPUTE_PRICE}}`;
            
            await this.executeWithAdjustedComputePrice(revokePointerCmd);
            console.log('✅ Metadata-pointer authority revoked');
    
            console.log('\n✅ All authorities have been successfully revoked');
            console.log('⚠️  Warning: These actions cannot be undone. The token is now immutable.');
    
        } catch (error) {
            console.error('❌ Error revoking authorities:', error);
            throw error;
        }
    }

    async saveTokenInfo() {
        console.log('\n💾 Saving token information...');

        const csvWriter = csv({
            path: 'token-info.csv',
            header: [
                {id: 'type', title: 'TYPE'},
                {id: 'address', title: 'ADDRESS'},
                {id: 'details', title: 'DETAILS'}
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
        console.log('✅ Token information saved to token-info.csv');
    }

    async create() {
        try {
            // 1. Create project folder
            await this.createProjectFolder();
            
            // 2. Setup network
            await this.setupNetwork();
            
            // 3. Setup wallet (use existing or create new with --starts-with key:1)
            await this.setupWallet();
    
            // 4. Check wallet funding before proceeding
            await this.checkWalletFunding();
    
            // 5. Create token mint keypair (optional vanity address --starts-with test:1)
            await this.createTokenMintKeypair();
    
            // 6. Create token with the mint keypair
            const tokenAddress = await this.createToken();
            
            // 7. Handle manual metadata upload
            const { metadata, metadataUrl } = await this.handleManualMetadata();
            
            // 8. Initialize metadata
            await this.initializeMetadata(tokenAddress, metadata, metadataUrl);
            
            // 9. Create token accounts
            await this.createTokenAccounts(tokenAddress);
            
            // 10. Mint tokens to provider's ATA
            await this.mintTokens(tokenAddress);
            
            // 11. Optional: Revoke authorities in correct order
            await this.revokeAuthorities(tokenAddress);
            
            // 12. Save final token information
            await this.saveTokenInfo();
    
            console.log('\n🎉 Token creation completed successfully!');
            console.log(`Token Address: ${this.tokenInfo.address}`);
            console.log(`Provider Token Account: ${this.walletInfo.provider.ataAddress}`);
            
            if (this.tokenInfo.mintKeypair) {
                console.log(`Token Mint Keypair: ${this.tokenInfo.mintKeypair}`);
            }
            
            console.log('\n✅ Check wallet-info.csv and token-info.csv for all details');
            
            // Display verification instructions
            console.log('\n📋 To verify your token:');
            console.log('1. Check token balance: spl-token accounts');
            console.log('2. View token metadata: spl-token display', this.tokenInfo.address);
            console.log('3. View transaction history on Solana Explorer');
        } catch (error) {
            console.error('❌ Error creating token:', error);
            throw error;
        } finally {
            this.rl.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const creator = new TokenCreator();
    creator.create().catch(console.error);
}

module.exports = TokenCreator;
