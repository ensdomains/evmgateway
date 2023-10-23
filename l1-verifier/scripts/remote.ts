import { ethers } from 'ethers';
import hre from 'hardhat';

const abi = ['function getLatest() public view returns(uint256)'];
export const main = async () => {
  if (!process.env.PROVIDER_URL || !process.env.TARGET_ADDRESS)
    throw 'Set PROVIDER_URL and TARGET_ADDRESS';
  const PROVIDER_URL = process.env.PROVIDER_URL;
  const TARGET_ADDRESS = process.env.TARGET_ADDRESS || '';
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  if (hre.network.name === 'localhost') {
    await provider.send('evm_mine', []);
  }
  const target = new ethers.Contract(TARGET_ADDRESS, abi, provider);
  const result = await target.getLatest({ enableCcipRead: true });
  console.log({ result });
};

main();
