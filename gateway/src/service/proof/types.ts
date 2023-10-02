/**
 * Response of the eth_getProof RPC method.
 */
export interface EthGetProofResponse {
    accountProof: string[];
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
