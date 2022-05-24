import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { mint, transfer, burn } from "./clients/ryder-nft-client.ts";

Clarinet.test({
  name: "Ensure that minter can mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([mint(1, 1, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that minter can't mint same id twice",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([mint(1, 1, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([mint(1, 1, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(1);
  },
});

Clarinet.test({
  name: "Ensure that minter can't mint NFT with invalid id",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([mint(0, 1, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(500);
    block = chain.mineBlock([mint(5001, 1, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(500);
  },
});

Clarinet.test({
  name: "Ensure that user can't mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([mint(1, 1, wallet_1.address)]);
    block.receipts[0].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that users can transfer own nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      transfer(1, deployer.address, wallet_1.address),
      transfer(1, wallet_1.address, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);

    block.receipts[1].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      deployer.address,
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );

    block.receipts[2].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
  },
});

Clarinet.test({
  name: "Ensure that users can't transfer other NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      transfer(1, deployer.address, wallet_1.address, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that user can burn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      transfer(1, deployer.address, wallet_1.address),
      burn(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that burner can't burn when called not called by owner",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      transfer(1, deployer.address, wallet_1.address),
      burn(1, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(1);
  },
});
