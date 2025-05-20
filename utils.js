class Utils {
  static parseKeypairPath(configOutput) {
    const keypairPathMatch = configOutput.match(/Keypair Path: (.+)/);
    if (!keypairPathMatch) return null;
    return keypairPathMatch[1].trim();
  }
}

module.exports = Utils;