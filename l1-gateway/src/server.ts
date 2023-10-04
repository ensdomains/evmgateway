import dotenv from 'dotenv';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { L1ProofService } from './L1ProofService';
import { ethers } from 'ethers';

dotenv.config({ path: '../.env' });

const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL || "http://localhost:8545/");
const gateway = new EVMGateway(new L1ProofService(provider));
const app = gateway.makeApp('/');

const port = parseInt(process.argv[2] || '8080');
(async () => {
    app.listen(port, function() {
        console.log(`Listening on ${port}`);
    });
})();
