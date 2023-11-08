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
const node = ethers.namehash('foo.eth')
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'
const EMPTY_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

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

describe('Crosschain Resolver', () => {
  let provider: BrowserProvider;
  let signer: Signer;
  let verifier: Contract;
  let target: Contract;
  let l2contract: Contract;
  let ens: Contract;
  let wrapper: Contract;
  let baseRegistrar: Contract;
  let signerAddress, resolverAddress, wrapperAddress, metaDataserviceAddress

  before(async () => {
    // Hack to get a 'real' ethers provider from hardhat. The default `HardhatProvider`
    // doesn't support CCIP-read.
    provider = new ethers.BrowserProvider(ethers.provider._hardhatProvider);
    // provider.on("debug", (x: any) => console.log(JSON.stringify(x, undefined, 2)));
    signer = await provider.getSigner(0);
    signerAddress = await signer.getAddress()
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
    const ensFactory = await ethers.getContractFactory('ENSRegistry',signer);
    ens = await ensFactory.deploy();
    const ensAddress = await ens.getAddress()
    const baseRegistrarFactory = await ethers.getContractFactory('BaseRegistrarImplementation',signer);
    console.log({ensAddress, namehash:ethers.namehash('eth')})
    baseRegistrar = await baseRegistrarFactory.deploy(ensAddress,ethers.namehash('eth'))
    const baseRegistrarAddress = await baseRegistrar.getAddress()
    console.log({baseRegistrarAddress, signerAddress})
    await baseRegistrar.addController(signerAddress)
    const metaDataserviceFactory = await ethers.getContractFactory('StaticMetadataService',signer);
    const metaDataservice = await metaDataserviceFactory.deploy('https://ens.domains')
    const metaDataserviceAddress = await metaDataservice.getAddress()
    console.log({metaDataserviceAddress})
    const reverseRegistrarFactory = await ethers.getContractFactory('ReverseRegistrar',signer);
    const reverseRegistrar = await reverseRegistrarFactory.deploy(ensAddress)
    const reverseRegistrarAddress = await reverseRegistrar.getAddress()
    console.log({reverseRegistrarAddress})
    await ens.setSubnodeOwner(EMPTY_BYTES32, labelhash('reverse'), signerAddress)
    await ens.setSubnodeOwner(ethers.namehash('reverse'),labelhash('addr'), reverseRegistrarAddress)
    await ens.setSubnodeOwner(EMPTY_BYTES32, labelhash('eth'), signerAddress)
    await ens.setSubnodeOwner(ethers.namehash('eth'), labelhash('foo'), signerAddress)
    const publicResolverFactory = await ethers.getContractFactory('PublicResolver',signer);
    const publicResolver = await publicResolverFactory.deploy(
      ensAddress,
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      reverseRegistrarAddress,
    )
    const publicResolverAddress = await publicResolver.getAddress()
    console.log({publicResolverAddress})
    await reverseRegistrar.setDefaultResolver(publicResolverAddress)

    console.log(4, {ensAddress,baseRegistrarAddress, metaDataserviceAddress})
    const wrapperFactory = await ethers.getContractFactory('NameWrapper',signer);
    console.log(5)
    await provider.send('evm_mine', []);
    console.log(6)
    wrapper = await wrapperFactory.deploy(
      ensAddress,
      baseRegistrarAddress,
      metaDataserviceAddress
    );
    console.log(7, {wrapperAddress})
    wrapperAddress = await wrapper.getAddress()
    console.log(8)
    const l1VerifierFactory = await ethers.getContractFactory(
      'L1Verifier',
      signer
    );
    verifier = await l1VerifierFactory.deploy(['test:']);
    console.log(8)
    const impl = await ethers.getContractFactory(
      'DelegatableResolver',
      signer
    );
    console.log(9)
    const implContract = await impl.deploy();
    console.log(10)
    const testL2Factory = await ethers.getContractFactory(
      'DelegatableResolverFactory',
      signer
    );
    console.log(11)
    const l2factoryContract = await testL2Factory.deploy(await implContract.getAddress());
    console.log(12)
    const tx = await l2factoryContract.create(await signer.getAddress());
    await provider.send('evm_mine', []);
    console.log(13)
    await tx.wait()
    const logs = await l2factoryContract.queryFilter("NewDelegatableResolver")
    const [resolver] = logs[0].args
    resolverAddress = resolver
    console.log(14)
    const testL1Factory = await ethers.getContractFactory(
      'L1Resolver',
      signer
    );
    console.log(15)
    const verifierAddress = await verifier.getAddress()
    console.log(16, {verifierAddress, ensAddress, wrapperAddress})
    target = await testL1Factory.deploy(verifierAddress, ensAddress, wrapperAddress);
    console.log(17)
    // Mine an empty block so we have something to prove against
    await provider.send('evm_mine', []);
    console.log(18)
    l2contract = impl.attach(resolverAddress)
    console.log(19)
    await target.setTarget(node, resolverAddress)
  });

  it("should not allow non owner to set target", async() => {
    const incorrectnode = ethers.namehash('notowned.eth')
    // For some reason expect().to.be.reverted isn't working
    // Throwing Error: missing revert data (action="estimateGas"...
    try{
      await target.setTarget(incorrectnode, resolverAddress)
    }catch(e){
    }

    expect(await target.targets(incorrectnode)).to.equal(EMPTY_ADDRESS);
  })

  it("should allow wrapped owner to set target", async() => {
    console.log(20)
    const label = 'wrapped'
    const tokenId = labelhash(label)
    console.log(21, {tokenId, label, signerAddress})
    await baseRegistrar.register(tokenId, signerAddress, 100000000)
    console.log(22, {wrapperAddress})
    await baseRegistrar.setApprovalForAll(wrapperAddress, true)
    console.log(23)
    await wrapper.wrapETH2LD(
      label,
      signerAddress,
      0, // CAN_DO_EVERYTHING
      EMPTY_ADDRESS,
    )
    console.log(24)
    const wrappedtnode = ethers.namehash(`${label}.eth`)
    console.log(25, {wrappedtnode, resolverAddress})
    await target.setTarget(wrappedtnode, resolverAddress)
    console.log(26)
    expect(await target.targets(wrappedtnode)).to.equal(resolverAddress);
  })


  it("should test empty ETH Address", async() => {
    const addr = '0x0000000000000000000000000000000000000000'
    await l2contract.clearRecords(node)
    const result = await l2contract['addr(bytes32)'](node)
    expect(ethers.getAddress(result)).to.equal(addr);
    await provider.send("evm_mine", []);
    const result2 = await target['addr(bytes32)'](node, { enableCcipRead: true })
    expect(result2).to.equal(addr);
  })

  it("should test ETH Address", async() => {
    const addr = '0x5A384227B65FA093DEC03Ec34e111Db80A040615'
    await l2contract.clearRecords(node)
    await l2contract['setAddr(bytes32,address)'](node, addr)
    const result = await l2contract['addr(bytes32)'](node)
    expect(ethers.getAddress(result)).to.equal(addr);
    await provider.send("evm_mine", []);
    const result2 = await target['addr(bytes32)'](node, { enableCcipRead: true })
    expect(result2).to.equal(addr);
  })
  it("should test non ETH Address", async() => {
    const addr = '0x76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac'
    const coinType = 0 // BTC
    await l2contract.clearRecords(node)
    await l2contract['setAddr(bytes32,uint256,bytes)'](node, coinType, addr)
    const result = await l2contract['addr(bytes32,uint256)'](node, 0)
    expect(result).to.equal(addr);
    await provider.send("evm_mine", []);
    const result2 = await target['addr(bytes32,uint256)'](node, coinType, { enableCcipRead: true })
    expect(result2).to.equal(addr);
  })

  it("should test text record", async() => {
    const key = 'name'
    const value = 'nick.eth'
    await l2contract.clearRecords(node)
    await l2contract.setText(node, key, value)
    await provider.send("evm_mine", []);
    const result = await l2contract.text(node, key)
    expect(result).to.equal(value);
    const result2 = await target.text(node, key, { enableCcipRead: true })
    expect(result2).to.equal(value);
  })

  it("should test contenthash", async() => {
    const contenthash = '0xe3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f'
    await l2contract.clearRecords(node)
    await l2contract.setContenthash(node, contenthash)
    await provider.send("evm_mine", []);
    const result = await l2contract.contenthash(node)
    expect(result).to.equal(contenthash);
    const result2 = await target.contenthash(node, { enableCcipRead: true })
    expect(result2).to.equal(contenthash);
  })
});