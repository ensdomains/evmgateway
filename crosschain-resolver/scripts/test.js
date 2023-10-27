const { fork } = require('node:child_process');
const ganache = require('ganache');
const options = {
  logging: {
    quiet: true,
  },
};

async function main() {
  const server = ganache.server(options);
  console.log('Starting server');
  const port = await new Promise((resolve, reject) => {
    server.listen(0, async (err) => {
      console.log(`Listening on port ${server.address().port}`);
      if (err) reject(err);
      resolve(server.address().port);
    });
  });

  console.log('Starting hardhat');
  const code = await new Promise((resolve) => {
    const hh = fork(
      '../node_modules/.bin/hardhat',
      ['test', '--network', 'ganache'],
      {
        stdio: 'inherit',
        env: {
          RPC_PORT: port.toString(),
        },
      }
    );
    hh.on('close', (code) => resolve(code));
  });

  console.log('Shutting down');
  server.close();
  process.exit(code);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
