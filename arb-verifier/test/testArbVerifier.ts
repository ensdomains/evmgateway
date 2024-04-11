import { Server } from '@chainlink/ccip-read-server';
import { makeArbGateway } from '@ensdomains/arb-gateway';
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider';
import type { HardhatEthersHelpers } from '@nomicfoundation/hardhat-ethers/types';
import { expect } from 'chai';
import {
  Contract,
  FetchRequest,
  Provider,
  Signer,
  ethers as ethersT
} from 'ethers';
import express from 'express';
import hre, { ethers } from 'hardhat';
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

describe('ArbVerifier', () => {
  let provider: Provider;
  let signer: Signer;
  let gateway: express.Application;
  let target: Contract;

  before(async () => {
    // Hack to get a 'real' ethers provider from hardhat. The default `HardhatProvider`
    // doesn't support CCIP-read.
    provider = new ethers.BrowserProvider(hre.network.provider);
    signer = await provider.getSigner(0);

    //Rollup address according to sequencer config. Unfortunately, there is no endpoint to fetch it at runtime from the rollup.
    //The address can be found at nitro-testnode-sequencer-1/config/deployment.json 
    const rollupAddress = process.env.ROLLUP_ADDRESS;
    // When testing against Goerli, replace with this address
    // const rollupAddress = '0x45e5cAea8768F42B385A366D3551Ad1e0cbFAb17';
    const chainId = hre.network.config.chainId
    console.log(hre.network.config)
    console.log({chainId})
    const gateway = await makeArbGateway(
      (hre.network.config as any).url, 
      (hre.config.networks[hre.network.companionNetworks.l2] as any).url,
      rollupAddress,
      chainId,
    );
    const server = new Server()
    gateway.add(server)
    const app = server.makeApp('/')


    // Replace ethers' fetch function with one that calls the gateway directly.
    const getUrl = FetchRequest.createGetUrlFunc();
    ethers.FetchRequest.registerGetUrl(async (req: FetchRequest) => {
      if (req.url != "test:") return getUrl(req);

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

    const targetDeployment = await hre.deployments.get('TestL1');
    target = await ethers.getContractAt('TestL1', targetDeployment.address, signer);
  })

  it('simple proofs for fixed values', async () => {
    const result = await target.getLatest({ enableCcipRead: true });
    expect(Number(result)).to.equal(42);
  });

  it('simple proofs for dynamic values', async () => {
    const result = await target.getName({ enableCcipRead: true });
    expect(result).to.equal('Satoshi');
  });

  it('nested proofs for dynamic values', async () => {
    const result = await target.getHighscorer(42, { enableCcipRead: true });
    expect(result).to.equal('Hal Finney');
  });

  it('nested proofs for long dynamic values', async () => {
    const result = await target.getHighscorer(1, { enableCcipRead: true });
    expect(result).to.equal(
      'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.'
    );
  });

  it('nested proofs with lookbehind', async () => {
    const result = await target.getLatestHighscore({ enableCcipRead: true });
    expect(Number(result)).to.equal(12345);
  });

  it('nested proofs with lookbehind for dynamic values', async () => {
    const result = await target.getLatestHighscorer({ enableCcipRead: true });
    expect(result).to.equal('Hal Finney');
  });

  it('mappings with variable-length keys', async () => {
    const result = await target.getNickname('Money Skeleton', {
      enableCcipRead: true,
    });
    expect(result).to.equal('Vitalik Buterin');
  });

  it('nested proofs of mappings with variable-length keys', async () => {
    const result = await target.getPrimaryNickname({ enableCcipRead: true });
    expect(result).to.equal('Hal Finney');
  });

  it('treats uninitialized storage elements as zeroes', async () => {
    const result = await target.getZero({ enableCcipRead: true });
    expect(Number(result)).to.equal(0);
  });

  it('treats uninitialized dynamic values as empty strings', async () => {
    const result = await target.getNickname('Santa', { enableCcipRead: true });
    expect(result).to.equal("");
  })
});
