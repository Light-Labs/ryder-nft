import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  claim,
  setLaunched,
  setAllowListedMany,
} from "./clients/ryder-mint-client.ts";

Clarinet.test({
  name: "Ensure that white-listed user can mint before public mint",
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

    chain.mineBlock([
      setAllowListedMany([wallet_1.address], deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    chain.mineBlock([
        claim(wallet_1.address),
      ]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});
