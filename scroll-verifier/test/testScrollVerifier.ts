import { Server } from '@chainlink/ccip-read-server';
import { makeScrollGateway } from '@ensdomains/scroll-gateway';
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

describe('ScrollVerifier', () => {
  let provider: Provider;
  let signer: Signer;
  let gateway: express.Application;
  let target: Contract;

  before(async () => {
    // Hack to get a 'real' ethers provider from hardhat. The default `HardhatProvider`
    // doesn't support CCIP-read.
    provider = new ethers.BrowserProvider(hre.network.provider);
    signer = await provider.getSigner(0);
    // How to test against public testnet.
    // 1. deploy l2 contract
    // `L2_ETHERSCAN_API_KEY=$L2_ETHERSCAN_API_KEY DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L2_PROVIDER_URL=$L2_PROVIDER_URL npx hardhat deploy --network scrollSepolia`
    // 2. deploy l1 contract
    // 2.1 Modify GATEWAY_URLS on 00_scroll_verifier.ts to point to localhost
    // 2.2 `L1_ETHERSCAN_API_KEY=$L1_ETHERSCAN_API_KEY DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL ROLLUP_ADDRESS=$ROLLUP_ADDRESS  npx hardhat deploy --network sepolia`
    // 3. startup gateway server
    // 3.0 `cd ../evm-gateway`
    // 3.1 Add .dev.vars and add L1_PROVIDER_URL, L2_PROVIDER_URL, and L2_ROLLUP
    // 3.2 `yarn dev`
    // 4. run the test 
    // `DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL ROLLUP_ADDRESS=$ROLLUP_ADDRESS yarn test --network sepolia`

    const rollupAddress = process.env.ROLLUP_ADDRESS;

    const gateway = await makeScrollGateway(
      (hre.network.config as any).url,
      (hre.config.networks[hre.network.companionNetworks.l2] as any).url,
      rollupAddress
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
