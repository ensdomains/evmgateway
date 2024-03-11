import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider';
import type { HardhatEthersHelpers } from '@nomicfoundation/hardhat-ethers/types';
import { expect } from 'chai';
import { Contract, ethers as ethersT } from 'ethers';
import { ethers } from 'hardhat';
import { EthereumProvider } from 'hardhat/types';

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

describe.only('Dm3 name registrar', () => {
  let target: Contract;
  let signer: ethers.Signer;

  before(async () => {
    const Dm3NameRegistrarFactory =
      await ethers.getContractFactory('Dm3NameRegistrar');
    const parentNode = ethers.namehash('op.dm3.eth');
    target = await Dm3NameRegistrarFactory.deploy(parentNode);
    signer = (await ethers.getSigners())[0];
  });

  it('can set dm3 name', async () => {
    await target.register('alice');

    const owner = await target.owner(ethers.namehash('alice.op.dm3.eth'));
    const name = await target.name(signer.address);

    expect(owner).to.equal(signer.address);
    expect(name).to.equal('alice');
  });
  it('can use addr to retrive address of node', async () => {
    await target.register('alice');

    const addr = await target.addr(ethers.namehash('alice.op.dm3.eth'));
    expect(addr).to.equal(signer.address);
  });
  it('registering a new name would overwrite the old name', async () => {
    await target.register('alice');

    let owner = await target.owner(ethers.namehash('alice.op.dm3.eth'));
    let name = await target.name(signer.address);

    expect(owner).to.equal(signer.address);
    expect(name).to.equal('alice');

    await target.register('bob');

    owner = await target.owner(ethers.namehash('bob.op.dm3.eth'));
    name = await target.name(signer.address);

    const oldOwner = await target.owner(ethers.namehash('alice.op.dm3.eth'));

    expect(owner).to.equal(signer.address);
    expect(name).to.equal('bob');

    expect(oldOwner).to.equal(ethers.ZeroAddress);
  });
  it('passing an empty name deletes an existing record', async () => {
    await target.register('alice');

    let owner = await target.owner(ethers.namehash('alice.op.dm3.eth'));
    let name = await target.name(signer.address);

    expect(owner).to.equal(signer.address);
    expect(name).to.equal('alice');

    await target.register(ethers.toUtf8Bytes(''));

    owner = await target.owner(ethers.namehash('alice.op.dm3.eth'));
    name = await target.name(signer.address);

    expect(owner).to.equal(ethers.ZeroAddress);
    expect(name).to.equal('');
  });
});