/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { AbiCoder, Contract, Interface, JsonRpcProvider, ethers } from "ethers"
import { ethers as ethers5 } from "ethers5"
const test1Contract = "0x2161d46ad2b7dd9c9f58b8be0609198899fb431d"

import rollupAbi from "./abi/rollupABI"
import helperAbi from "./abi/helperAbi"
import { ArbProofService } from "@ensdomains/arb-gateway"

const rpcMainnet = "https://eth-goerli.g.alchemy.com/v2/XsX8NB_NvPFNUIAPQmOSjP4rMqsrTGDV"
const rpcArbitrum = "https://arb-goerli.g.alchemy.com/v2/k2Vp4opdLW3ueLYaTPndSFtx4m7T3s71"
const outboxGoerli = "0x45Af9Ed1D03703e480CE7d328fB684bb67DA5049"
const rollupAddr = "0x45e5cAea8768F42B385A366D3551Ad1e0cbFAb17"
const helperAddr = "0xC2ffb7bB521f7C48aAA3Ee0e3E35D5ca1A6CE53A"


const l1Provider = new ethers.JsonRpcProvider(rpcMainnet)
const l2Provider = new ethers.JsonRpcProvider(rpcArbitrum, {
    chainId: 421613,
    name: "arbi goelri"
})

const runProofService = async () => {

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
    const proofs = await s.getProofs(getBlock, test1Contract, [0n])

    console.log(proofs)

}


//arbPlayground()
//readFromContract()
//runProofService()

const withRollup = async () => {
    const rollup = new ethers5.Contract(rollupAddr, rollupAbi, new ethers5.providers.JsonRpcProvider(rpcMainnet))
    const helper = new ethers5.Contract(helperAddr, helperAbi, new ethers5.providers.JsonRpcProvider(rpcArbitrum))

    const nodeIdx = await rollup.latestNodeCreated()

    const nodeEventFilter = await rollup.filters.NodeCreated(nodeIdx);
    const nodeEvents = await rollup.queryFilter(nodeEventFilter) as any;
    const assertion = nodeEvents[0].args!.assertion

    const sendRoot = await helper.getSendRoot(assertion)
    const blockHash = await helper.getBlockHash(assertion)

    const l2blockRaw = await l2Provider.send('eth_getBlockByHash', [
        blockHash,
        false
    ]);
    const stateRoot = l2blockRaw.stateRoot
    console.log(l2blockRaw)
    const blockarray = [
        l2blockRaw.parentHash,
        l2blockRaw.sha3Uncles,
        l2blockRaw.miner,
        l2blockRaw.stateRoot,
        l2blockRaw.transactionsRoot,
        l2blockRaw.receiptsRoot,
        l2blockRaw.logsBloom,
        ethers5.BigNumber.from(l2blockRaw.difficulty).toHexString(),
        ethers5.BigNumber.from(l2blockRaw.number).toHexString(),
        ethers5.BigNumber.from(l2blockRaw.gasLimit).toHexString(),
        ethers5.BigNumber.from(l2blockRaw.gasUsed).toHexString(),
        ethers5.BigNumber.from(l2blockRaw.timestamp).toHexString(),
        l2blockRaw.extraData,
        l2blockRaw.mixHash,
        l2blockRaw.nonce,
        ethers5.BigNumber.from(l2blockRaw.baseFeePerGas).toHexString(),
    ]


    const encodedBlockArray = ethers.encodeRlp(blockarray)
    const slot = ethers.ZeroHash

    console.log(encodedBlockArray)

    console.log(nodeIdx.toString())

    console.log(nodeIdx.toString())

}

//withRollup()

const getNode = async () => {
    const idx = 12323

    const rollup = new Contract(rollupAddr, rollupAbi,l1Provider)

    const n = await rollup.getNode(idx)

    console.log(n)

}

getNode()