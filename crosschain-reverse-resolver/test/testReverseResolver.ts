import { makeL1Gateway } from '@ensdomains/l1-gateway';
import { Server } from '@chainlink/ccip-read-server';
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider';
import type { HardhatEthersHelpers } from '@nomicfoundation/hardhat-ethers/types';
import { expect } from 'chai';
import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  Signer,
  ethers as ethersT
} from 'ethers';
import { FetchRequest } from 'ethers';
import { ethers } from 'hardhat';
import { EthereumProvider } from 'hardhat/types';
import request from 'supertest';
import packet from 'dns-packet';
const NAMESPACE = 2147483658 // OP
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')
const labelhash = (label) => ethers.keccak256(ethers.toUtf8Bytes(label))

type ethersObj = typeof ethersT &
  Omit<HardhatEthersHelpers, 'provider'> & {
    provider: Omit<HardhatEthersProvider, '_hardhatProvider'> & {
      _hardhatProvider: EthereumProvider;
    };
  };

declare module 'hardhat/types/runtime' {
  const ethers: ethersObj;
  interface HardhatRuntimeEnvironment {
    ethers: ethersObj;
  }
}

describe('Crosschain Reverse Resolver', () => {
  let provider: BrowserProvider;
  let signer: Signer;
  let verifier: Contract;
  let target: Contract;
  let l2contract: Contract;
  let defaultReverseResolver: Contract;

  before(async () => {
    // Hack to get a 'real' ethers provider from hardhat. The default `HardhatProvider`
    // doesn't support CCIP-read.
    provider = new ethers.BrowserProvider(ethers.provider._hardhatProvider);
    // provider.on("debug", (x: any) => console.log(JSON.stringify(x, undefined, 2)));
    signer = await provider.getSigner(0);
    const gateway = makeL1Gateway(provider as unknown as JsonRpcProvider);
    const server = new Server()
    gateway.add(server)
    const app = server.makeApp('/')
    const getUrl = FetchRequest.createGetUrlFunc();    
    ethers.FetchRequest.registerGetUrl(async (req: FetchRequest) => {
      if(req.url != "test:") return getUrl(req);

      const r = request(app).post('/');
      if (req.hasBody()) {
        r.set('Content-Type', 'application/json').send(
          ethers.toUtf8String(req.body)
        );
      }
      const response = await r;
      return {
        statusCode: response.statusCode,
        statusMessage: response.ok ? 'OK' : response.statusCode.toString(),
        body: ethers.toUtf8Bytes(JSON.stringify(response.body)),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    });
    const l1VerifierFactory = await ethers.getContractFactory(
      'L1Verifier',
      signer
    );
    verifier = await l1VerifierFactory.deploy(['test:']);
    const DefaultReverseResolverFactory = await ethers.getContractFactory(
      'DefaultReverseResolver',
    )
    defaultReverseResolver = await DefaultReverseResolverFactory.deploy()
    await provider.send('evm_mine', []);
    const testL2Factory = await ethers.getContractFactory(
      'L2ReverseRegistrar',
      signer
    );
    l2contract = await testL2Factory.deploy(ethers.namehash(`${NAMESPACE}.reverse`), NAMESPACE);

    const testL1Factory = await ethers.getContractFactory(
      'L1ReverseResolver',
      signer
    );
    target = await testL1Factory.deploy(
      await verifier.getAddress(),
      await l2contract.getAddress(),
      await defaultReverseResolver.getAddress()
    );
    // Mine an empty block so we have something to prove against
    await provider.send('evm_mine', []);
  });

  it.only("should test name", async() => {
    const name = 'vitalik.eth'
    const encodedname = encodeName(name)
    const node = await l2contract.node(
      await signer.getAddress(),
    )
    console.log({address:await signer.getAddress()})
    await l2contract.clearRecords(await signer.getAddress())
    await l2contract.setName(name)
    await provider.send("evm_mine", []);
    const i = new ethers.Interface(["function name(bytes32) returns(string)"])
    const calldata = i.encodeFunctionData("name", [node])
    const result2 = await target.resolve(encodedname, calldata, { enableCcipRead: true })
    // throws Error: invalid length for result data
    // const decoded = i.decodeFunctionResult("name", result2)
    expect(ethers.toUtf8String(result2)).to.equal(name);
  })

  it.only("should test fallback name", async() => {
    const testSigner = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'); 
    const testAddress = testSigner.address
    console.log(1, {testSigner})
    const name = 'myname.eth'
    const reverseLabel = testAddress.substring(2).toLowerCase()
    const reverseLabelHash = labelhash(reverseLabel)
    
    const defaultReverseName = `${reverseLabel}.default.reverse`
    const defaultReverseNode = ethers.namehash(defaultReverseName)
    const encodedDefaultReverseName = encodeName(defaultReverseName)

    const l2ReverseName = `${reverseLabel}.${NAMESPACE}.reverse`
    const l2ReverseNode = ethers.namehash(l2ReverseName)
    const encodedL2ReverseName = encodeName(l2ReverseName)

    console.log(2,{
      reverseLabel,reverseLabelHash,
      defaultReverseName, defaultReverseNode, encodedDefaultReverseName, 
      l2ReverseName, l2ReverseNode, encodedL2ReverseName,
    })
    const funcId = ethers
      .id('setNameForAddrWithSignature(address,string,uint256,bytes)')
      .substring(0, 10)
  
      console.log(4)
    const block = await provider.getBlock('latest')
    const inceptionDate = block?.timestamp
    console.log(6, {funcId, testAddress, inceptionDate})
    const message =  ethers.solidityPackedKeccak256(
      ['bytes32', 'address', 'uint256', 'uint256'],
      [ethers.solidityPackedKeccak256(['bytes4', 'string'], [funcId, name]), testAddress, inceptionDate, 0],
    )
    console.log(62, {message})
    const signature = await testSigner.signMessage(ethers.toBeArray(message))
    
    console.log(63, {signature})
    await defaultReverseResolver['setNameForAddrWithSignature'](
      testAddress,
      name,
      inceptionDate,
      signature,
    )
    console.log(8)
    await provider.send("evm_mine", []);
    expect(await defaultReverseResolver.name(testAddress)).to.equal(name)
    // const result2 = await target.name(node, { enableCcipRead: true })
    const i = new ethers.Interface(["function name(bytes32) returns(string)"])
    const calldata = i.encodeFunctionData("name", [l2ReverseNode])
    console.log(10, {
      l2ReverseNode,
      encodedL2ReverseName, calldata
    })
    const result2 = await target.resolve(encodedL2ReverseName, calldata, { enableCcipRead: true })
    console.log(11, {result2})
    expect(ethers.toUtf8String(result2)).to.equal(name);
    // const name = 'vitalik.eth'
    // const node = await l2contract.node(
    //   await signer.getAddress(),
    // )
    // await l2contract.clearRecords(await  signer.getAddress())
    // await l2contract.setName(name)
    // await provider.send("evm_mine", []);
    // const result2 = await target.name(node, { enableCcipRead: true })
    // expect(result2).to.equal(name);
  })

  it("should test text record", async() => {
    const key = 'name'
    const value = 'nick.eth'
    const node = await l2contract.node(
      await signer.getAddress(),
    )
    await l2contract.clearRecords(await  signer.getAddress())
    await l2contract.setText(key, value)
    await provider.send("evm_mine", []);
    const result = await l2contract.text(node, key)
    expect(result).to.equal(value);
    const result2 = await target.text(node, key, { enableCcipRead: true })
    expect(result2).to.equal(value);
  })

  it("should support interface", async() => {
    expect(await target.supportsInterface('0x59d1d43c')).to.equal(true) // ITextResolver
    expect(await target.supportsInterface('0x691f3431')).to.equal(true) // INameResolver
    expect(await target.supportsInterface('0x01ffc9a7')).to.equal(true) // ERC-165 support
  })
});
