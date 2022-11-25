import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  setTokenUri,
  freezeMetadata,
  setMintLimit,
} from "./clients/ryder-nft-client.ts";
import * as Errors from "./clients/error-codes.ts";

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
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_UNAUTHORIZED);
  },
});

Clarinet.test({
  name: "Ensure that user can't change metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      setTokenUri("ipfs://new-token-uri/{id}.json", wallet_1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_UNAUTHORIZED);
  },
});

Clarinet.test({
  name: "Ensure that admin can change mint limit",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    const MINT_LIMIT = 10;
    let block = chain.mineBlock([
      setMintLimit(6000, deployer.address),
      setMintLimit(MINT_LIMIT, deployer.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(Errors.ERR_MAX_LIMIT_REACHED);
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

Clarinet.test({
  name: "Ensure that admin can't remove own account",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-nft",
        "set-admin",
        [types.principal(deployer.address), types.bool(false)],
        deployer.address
      ),
      Tx.contractCall(
        "ryder-nft",
        "set-admin",
        [types.principal(deployer.address), types.bool(true)],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_NOT_ALLOWED);
    block.receipts[1].result.expectErr().expectUint(Errors.ERR_NOT_ALLOWED);
  },
});
