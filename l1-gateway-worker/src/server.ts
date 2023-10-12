// import { Command } from '@commander-js/extra-typings';
// import { EVMGateway } from '@ensdomains/evm-gateway';
// import { ethers } from 'ethers';
// import { L1ProofService } from './L1ProofService.js';

// const program = new Command()
//   .option('-p, --port <port>', 'port to listen on', '8080')
//   .option('-u, --provider-url <url>', 'provider url', 'http://localhost:8545/');

// program.parse();

// const options = program.opts();

// const provider = new ethers.JsonRpcProvider(options.providerUrl);
// const gateway = new EVMGateway(new L1ProofService(provider));
// const app = gateway.makeApp('/');

// const port = parseInt(options.port);
// if (String(port) !== options.port) throw new Error('Invalid port');

// (async () => {
//   app.listen(port, function () {
//     console.log(`Listening on ${port}`);
//   });
// })();
import { Server } from '@ensdomains/ccip-read-cf-worker';
const server = new Server();
const abi = [
  'function getSignedBalance(address addr) public view returns(uint256 balance, bytes memory sig)',
];
server.add(abi, [
  {
    type: 'getSignedBalance',
    func: async (contractAddress:any, data:any) => {
      console.log(contractAddress, data)
      // const balance = getBalance(addr);
      // const sig = signMessage([addr, balance]);
      const balance = 0;
      const sig = 1;
      return [balance, sig];
    }
  }
]);
const app = server.makeApp("/");

export function fetch(request:any, env:any, _context:any){
  console.log(env, _context)
  return app.handle(request)
}