import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { setTokenUri, freezeMetadata } from "./clients/ryder-nft-client.ts";

Clarinet.test({
  name: "Ensure that admin can change and freeze metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([
      setTokenUri("ipfs://new-token-uri/{id}.json", deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-token-uri",
      [types.uint(1)],
      deployer.address
    );
    receipt.result
      .expectOk()
      .expectSome()
      .expectAscii("ipfs://new-token-uri/{id}.json");
      
    // change token uri again
    block = chain.mineBlock([
      setTokenUri("ipfs://new-token-uri-2/{id}.json", deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // freeze metadata
    block = chain.mineBlock([freezeMetadata(deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // try to change token uri again
    block = chain.mineBlock([
      setTokenUri("ipfs://new-token-uri-2/{id}.json", deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that user can't change metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      setTokenUri("ipfs://new-token-uri/{id}.json", wallet_1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that admin can change mint limit",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    const MINT_LIMIT = 10;
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-nft",
        "set-mint-limit",
        [types.uint(6000)],
        deployer.address
      ),
      Tx.contractCall(
        "ryder-nft",
        "set-mint-limit",
        [types.uint(MINT_LIMIT)],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(507); // err-max-mint-reached
    block.receipts[1].result.expectOk().expectBool(true);

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-mint-limit",
      [],
      deployer.address
    );
    receipt.result.expectUint(MINT_LIMIT);
  },
});

Clarinet.test({
  name: "Ensure that admin can add and remove new admin",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-nft",
        "set-admin",
        [types.principal(wallet_1.address), types.bool(true)],
        deployer.address
      ),
      Tx.contractCall(
        "ryder-nft",
        "set-admin",
        [types.principal(deployer.address), types.bool(false)],
        wallet_1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "is-admin",
      [types.principal(wallet_1.address)],
      deployer.address
    );
    receipt.result.expectBool(true);

    receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "is-admin",
      [types.principal(deployer.address)],
      deployer.address
    );
    receipt.result.expectBool(false);
  },
});
