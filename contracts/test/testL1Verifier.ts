import { ethers } from "hardhat";
import { expect } from "chai";
import { makeL1Gateway } from "@ensdomains/l1-gateway";
import express from 'express';
import { FetchCancelSignal, FetchRequest } from "ethers";
import request from 'supertest';

describe("L1Verifier", () => {
    let provider: ethers.Provider;
    let signer: ethers.Signer;
    // let server: ChildProcess;
    let target: ethers.Contract;
    let gateway: express.Application;

    before(async () => {
        // Hack to get a 'real' ethers provider from hardhat. The default `HardhatProvider`
        // doesn't support CCIP-read.
        provider = new ethers.BrowserProvider(ethers.provider._hardhatProvider);
        // provider.on("debug", (x: any) => console.log(JSON.stringify(x, undefined, 2)));
        signer = await provider.getSigner(0);

        const server = makeL1Gateway(provider);
        gateway = server.makeApp('/');

        // Replace ethers' fetch function with one that calls the gateway directly.
        ethers.FetchRequest.registerGetUrl(async (req: FetchRequest, signal?: FetchCancelSignal) => {
            const r = request(gateway)
                .post('/');
            if(req.hasBody()) {
                r
                    .set("Content-Type", "application/json")
                    .send(ethers.toUtf8String(req.body));
            }
            const response = await r;
            return {
                statusCode: response.statusCode,
                statusMessage: response.ok ? 'OK' : response.statusCode.toString(),
                body: ethers.toUtf8Bytes(JSON.stringify(response.body)),
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        })

        const testTargetFactory = await ethers.getContractFactory('TestTarget', signer);
        target = await testTargetFactory.deploy(['test:']);

        // Mine an empty block so we have something to prove against
        await provider.send("evm_mine", []);
    });

    it("generates and verifies simple proofs", async () => {
        const result = await target.getTestUint({ enableCcipRead: true });
        expect(Number(result)).to.equal(42);
    });
});
