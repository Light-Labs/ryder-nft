import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  claim,
  setLaunched,
  setAllowListedMany,
} from "./clients/ryder-mint-client.ts";

import { transfer } from "./clients/ryder-nft-client.ts";

Clarinet.test({
  name: "Ensure that allow-listed user can mint before public mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    // try to mint before launch
    let block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectErr().expectUint(506); // not launched

    block = chain.mineBlock([
      setLaunched(true, deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[1].result.expectErr().expectUint(403); // err-unauthorized

    chain.mineBlock([setAllowListedMany([wallet_1.address], deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    chain.mineBlock([
      setAllowListedMany(
        [...Array(5003).keys()].map((s) => wallet_1.address),
        deployer.address
      ),
    ]);

    chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that allow-listed user can't mint more than 2",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([
      setAllowListedMany([wallet_1.address], deployer.address),
      setLaunched(true, deployer.address),
      claim(wallet_1.address),
      claim(wallet_1.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk().expectBool(true); // first mint
    block.receipts[3].result.expectOk().expectBool(true); // second mint
    block.receipts[4].result.expectErr().expectUint(507); // err-max-mint-reached

    block = chain.mineBlock([
      transfer(1, wallet_1.address, deployer.address, wallet_1.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(403); // err-max-mint-reached
  },
});
