import { Server } from '@chainlink/ccip-read-server';
import { Command } from '@commander-js/extra-typings';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { ArbProofService } from './ArbProofService.js';
import { InMemoryBlockCache } from './blockCache/InMemoryBlockCache.js';

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
    process.env.ROLLUP_ADDRESS
  );

program.parse();

(async () => {
  const options = program.opts();

  const l1Provider = new JsonRpcProvider(options.l1ProviderUrl);
  const l2Provider = new JsonRpcProvider(options.l2ProviderUrl);

  const gateway = new EVMGateway(
    new ArbProofService(
      l1Provider,
      l2Provider,
      options.l2RollupAddress,
      new InMemoryBlockCache()
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
