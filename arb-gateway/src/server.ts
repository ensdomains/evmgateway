import { Server } from '@chainlink/ccip-read-server';
import { Command } from '@commander-js/extra-typings';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { ArbProofService } from './ArbProofService.js';
import { ethers as ethers5 } from "ethers5";


const program = new Command()
  .option('-p, --port <port>', 'port to listen on', '8080')
  .option(
    '-u, --l1-provider-url <url>',
    'l1 provider url',
    'http://localhost:8545/'
  )
  .option(
    '-v, --l2-provider-url <url>',
    'l2 provider url',
    'http://localhost:9545/'
  )
  .option(
    '-o --l2-rollup-address <address>',
    'address for L2 outbox on the L1',
    ''
  )
  .option(
    '-o --l2-assertion-helper-address <address>',
    'address for L2 outbox on the L1',
    ''
  );

program.parse();

(async () => {
  const options = program.opts();

  const l2Provider = new JsonRpcProvider(options.l2ProviderUrl);
  const l1LegacyProvider = new ethers5.providers.JsonRpcProvider(
    options.l1ProviderUrl
  );
  const l2LegacyProvider = new ethers5.providers.JsonRpcProvider(
    options.l2ProviderUrl
  );

  const gateway = new EVMGateway(
    new ArbProofService(
      l2Provider,
      l1LegacyProvider,
      l2LegacyProvider,
      options.l2RollupAddress,
      options.l2AssertionHelperAddress
    )
  );
  const server = new Server();
  gateway.add(server);
  const app = server.makeApp('/');

  const port = parseInt(options.port);
  if (String(port) !== options.port) throw new Error('Invalid port');

  app.listen(port, function () {
    console.log(`Listening on ${port}`);
  });
})();
