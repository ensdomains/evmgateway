/* eslint-disable prettier/prettier */

import { expect } from "chai"
import { AbiCoder, Contract, JsonRpcProvider, ethers } from "ethers"
import hardhat from "hardhat"
import { ethers as ethers5 } from "ethers5"
import { ArbProofService } from "@ensdomains/arb-gateway"

import rollupAbi from "./abi/rollupABI"


const rpcMainnet = "https://eth-goerli.g.alchemy.com/v2/XsX8NB_NvPFNUIAPQmOSjP4rMqsrTGDV"
const rpcArbitrum = "https://arb-goerli.g.alchemy.com/v2/k2Vp4opdLW3ueLYaTPndSFtx4m7T3s71"
const rollupAddr = "0x45e5cAea8768F42B385A366D3551Ad1e0cbFAb17"
const helperAddr = "0xC2ffb7bB521f7C48aAA3Ee0e3E35D5ca1A6CE53A"

const testL2OnArbi = "0x2161d46ad2b7dd9c9f58b8be0609198899fb431d"



describe("Arbi Verifier", () => {

    it.only("latest", async () => {
        const l1Provider = new ethers.JsonRpcProvider(rpcMainnet)
        const l2Provider = new JsonRpcProvider(rpcArbitrum);
        const l1LegacyProvider = new ethers5.providers.JsonRpcProvider(
            rpcMainnet
        );
        const l2LegacyProvider = new ethers5.providers.JsonRpcProvider(
            rpcArbitrum
        );
        const s = new ArbProofService(
            l2Provider,
            l1LegacyProvider,
            l2LegacyProvider,
            rollupAddr,
            helperAddr
        );

        const getBlock = await s.getProvableBlock()
        const proof = await s.getProofs(getBlock, testL2OnArbi, [0n])


        const outboxF = await hardhat.ethers.getContractFactory("MockRollup")
        const mockOutbox = await outboxF.deploy()

        const rollup = new Contract(rollupAddr, rollupAbi, l1Provider)

        const proofEnc = AbiCoder.defaultAbiCoder().decode(
            [
                'tuple(bytes32 version, bytes32 sendRoot, bytes32 blockHash,uint64 nodeIndex,bytes rlpEncodedBlock)',
                'tuple(bytes[] stateTrieWitness, bytes[][] storageProofs)',
            ],
            proof

        );

        const idx = proofEnc[0][3]


        const node = await rollup.getNode(idx)

        const abiEncoded = ethers.AbiCoder.defaultAbiCoder().encode([
            "bytes32", "bytes32", "bytes32", "uint64", "uint64", "uint64", "uint64", "uint64", "uint64", "uint64", "uint64", "bytes32"
        ], node)


        await mockOutbox.pushNode(
            idx,
            abiEncoded,
        )
        /**
         * Deploy verifier
        */

        const f = await hardhat.ethers.getContractFactory("ArbVerifier")
        const arbiVerfifier = await f.deploy(await mockOutbox.getAddress(), ["d"])


        /**
         * Deploy MockTestL1
         */


        const fMockTest = await hardhat.ethers.getContractFactory("MockTestL1")
        const mockTestL1 = await fMockTest.deploy(await arbiVerfifier.getAddress(), testL2OnArbi)

        const req = await mockTestL1.getLatest()

        const [, , commands, , constants] = req
        const res = await arbiVerfifier.getStorageValues(testL2OnArbi, [...commands], [...constants], proof)
        expect(res[0]).to.equal(42n)
    })
})