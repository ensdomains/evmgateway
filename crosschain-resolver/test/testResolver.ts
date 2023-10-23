import { makeL1Gateway } from '@ensdomains/l1-gateway';
import { Server } from '@chainlink/ccip-read-server';
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider';
import type { HardhatEthersHelpers } from '@nomicfoundation/hardhat-ethers/types';
import { expect } from 'chai';
import {
  Contract,
  JsonRpcProvider,
  Signer,
  ethers as ethersT
} from 'ethers';
import { FetchRequest } from 'ethers';
import { ethers } from 'hardhat';
import { EthereumProvider } from 'hardhat/types';
import request from 'supertest';

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

describe('L1Resolver', () => {
  let provider: JsonRpcProvider;
  let signer: Signer;
  let verifier: Contract;
  let target: Contract;
  let l2contract: Contract;

  before(async () => {
    // Hack to get a 'real' ethers provider from hardhat. The default `HardhatProvider`
    // doesn't support CCIP-read.
    // provider = new ethers.BrowserProvider(ethers.provider._hardhatProvider);
    provider = new ethers.JsonRpcProvider('http://localhost:8888')
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

    const testL2Factory = await ethers.getContractFactory(
      'L2Resolver',
      signer
    );
    l2contract = await testL2Factory.deploy();

    const testL1Factory = await ethers.getContractFactory(
      'L1Resolver',
      signer
    );
    target = await testL1Factory.deploy(await verifier.getAddress(), await l2contract.getAddress());

    // Mine an empty block so we have something to prove against
    await provider.send('evm_mine', []);
  });

  it("should test ETH Address", async() => {
    const node = '0x80ee077a908dffcf32972ba13c2df16b42688e1de21bcf17d3469a8507895eae'
    const addr = '0x5A384227B65FA093DEC03Ec34e111Db80A040615'
    await l2contract.clearRecords(node)
    await l2contract['setAddr(bytes32,address)'](node, addr)
    const result = await l2contract.addr(node, 60)
    console.log({result})
    expect(ethers.getAddress(result)).to.equal(addr);
    await provider.send("evm_mine", []);
    const result2 = await target['getAddr(bytes32)'](node, { enableCcipRead: true })
    console.log({result2})
    expect(result2).to.equal(addr);
  })
  it("should test non ETH Address", async() => {
    const node = '0x80ee077a908dffcf32972ba13c2df16b42688e1de21bcf17d3469a8507895eae'
    const addr = '0x76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac'
    const coinType = 0 // BTC
    await l2contract.clearRecords(node)
    await l2contract['setAddr(bytes32,uint256,bytes)'](node, coinType, addr)
    const result = await l2contract.addr(node, 0)
    expect(result).to.equal(addr);
    await provider.send("evm_mine", []);
    const result2 = await target['getAddr(bytes32,uint256)'](node, coinType, { enableCcipRead: true })
    console.log({result2})
    expect(result2).to.equal(addr);
  })

  it("should test text record", async() => {
    const node = '0x80ee077a908dffcf32972ba13c2df16b42688e1de21bcf17d3469a8507895eae'
    const key = 'name'
    const value = 'nick.eth'
    await l2contract.clearRecords(node)
    await l2contract.setText(node, key, value)
    await provider.send("evm_mine", []);
    const result = await l2contract.text(node, key)
    expect(result).to.equal(value);
    await provider.send("evm_mine", []);
    const result2 = await target.getText(node, key, { enableCcipRead: true })
    expect(result2).to.equal(value);
  })
});
