import { ethers } from "hardhat";
import { expect } from "chai";
import { TestTarget, TestTarget__factory } from "../typechain-types";
import { fork, ChildProcess } from "child_process";

describe("L1Verifier", () => {
    let server : ChildProcess;
    let target : TestTarget;

    before(async () => {
        // Start a gateway in a new process, and get its port number.
        server = fork('../node_modules/evm-l2-gateway', ['0']);
        const port = await new Promise((resolve: (arg0: number)=>void) => {
            server.on('message', (m: any) => resolve(m.port));
        });

        const [ owner ] = await ethers.getSigners();
        const testTargetFactory = new TestTarget__factory(owner);
        target = await testTargetFactory.deploy([`http://localhost:${port}/`]);
    });

    after(async () => {
        server.kill();
    })

    it("generates and verifies simple proofs", async () => {
        const result = await target.getTestUint({enableCcipRead: true});
        expect(result).to.equal(42);
    });
});
