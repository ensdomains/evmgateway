import { ethers } from "hardhat";
import { expect } from "chai";
import { makeL1Gateway } from "@ensdomains/l1-gateway";
import express from 'express';
import { FetchCancelSignal, FetchRequest } from "ethers";
import request from 'supertest';

describe("L1Verifier", () => {
    let provider: ethers.Provider;
    let signer: ethers.Signer;
    let verifier: ethers.Contract;
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

        const l1VerifierFactory = await ethers.getContractFactory('L1Verifier', signer);
        verifier = await l1VerifierFactory.deploy(['test:']);

        const testTargetFactory = await ethers.getContractFactory('TestTarget', signer);
        target = await testTargetFactory.deploy(await verifier.getAddress());

        // Mine an empty block so we have something to prove against
        await provider.send("evm_mine", []);
    });

    it("simple proofs for fixed values", async () => {
        const result = await target.getLatest({ enableCcipRead: true });
        expect(Number(result)).to.equal(42);
    });

    it("simple proofs for dynamic values", async () => {
        const result = await target.getName({ enableCcipRead: true });
        expect(result).to.equal("Satoshi");
    });

    it("nested proofs for dynamic values", async () => {
        const result = await target.getHighscorer(42, { enableCcipRead: true});
        expect(result).to.equal("Hal Finney");
    });

    it("nested proofs for long dynamic values", async () => {
        const result = await target.getHighscorer(1, { enableCcipRead: true});
        expect(result).to.equal("Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.");
    });

    it("nested proofs with lookbehind", async () => {
        const result = await target.getLatestHighscore({ enableCcipRead: true});
        expect(Number(result)).to.equal(12345);
    });

    it("nested proofs with lookbehind for dynamic values", async () => {
        const result = await target.getLatestHighscorer({ enableCcipRead: true});
        expect(result).to.equal("Hal Finney");
    });

    it("mappings with variable-length keys", async () => {
        const result = await target.getNickname("Money Skeleton", { enableCcipRead: true});
        expect(result).to.equal("Vitalik Buterin");
    });

    it("nested proofs of mappings with variable-length keys", async () => {
        const result = await target.getPrimaryNickname({ enableCcipRead: true});
        expect(result).to.equal("Hal Finney");
    });
});
