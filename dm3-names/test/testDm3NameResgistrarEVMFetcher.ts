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
  ethers as ethersT,
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

describe.only('Dm3 Name Registrar Fetcher', () => {
  let provider: BrowserProvider;
  let signer: Signer;
  let verifier: Contract;
  let dm3NameRegistrar: Contract;
  let dm3NameRegistrarEVMFetcher: Contract;

  let parentDomain: string;

  beforeEach(async () => {
    // Hack to get a 'real' ethers provider from hardhat. The default `HardhatProvider`
    // doesn't support CCIP-read.
    provider = new ethers.BrowserProvider(ethers.provider._hardhatProvider);
    // provider.on("debug", (x: any) => console.log(JSON.stringify(x, undefined, 2)));
    signer = await provider.getSigner(0);
    const gateway = makeL1Gateway(provider as unknown as JsonRpcProvider);
    const server = new Server();
    gateway.add(server);
    const app = server.makeApp('/');
    const getUrl = FetchRequest.createGetUrlFunc();
    ethers.FetchRequest.registerGetUrl(async (req: FetchRequest) => {
      if (req.url != 'test:') return getUrl(req);

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

    //Deploy Verifier
    const l1VerifierFactory = await ethers.getContractFactory(
      'L1Verifier',
      signer
    );
    verifier = await l1VerifierFactory.deploy(['test:']);

    //Deploy Dm3NameRegistrar
    parentDomain = 'l2.dm3.eth';
    const dm3NameRegistrarFactory = await ethers.getContractFactory(
      'Dm3NameRegistrar',
      signer
    );
    dm3NameRegistrar = await dm3NameRegistrarFactory.deploy(
      ethers.namehash(parentDomain)
    );

    //Deploy Dm3NameRegistrarEVMFetcher

    const dm3NameRegistrarEVMFetcherFactory = await ethers.getContractFactory(
      'Dm3NameRegistrarEVMFetcher',
      signer
    );

    dm3NameRegistrarEVMFetcher = await dm3NameRegistrarEVMFetcherFactory.deploy(
      verifier.target,
      dm3NameRegistrar.target,
      parentDomain
    );
    // Mine an empty block so we have something to prove against
    await provider.send('evm_mine', []);
  });

  it('should resolve ETH Address', async () => {
    await dm3NameRegistrar.register('alice');
    await provider.send('evm_mine', []);

    const node = ethers.namehash(`alice.${parentDomain}`);
    const encodedName = ethers.dnsEncode(`alice.${parentDomain}`);

    const i = new ethers.Interface(['function addr(bytes32) returns(address)']);
    const calldata = i.encodeFunctionData('addr', [node]);

    const result2 = await dm3NameRegistrarEVMFetcher.resolve(
      encodedName,
      calldata,
      {
        enableCcipRead: true,
      }
    );
    const decoded = i.decodeFunctionResult('addr', result2);

    expect(decoded[0]).to.equal(await signer.getAddress());
  });
  it('should resolve name', async () => {
    await dm3NameRegistrar.register('alice');
    await provider.send('evm_mine', []);

    const reverseRecord = `${(await signer.getAddress())
      .slice(2)
      .toLowerCase()}.addr.reverse`;

    const node = ethers.namehash(reverseRecord);
    const encodedName = ethers.dnsEncode(`alice.${parentDomain}`);

    const i = new ethers.Interface(['function name(bytes32) returns(string)']);
    const calldata = i.encodeFunctionData('name', [node]);

    const result2 = await dm3NameRegistrarEVMFetcher.resolve(
      encodedName,
      calldata,
      {
        enableCcipRead: true,
      }
    );
    const decoded = i.decodeFunctionResult('name', result2);

    console.log('result', result2);
    expect(decoded[0]).to.equal(`alice.${parentDomain}`);
  });

  it('should resolve text record', async () => {
    await dm3NameRegistrar.register('alice');
    const key = 'name';
    const value = 'hello world';

    const node = ethers.namehash(`alice.${parentDomain}`);
    const encodedName = ethers.dnsEncode(`alice.${parentDomain}`);

    await dm3NameRegistrar.setText(node, key, value);

    await provider.send('evm_mine', []);

    const i = new ethers.Interface([
      'function text(bytes32,string) returns(string)',
    ]);
    const calldata = i.encodeFunctionData('text', [node, key]);
    const result2 = await dm3NameRegistrarEVMFetcher.resolve(
      encodedName,
      calldata,
      { enableCcipRead: true }
    );
    const decoded = i.decodeFunctionResult('text', result2);
    expect(decoded[0]).to.equal(value);
  });
  it('Should set the verifier correctly', async function () {
    const newVerifier = await (await provider.getSigner(1)).getAddress();
    await dm3NameRegistrarEVMFetcher.connect(signer).setVerifier(newVerifier);
    expect(await dm3NameRegistrarEVMFetcher.verifier()).to.equal(newVerifier);
  });

  it('Should set the target correctly', async function () {
    const newTarget = await (await provider.getSigner(1)).getAddress();
    await dm3NameRegistrarEVMFetcher.connect(signer).setTarget(newTarget);
    expect(await dm3NameRegistrarEVMFetcher.getFunction('target')()).to.equal(newTarget);
  });

  it('Should set the parent domain correctly', async function () {
    const parentDomain = 'foo.bar';
    await dm3NameRegistrarEVMFetcher
      .connect(signer)
      .setParentDomain(parentDomain);
    expect(await dm3NameRegistrarEVMFetcher.parentDomain()).to.equal(
      parentDomain
    );
  });
});
