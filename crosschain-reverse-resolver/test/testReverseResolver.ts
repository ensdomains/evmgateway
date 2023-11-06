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
const NAMESPACE = 2147483658 // OP

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
    const testL2Factory = await ethers.getContractFactory(
      'L2ReverseRegistrar',
      signer
    );
    l2contract = await testL2Factory.deploy(ethers.namehash(`${NAMESPACE}.reverse`));
    const testL1Factory = await ethers.getContractFactory(
      'L1ReverseResolver',
      signer
    );
    target = await testL1Factory.deploy(await verifier.getAddress(), await l2contract.getAddress());
    // Mine an empty block so we have something to prove against
    await provider.send('evm_mine', []);
  });

  it("should test name", async() => {
    const name = 'vitalik.eth'
    const node = await l2contract.node(
      await signer.getAddress(),
    )
    await l2contract.setName(name)
    await provider.send("evm_mine", []);
    const result2 = await target.name(node, { enableCcipRead: true })
    expect(result2).to.equal(name);
  })

  it("should test text record", async() => {
    const node = await l2contract.node(
      await signer.getAddress(),
    )
    const key = 'name'
    const value = 'nick.eth'
    await l2contract.setText(key, value)
    await provider.send("evm_mine", []);
    const result = await l2contract.text(node, key)
    expect(result).to.equal(value);
    const result2 = await target.text(node, key, { enableCcipRead: true })
    expect(result2).to.equal(value);
  })

});
