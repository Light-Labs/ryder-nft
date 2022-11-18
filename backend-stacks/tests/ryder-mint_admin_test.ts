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

    block = chain.mineBlock([claim(wallet_1.address), claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].result.expectOk().expectBool(true);
    expectNumberOfNfts(chain, 2, wallet_1.address);

    block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectErr().expectUint(505); // err-already-done
    expectNumberOfNfts(chain, 2, wallet_1.address);
  },
});

Clarinet.test({
  name: "Ensure that admin can change payment recipient",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint",
        "set-payment-recipient",
        [types.principal(wallet_1.address)],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    let receipt = chain.callReadOnlyFn(
      "ryder-mint",
      "get-payment-recipient",
      [],
      deployer.address
    );
    receipt.result.expectPrincipal(wallet_1.address);
  },
});

Clarinet.test({
  name: "Ensure that admin can change mint price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint",
        "set-price-in-ustx",
        [types.uint(2000_000_000)],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    let receipt = chain.callReadOnlyFn(
      "ryder-mint",
      "get-price-in-ustx",
      [],
      deployer.address
    );
    receipt.result.expectUint(2000_000_000);
  },
});

Clarinet.test({
  name: "Ensure that admin can add and remove new admin",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint",
        "set-admin",
        [types.principal(wallet_1.address), types.bool(true)],
        deployer.address
      ),
      Tx.contractCall(
        "ryder-mint",
        "set-admin",
        [types.principal(deployer.address), types.bool(false)],
        wallet_1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    let receipt = chain.callReadOnlyFn(
      "ryder-mint",
      "is-admin",
      [types.principal(wallet_1.address)],
      deployer.address
    );
    receipt.result.expectBool(true);

    receipt = chain.callReadOnlyFn(
      "ryder-mint",
      "is-admin",
      [types.principal(deployer.address)],
      deployer.address
    );
    receipt.result.expectBool(false);
  },
});

Clarinet.test({
  name: "Non-admin cannot call admin functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const non_admin = accounts.get("wallet_2")!.address;

    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-nft",
        "set-token-uri",
        [types.ascii("abc")],
        non_admin
      ),
      Tx.contractCall(
        "ryder-nft",
        "set-admin",
        [types.principal(non_admin), types.bool(true)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint",
        "set-admin",
        [types.principal(non_admin), types.bool(true)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint",
        "set-launched",
        [types.bool(true)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint",
        "set-public-mint",
        [types.bool(true)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint",
        "set-price-in-ustx",
        [types.uint(3)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint",
        "set-allow-listed-many",
        [types.list([types.principal(non_admin)])],
        non_admin
      ),
      Tx.contractCall(
        "ryder-nft",
        "set-mint-limit",
        [types.uint(3)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-nft",
        "set-minter",
        [types.principal(non_admin), types.bool(true)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint",
        "set-payment-recipient",
        [types.principal(non_admin)],
        non_admin
      ),
      Tx.contractCall("ryder-nft", "shuffle-prepare", [], non_admin),
    ]);
    block.receipts.map((receipt) => receipt.result.expectErr().expectUint(403));
  },
});
