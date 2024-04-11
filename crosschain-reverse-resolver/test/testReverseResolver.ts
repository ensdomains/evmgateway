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

// looks like there are time dependencies for verification to success, hence adding a dalay
const wait = async x => {
  return new Promise(resolve => {
    setTimeout(resolve, 3000, 2 * x);
  });
};

describe('Crosschain Reverse Resolver', () => {
  let provider: BrowserProvider;
  let signer: Signer;
  let verifier: Contract;
  let target: Contract;
  let l2contract: Contract;
  let l2contractAddress: string;
  let defaultReverseResolver: Contract;
  let defaultReverseAddress: string;

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
      'L2ReverseResolver',
      signer
    );
    l2contract = await testL2Factory.deploy(ethers.namehash(`${NAMESPACE}.reverse`), NAMESPACE);
    l2contractAddress = await l2contract.getAddress();
    defaultReverseAddress = await defaultReverseResolver.getAddress();
    const testL1Factory = await ethers.getContractFactory(
      'L1ReverseResolver',
      signer
    );
    target = await testL1Factory.deploy(
      await verifier.getAddress(),
      l2contractAddress,
      defaultReverseAddress
    );
    // Mine an empty block so we have something to prove against
    await provider.send('evm_mine', []);
  });

  it("should test name", async() => {
    const name = 'vitalik.eth'
    const testAddress = await signer.getAddress()
    const node = await l2contract.node(
      testAddress,
    )
    const reverseLabel = testAddress.substring(2).toLowerCase()
    const l2ReverseName = `${reverseLabel}.${NAMESPACE}.reverse`
    const encodedL2ReverseName = encodeName(l2ReverseName)

    await l2contract.clearRecords(await signer.getAddress())
    await l2contract.setName(name)
    await provider.send("evm_mine", []);
    await wait(1);

    const i = new ethers.Interface(["function name(bytes32) returns(string)"])
    const calldata = i.encodeFunctionData("name", [node])
    const result2 = await target.resolve(encodedL2ReverseName, calldata, { enableCcipRead: true })
    // throws Error: invalid length for result data
    // const decoded = i.decodeFunctionResult("name", result2)
    expect(ethers.toUtf8String(result2)).to.equal(name);
  })

  it("should test fallback name", async() => {
    const testSigner = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'); 
    const testAddress = testSigner.address
    const name = 'myname.eth'
    const reverseLabel = testAddress.substring(2).toLowerCase()
    const l2ReverseName = `${reverseLabel}.${NAMESPACE}.reverse`
    const l2ReverseNode = ethers.namehash(l2ReverseName)
    const encodedL2ReverseName = encodeName(l2ReverseName)

    const defaultReverseName = `${reverseLabel}.default.reverse`
    const defaultReverseNode = ethers.namehash(defaultReverseName)
    const encodedDefaultReverseName = encodeName(defaultReverseName)

    const funcId = ethers
      .id('setNameForAddrWithSignature(address,string,uint256,bytes)')
      .substring(0, 10)
  
    const block = await provider.getBlock('latest')
    const inceptionDate = block?.timestamp
    const message =  ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'address', 'uint256', 'uint256'],
      [defaultReverseAddress, ethers.solidityPackedKeccak256(['bytes4', 'string'], [funcId, name]), testAddress, inceptionDate, 0],
    )
    const signature = await testSigner.signMessage(ethers.toBeArray(message))    
    await defaultReverseResolver['setNameForAddrWithSignature'](
      testAddress,
      name,
      inceptionDate,
      signature,
    )
    await provider.send("evm_mine", []);
    await wait(1);

    const i = new ethers.Interface(["function name(bytes32) returns(string)"])
    expect(await defaultReverseResolver['name(address)'](testAddress)).to.equal(name)

    const defaultcalldata = i.encodeFunctionData("name", [defaultReverseNode])
    const defaultResult = await defaultReverseResolver.resolve(encodedDefaultReverseName, defaultcalldata)
    expect(ethers.toUtf8String(defaultResult)).to.equal(name);

    const l2calldata = i.encodeFunctionData("name", [l2ReverseNode])
    const result2 = await target.resolve(encodedL2ReverseName, l2calldata, { enableCcipRead: true })
    expect(ethers.toUtf8String(result2)).to.equal(name);
  })

  it("should test text record", async() => {
    const key = 'name'
    const value = 'nick.eth'
    const testAddress = await signer.getAddress()
    const node = await l2contract.node(
      testAddress
    )
    const reverseLabel = testAddress.substring(2).toLowerCase()
    const l2ReverseName = `${reverseLabel}.${NAMESPACE}.reverse`
    const encodedL2ReverseName = encodeName(l2ReverseName)

    await l2contract.clearRecords(await  signer.getAddress())
    await l2contract.setText(key, value)
    await provider.send("evm_mine", []);
    await wait(1);

    const result = await l2contract.text(node, key)
    expect(result).to.equal(value);
    const i = new ethers.Interface(["function text(bytes32, string) returns(string)"])
    const calldata = i.encodeFunctionData("text", [node, key])
    const result2 = await target.resolve(encodedL2ReverseName, calldata, { enableCcipRead: true })
    expect(ethers.toUtf8String(result2)).to.equal(value);
  })

  it("should test fallback text", async() => {
    const testSigner = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'); 
    const testAddress = testSigner.address
    const key = 'name'
    const value = 'myname.eth'
    const reverseLabel = testAddress.substring(2).toLowerCase()
    const l2ReverseName = `${reverseLabel}.${NAMESPACE}.reverse`
    const l2ReverseNode = ethers.namehash(l2ReverseName)
    const encodedL2ReverseName = encodeName(l2ReverseName)

    const defaultReverseName = `${reverseLabel}.default.reverse`
    const defaultReverseNode = ethers.namehash(defaultReverseName)
    const encodedDefaultReverseName = encodeName(defaultReverseName)

    const funcId = ethers
      .id('setTextForAddrWithSignature(address,string,string,uint256,bytes)')
      .substring(0, 10)

    const block = await provider.getBlock('latest')
    const inceptionDate = block?.timestamp
    const message =  ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'address', 'uint256', 'uint256'],
      [defaultReverseAddress, ethers.solidityPackedKeccak256(['bytes4', 'string', 'string'], [funcId, key, value]), testAddress, inceptionDate, 0],
    )
    const signature = await testSigner.signMessage(ethers.toBeArray(message))
    await defaultReverseResolver['setTextForAddrWithSignature'](
      testAddress,
      key,
      value,
      inceptionDate,
      signature,
    )
    await provider.send("evm_mine", []);
    await wait(1);

    expect(await defaultReverseResolver["text(address,string)"](testAddress, key)).to.equal(value)
    const i = new ethers.Interface(["function text(bytes32,string) returns(string)"])

    const defaultcalldata = i.encodeFunctionData("text", [defaultReverseNode, key])
    const defaultResult = await defaultReverseResolver.resolve(encodedDefaultReverseName, defaultcalldata)
    expect(ethers.toUtf8String(defaultResult)).to.equal(value);

    const calldata = i.encodeFunctionData("text", [l2ReverseNode, key])
    const result2 = await target.resolve(encodedL2ReverseName, calldata, { enableCcipRead: true })
    expect(ethers.toUtf8String(result2)).to.equal(value);
  })

  it("should support interface", async() => {
    expect(await defaultReverseResolver.supportsInterface('0x9061b923')).to.equal(true) // IExtendedResolver
    expect(await target.supportsInterface('0x9061b923')).to.equal(true) // IExtendedResolver
    expect(await target.supportsInterface('0x01ffc9a7')).to.equal(true) // ERC-165 support
  })
});
