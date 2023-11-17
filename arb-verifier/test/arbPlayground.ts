/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Contract, ethers } from "ethers"

export const arbPlayground = async () => {
    console.log("go")
    const rpc = "https://eth-goerli.g.alchemy.com/v2/XsX8NB_NvPFNUIAPQmOSjP4rMqsrTGDV"
    const outboxGoerli = "0x45Af9Ed1D03703e480CE7d328fB684bb67DA5049"

    const validatorWallet = "0xAa01D5570E932a13eF9a06677eaf97d56a33393f"
    //const eventTopic = "0xb4df3847300f076a369cd76d2314b470a1194d9e8a6bb97f1860aee88a5f6748"

    const l1Provider = new ethers.JsonRpcProvider(rpc)

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
        address: "0x45Af9Ed1D03703e480CE7d328fB684bb67DA5049",
        topics: [
            '0xb4df3847300f076a369cd76d2314b470a1194d9e8a6bb97f1860aee88a5f6748',
        ]
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










}

arbPlayground() 