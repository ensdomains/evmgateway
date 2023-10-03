import { ethers } from "hardhat";
import { expect } from "chai";
import { fork, ChildProcess } from "child_process";

describe("L1Verifier", () => {
    let provider;
    let server: ChildProcess;
    let target: ethers.Contract;

    before(async () => {
        provider = new ethers.JsonRpcProvider("http://localhost:8545/");
        provider.on("debug", (x) => console.log(JSON.stringify(x, undefined, 2)));
        const signer = ethers.Wallet.fromPhrase("myth like bonus scare over problem client lizard pioneer submit female collect", provider);
        // Start a gateway in a new process, and get its port number.
        /*server = fork('../node_modules/evm-l2-gateway', ['0']);
        const port = await new Promise((resolve: (arg0: number) => void) => {
            server.on('message', (m: any) => resolve(m.port));
        });*/
        const port = 8080;

        const testTargetFactory = await ethers.getContractFactory('TestTarget', signer);
        target = await testTargetFactory.deploy([`http://localhost:${port}/`]);

        // Mine an empty block so we have something to prove against
        await provider.send("evm_mine", []);
    });

    after(async () => {
        // server.kill();
    })

    it("generates and verifies simple proofs", async () => {
        console.log({address: target.address});
        const result = await target.getTestUint({ enableCcipRead: true });
        expect(result).to.equal(42);
    });
});
