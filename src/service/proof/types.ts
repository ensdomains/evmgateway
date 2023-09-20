/**
 * Response of the eth_getProof RPC method.
 */
export interface EthGetProofResponse {
    accountProof: string;
    balance: string;
    codeHash: string;
    nonce: string;
    storageHash: string;
    storageProof: {
        key: string;
        value: string;
        proof: string[];
    }[];
}
/**
 * The ProofInputObject that will be passed to the BedrockProofVerifier contract
 */
export interface StorageProof {
    key: string;
    storageTrieWitness: string;
}

export interface CreateProofResult {
    proof: string;
    result: string;
}
