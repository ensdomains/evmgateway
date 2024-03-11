import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider';
import type { HardhatEthersHelpers } from '@nomicfoundation/hardhat-ethers/types';
import { expect } from 'chai';
import { Contract, dnsEncode, ethers as ethersT, keccak256 } from 'ethers';
import { ethers } from 'hardhat';
import { EthereumProvider } from 'hardhat/types';
import { ens_normalize } from '@adraffy/ens-normalize'; // or require()

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
    target = await Dm3NameRegistrarFactory.deploy();
    signer = (await ethers.getSigners())[0];
  });

  it('can set dm3 name', async () => {
    await target.register(ethers.dnsEncode('alice.dm3'));

    const owner = await target.owner(ethers.namehash('alice.dm3'));
    const name = await target.name(signer.address);

    expect(owner).to.equal(signer.address);
    expect(decodeDnsName(name)).to.equal('alice.dm3');
  });
  it('registering a new name would overwrite the old name', async () => {
    await target.register(ethers.dnsEncode('alice.dm3'));

    let owner = await target.owner(ethers.namehash('alice.dm3'));
    let name = await target.name(signer.address);

    expect(owner).to.equal(signer.address);
    expect(decodeDnsName(name)).to.equal('alice.dm3');

    await target.register(ethers.dnsEncode('bob.dm3'));

    owner = await target.owner(ethers.namehash('bob.dm3'));
    name = await target.name(signer.address);

    const oldOwner = await target.owner(ethers.namehash('alice.dm3'));
    const oldName = await target.name(signer.address);

    expect(owner).to.equal(signer.address);
    expect(decodeDnsName(name)).to.equal('bob.dm3');

    expect(oldOwner).to.equal(ethers.ZeroAddress);
    expect(decodeDnsName(oldName)).to.equal('bob.dm3');
  });
  it('passing an empty name deletes an existing record', async () => {
    await target.register(ethers.dnsEncode('alice.dm3'));

    let owner = await target.owner(ethers.namehash('alice.dm3'));
    let name = await target.name(signer.address);

    expect(owner).to.equal(signer.address);
    expect(decodeDnsName(name)).to.equal('alice.dm3');

    await target.register(ethers.toUtf8Bytes(''));

    owner = await target.owner(ethers.namehash('alice.dm3'));
    name = await target.name(signer.address);

    expect(owner).to.equal(ethers.ZeroAddress);
    expect(name).to.equal('0x');
  });
});
function decodeDnsName(dnsName: string) {
  const buffer = Buffer.from(dnsName.slice(2), 'hex');
  const labels = [];
  let idx = 0;
  while (true) {
    const len = buffer.readUInt8(idx);
    if (len === 0) break;
    labels.push(buffer.slice(idx + 1, idx + len + 1).toString('utf8'));
    idx += len + 1;
  }
  return labels.join('.');
}