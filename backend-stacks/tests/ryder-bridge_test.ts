import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  mint,
  burn,
  transfer,
  setBurner,
  setMinter,
} from "./clients/ryder-nft-client.ts";
import {
  mint as mintBridge,
  burn as burnBridge,
} from "./clients/ryder-bridge-client.ts";

Clarinet.test({
  name: "Ensure that admin can burn and mint via bridge",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      setMinter(`'${deployer.address}.ryder-bridge`, deployer.address),
      setBurner(`'${deployer.address}.ryder-bridge`, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);

    // burn and mint
    block = chain.mineBlock([
      burnBridge(1, deployer.address),
      mintBridge(1, 1, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that admin can't mint existing nft via bridge",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      setMinter(`'${deployer.address}.ryder-bridge`, deployer.address),
      setBurner(`'${deployer.address}.ryder-bridge`, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);

    // mint existing nft
    block = chain.mineBlock([mintBridge(1, 1, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(1);
  },
});

Clarinet.test({
  name: "Ensure that user can burn own nft via bridge",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      transfer(1, deployer.address, wallet_1.address),
      setMinter(`'${deployer.address}.ryder-bridge`, deployer.address),
      setBurner(`'${deployer.address}.ryder-bridge`, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);

    // burn own nft
    block = chain.mineBlock([burnBridge(1, wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that user can't burn not-owned nft via bridge",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      transfer(1, deployer.address, wallet_1.address),
      setMinter(`'${deployer.address}.ryder-bridge`, deployer.address),
      setBurner(`'${deployer.address}.ryder-bridge`, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);

    // burn any nft
    block = chain.mineBlock([burnBridge(1, wallet_2.address)]);
    block.receipts[0].result.expectErr().expectUint(1);
  },
});
