const Utils = require('../utils');

describe('Utils.parseKeypairPath', () => {
  it('extracts the keypair path from solana config output', () => {
    const mockOutput = `
Config File: /Users/user/.config/solana/cli/config.yml
RPC URL: https://api.mainnet-beta.solana.com 
WebSocket URL: wss://api.mainnet-beta.solana.com/ (computed)
Keypair Path: /Users/user/.config/solana/id.json 
Commitment: confirmed
`;

    expect(Utils.parseKeypairPath(mockOutput)).toBe('/Users/user/.config/solana/id.json');
  });

  it('returns null if no keypair path found', () => {
    const mockOutput = `Some unrelated output`;
    expect(Utils.parseKeypairPath(mockOutput)).toBeNull();
  });
});