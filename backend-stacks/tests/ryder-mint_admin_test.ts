import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { expectNumberOfNfts } from "./clients/ryder-nft-client.ts";
import {
  claim,
  setLaunched,
  setPublicMint,
  enabledPublicMint,
  setMintLimit,
} from "./clients/ryder-mint-client.ts";

Clarinet.test({
  name: "Ensure that admin can activate and de-activate allow-listed mint and public mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([setLaunched(true, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([setLaunched(false, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([setPublicMint(true, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([setPublicMint(false, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that admin can change mint-limit",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([setMintLimit(2, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    expectNumberOfNfts(chain, 1, wallet_1.address);

    block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectErr().expectUint(505); // err-already-done
    expectNumberOfNfts(chain, 1, wallet_1.address);
  },
});

Clarinet.test({
  name: "Non-admin cannot call admin functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const non_admin = accounts.get("wallet_2")!.address;

    let block = chain.mineBlock([
      Tx.contractCall("ryder-nft", "set-token-uri", [types.ascii("abc")], non_admin),
      Tx.contractCall("ryder-nft", "set-admin", [types.principal(non_admin), types.bool(true)], non_admin),
      Tx.contractCall("ryder-nft", "set-launched", [types.bool(true)], non_admin),
      Tx.contractCall("ryder-nft", "set-public-mint", [types.bool(true)], non_admin),
      Tx.contractCall("ryder-nft", "set-price-in-ustx", [types.uint(3)], non_admin),
      Tx.contractCall("ryder-nft", "set-allow-listed-many", [types.list([types.principal(non_admin)])], non_admin),
      Tx.contractCall("ryder-nft", "set-mint-limit", [types.uint(3)], non_admin),
      Tx.contractCall("ryder-nft", "set-payment-recipient", [types.principal(non_admin)], non_admin),
      Tx.contractCall("ryder-nft", "shuffle-prepare", [], non_admin),
    ]);
    block.receipts.map(receipt => receipt.result.expectErr().expectUint(403));
  },
});
