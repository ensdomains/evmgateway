import { Server } from '@chainlink/ccip-read-server';
import { Command } from '@commander-js/extra-typings';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { ScrollProofService } from './ScrollProofService.js';

const program = new Command()
  .option('-p, --port <port>', 'port to listen on', '8080')
  .option(
    '-v, --l2-provider-url <url>',
    'l2 provider url',
    'http://localhost:9545/'
  );

program.parse();

(async () => {
  const options = program.opts();

  const l2Provider = new JsonRpcProvider(options.l2ProviderUrl);

  const gateway = new EVMGateway(new ScrollProofService(l2Provider));
  const server = new Server();
  gateway.add(server);
  const app = server.makeApp('/');

  const port = parseInt(options.port);
  if (String(port) !== options.port) throw new Error('Invalid port');

  app.listen(port, function () {
    console.log(`Listening on ${port}`);
  });
})();
