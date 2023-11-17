/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { EVMProofHelper } from "@ensdomains/evm-gateway"
import { Contract, ethers } from "ethers"
import { ArbProofService } from "../../arb-gateway/src/ArbProofService"

const test1Contract = "0x2161d46ad2b7dd9c9f58b8be0609198899fb431d"

const rpcMainnet = "https://eth-goerli.g.alchemy.com/v2/XsX8NB_NvPFNUIAPQmOSjP4rMqsrTGDV"
const rpcArbitrum = "https://arb-goerli.g.alchemy.com/v2/k2Vp4opdLW3ueLYaTPndSFtx4m7T3s71"
const outboxGoerli = "0x45Af9Ed1D03703e480CE7d328fB684bb67DA5049"
const l1Provider = new ethers.JsonRpcProvider(rpcMainnet)
const l2Provider = new ethers.JsonRpcProvider(rpcArbitrum, {
    chainId: 421613,
    name: "arbi goelri"
})
export const arbPlayground = async () => {
    console.log("go")

    const eventTopic = "0xb4df3847300f076a369cd76d2314b470a1194d9e8a6bb97f1860aee88a5f6748"

    const latestBlocknr = await l1Provider.getBlockNumber()
    const latestBlock = await l1Provider.getBlock(latestBlocknr)

    console.log({
        blockNr: latestBlock?.number,
        hash: latestBlock?.hash
    })

    const abi = [
        "event SendRootUpdated(bytes32 indexed outputRoot, bytes32 indexed l2BlockHash)",
    ];


    const curerntB = await l1Provider.getBlockNumber()

    const filter = {
        fromBlock: curerntB - 1000,
        toBlock: curerntB,
        address: outboxGoerli,
        topics: [eventTopic]
    };

    const iface = new ethers.Interface(abi)



    const logs = await l1Provider.getLogs(filter);
    const latestLog = logs[logs.length - 1];

    const e = iface.parseLog({
        topics: [...latestLog.topics],
        data: latestLog.data
    })

    const [outputRoot, l2BlockHash] = e.args

    console.log(outputRoot, l2BlockHash)
    const l2Block = await l2Provider.getBlock(l2BlockHash)

    const targetBlocknr = l2Block.number

    const proofHelper = new EVMProofHelper(l2Provider)

    const proofs = await proofHelper.getProofs(targetBlocknr, test1Contract, [0n, 1n])

    console.log(proofs)



}

const runProofService = async () => {
    const s = new ArbProofService(
        l1Provider,
        l2Provider,
        outboxGoerli
    );

    const getBlock = await s.getProvableBlock()
    const proofs = await s.getProofs(getBlock, test1Contract, [0n, 1n])

    console.log(proofs)

}

const readFromContract = async () => {

    const abi = [
        "function latest() view returns (uint256)",
        "function name() view returns (string memory)",
    ]
    const c = new Contract(test1Contract, abi, l2Provider)

    const latest = await c.latest()

    console.log(latest.toString())
}
//arbPlayground()
//readFromContract()
runProofService()

