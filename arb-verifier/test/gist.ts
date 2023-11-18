/* eslint-disable prettier/prettier *//* 
import { Server } from '@chainlink/ccip-read-server';
import { Command } from 'commander';
import { ethers } from 'ethers';

const IResolverAbi = require('@ensdomains/arb-resolver-contracts/artifacts/contracts/l1/ArbitrumResolverStub.sol/IResolverService.json').abi
const helperAbi = require('@ensdomains/arb-resolver-contracts/artifacts/contracts/l1/AssertionHelper.sol/AssertionHelper.json').abi

const rollupAbi = require('../src/rollup.json')
const { BigNumber } = ethers
const program = new Command();
program
    .option('-r --l2_resolver_address <address>', 'RESOLVER_ADDRESS')
    .option('-h --helper_address <helper_address>', 'HELPER_ADDRESS')
    .option('-l1p --l1_provider_url <url1>', 'L1_PROVIDER_URL', 'http://localhost:8545')
    .option('-l2p --l2_provider_url <url2>', 'L2_PROVIDER_URL', 'http://localhost:8547')
    .option('-l1c --l1_chain_id <chain1>', 'L1_CHAIN_ID', '1337')
    .option('-l2c --l2_chain_id <chain2>', 'L2_CHAIN_ID', '412346')
    .option('-ru --rollup_address <rollup_address>', 'ROLLUP_ADDRESS', '0x7456c45bfd495b7bcf424c0a7993a324035f682f')
    .option('-d --debug', 'debug', false)
    // 
    .option('-v --verification_option <value>', 'latest|finalized|number_of_blocks', 'latest')
    .option('-p --port <number>', 'Port number to serve on', '8081');
program.parse(process.argv);
const options = program.opts();
console.log({ options })
const { l1_provider_url, l2_provider_url, rollup_address, helper_address, l2_resolver_address, l1_chain_id, l2_chain_id, debug, verification_option } = options
if (helper_address === undefined || l2_resolver_address === undefined) {
    throw ('Must specify --l2_resolver_address and --helper_address')
}

const l1provider = new ethers.providers.JsonRpcProvider(l1_provider_url);
const l2provider = new ethers.providers.JsonRpcProvider(l2_provider_url);
const rollup = new ethers.Contract(rollup_address, rollupAbi, l1provider);
const helper = new ethers.Contract(helper_address, helperAbi, l1provider);
const server = new Server();

server.add(IResolverAbi, [
    {
        type: 'addr(bytes32)',
        func: async ([node], { to, data: _callData }) => {
            const addrSlot = ethers.utils.keccak256(node + '00'.repeat(31) + '01');
            if (debug) {
                console.log(1, { node, to, _callData, l1_provider_url, l2_provider_url, l2_resolver_address, l1_chain_id, l2_chain_id })
                const blockNumber = (await l2provider.getBlock('latest')).number
                console.log(2, { blockNumber, addrSlot })
                let addressData
                try {
                    addressData = await l2provider.getStorageAt(l2_resolver_address, addrSlot)
                } catch (e) {
                    console.log(3, { e })
                }
                console.log(4, {
                    addressData
                })
            }
            let nodeIndex, ago
            if (verification_option === 'latest') {
                nodeIndex = await rollup.latestNodeCreated()
            } else {
                if (verification_option === 'finalized') {
                    ago = 0
                } else {
                    ago = parseInt(verification_option)
                }
                nodeIndex = (await rollup.latestConfirmed()).sub(ago)
            }
            console.log({ verification_option, nodeIndex: nodeIndex.toString(), ago })
            const nodeEventFilter = await rollup.filters.NodeCreated(nodeIndex);
            const nodeEvents = await rollup.queryFilter(nodeEventFilter);
            const assertion = nodeEvents[0].args!.assertion
            const sendRoot = await helper.getSendRoot(assertion)
            const blockHash = await helper.getBlockHash(assertion)
            const l2blockRaw = await l2provider.send('eth_getBlockByHash', [
                blockHash,
                false
            ]);
            console.log(5, { l2blockRaw })
            const stateRoot = l2blockRaw.stateRoot
            const blockarray = [
                l2blockRaw.parentHash,
                l2blockRaw.sha3Uncles,
                l2blockRaw.miner,
                l2blockRaw.stateRoot,
                l2blockRaw.transactionsRoot,
                l2blockRaw.receiptsRoot,
                l2blockRaw.logsBloom,
                BigNumber.from(l2blockRaw.difficulty).toHexString(),
                BigNumber.from(l2blockRaw.number).toHexString(),
                BigNumber.from(l2blockRaw.gasLimit).toHexString(),
                BigNumber.from(l2blockRaw.gasUsed).toHexString(),
                BigNumber.from(l2blockRaw.timestamp).toHexString(),
                l2blockRaw.extraData,
                l2blockRaw.mixHash,
                l2blockRaw.nonce,
                BigNumber.from(l2blockRaw.baseFeePerGas).toHexString(),
            ]
            const encodedBlockArray = ethers.utils.RLP.encode(blockarray)
            const slot = ethers.utils.keccak256(node + '00'.repeat(31) + '01');
            const proof = await l2provider.send('eth_getProof', [
                l2_resolver_address,
                [slot],
                { blockHash }
            ]);
            console.log(6, JSON.stringify(proof, null, 2))
            const accountProof = ethers.utils.RLP.encode(proof.accountProof)
            const storageProof = ethers.utils.RLP.encode((proof.storageProof as any[]).filter((x) => x.key === slot)[0].proof)
            const finalProof = {
                nodeIndex,
                blockHash,
                sendRoot,
                encodedBlockArray,
                stateTrieWitness: accountProof,
                stateRoot,
                storageTrieWitness: storageProof,
            };
            console.log(7, { finalProof })
            return [finalProof]
        }
    }
]);
const app = server.makeApp('/');
app.listen(options.port); */