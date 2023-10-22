import { Server } from '@chainlink/ccip-read-server';
import { Command } from '@commander-js/extra-typings';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { ethers } from 'ethers';
import { L1ProofService } from './L1ProofService.js';

const program = new Command()
  .option('-p, --port <port>', 'port to listen on', '8080')
  .option('-u, --provider-url <url>', 'provider url', 'http://localhost:8545/');

program.parse();

const options = program.opts();
const provider = new ethers.JsonRpcProvider(options.providerUrl);
const gateway = new EVMGateway(new L1ProofService(provider));
const server = new Server();
gateway.add(server);
const app = server.makeApp('/');

const port = parseInt(options.port);
if (String(port) !== options.port) throw new Error('Invalid port');

(async () => {
  app.listen(port, function () {
    console.log(`Listening on ${port}`);
  });
})();
