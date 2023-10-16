import { Command } from '@commander-js/extra-typings';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { OPProofService } from './OPProofService.js';

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
  .option('-d, --delay <number>', 'number of blocks delay to use', '5');

program.parse();

(async () => {
  const options = program.opts();

  const gateway = new EVMGateway(
    await OPProofService.create(
      options.l1ProviderUrl,
      options.l2ProviderUrl,
      Number(options.delay)
    )
  );
  const app = gateway.makeApp('/');

  const port = parseInt(options.port);
  if (String(port) !== options.port) throw new Error('Invalid port');

  app.listen(port, function () {
    console.log(`Listening on ${port}`);
  });
})();
