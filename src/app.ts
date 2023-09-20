import { Server } from '@chainlink/ccip-read-server';
import { ethers, BigNumber } from 'ethers';
import { ProofService, StorageLayout } from './service/proof/ProofService';
import { CreateProofResult } from './service/proof/types';

const l1Provider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC_URL);
const l2Provider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC_URL);
const proofService = new ProofService(l1Provider, l2Provider);

const MAGIC_SLOT = BigNumber.from('0xd3b7df68fbfff5d2ac8f3603e97698b8e10d49e5cc92d1c72514f593c17b2229');

export function makeApp(path: string) {
  const server = new Server();
  const abi = [
    'function getStorageSlots(address addr, bytes32[][] memory paths) external view returns(bytes memory witness)'
  ];
  server.add(abi, [
    {
      type: 'getStorageSlots',
      func: async (args: ethers.utils.Result) => {
        const [addr, paths] = args;
        const proofs: CreateProofResult[] = [];
        for(let i = 0; i < paths.length; i++) {
          const path = paths[i];
          let slot = ethers.utils.arrayify(path[0]);

          // MSB indicates if the proof should be dynamic; check it and mask it out.
          const isDynamic = slot[0] & 0x80;
          slot[0] &= 0x7f;

          // If there are multiple path elements, recursively hash them solidity-style to get the final slot.
          for(let j = 1; j < path.length; j++) {
            let index = ethers.utils.arrayify(path[j]);
            // Indexes close to MAGIC_SLOT are replaced with the result of a previous operation.
            const offset = BigNumber.from(index).sub(MAGIC_SLOT);
            if(offset.lt(proofs.length)) {
              index = ethers.utils.arrayify(proofs[offset.toNumber()].result);
            }
            slot = ethers.utils.arrayify(ethers.utils.solidityKeccak256(['bytes32', 'bytes32'], [slot, index]));
          }
          proofs.push(await proofService.createProof(addr, ethers.utils.hexlify(slot), isDynamic ? StorageLayout.DYNAMIC : StorageLayout.FIXED));
        }
        return [ethers.utils.defaultAbiCoder.encode(['bytes[]'], [proofs.map((proof) => proof.proof)])];
      }
    }
  ]);
  return server.makeApp(path);
}