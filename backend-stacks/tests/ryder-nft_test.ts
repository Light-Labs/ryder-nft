import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { transfer, burn } from "./clients/ryder-nft-client.ts";
import { claim, enabledPublicMint } from "./clients/ryder-mint-client.ts";

const MAX_TOKENS = 5003;
Clarinet.test({
  name: "Ensure that users can transfer own nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      claim(wallet_1.address),
      transfer(1, wallet_1.address, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    block.receipts[1].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );

    let reciept = chain.callReadOnlyFn(
      "ryder-nft",
      "get-owner",
      [types.uint(1)],
      wallet_2.address
    );
    reciept.result.expectOk().expectSome().expectPrincipal(wallet_2.address);

    reciept = chain.callReadOnlyFn(
      "ryder-nft",
      "get-balance",
      [types.principal(wallet_2.address)],
      wallet_2.address
    );
    reciept.result.expectUint(1);

    reciept = chain.callReadOnlyFn(
      "ryder-nft",
      "get-balance",
      [types.principal(wallet_1.address)],
      wallet_2.address
    );
    reciept.result.expectUint(0);
  },
});

Clarinet.test({
  name: "Ensure that users can transfer one or many with memo",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      claim(wallet_1.address),
      claim(wallet_1.address),
      Tx.contractCall(
        "ryder-nft",
        "transfer-memo",
        [
          types.uint(1),
          types.principal(wallet_1.address),
          types.principal(wallet_2.address),
          "0x65",
        ],
        wallet_1.address
      ),
      Tx.contractCall(
        "ryder-nft",
        "transfer-many",
        [
          types.list([
            types.tuple({
              id: types.uint(1),
              sender: types.principal(wallet_2.address),
              recipient: types.principal(wallet_1.address),
            }),
          ]),
        ],
        wallet_2.address
      ),
      Tx.contractCall(
        "ryder-nft",
        "transfer-memo-many",
        [
          types.list([
            types.tuple({
              id: types.uint(1),
              sender: types.principal(wallet_1.address),
              recipient: types.principal(wallet_2.address),
              memo: "0x6565",
            }),
            types.tuple({
              id: types.uint(2),
              sender: types.principal(wallet_1.address),
              recipient: types.principal(wallet_2.address),
              memo: "0x6666",
            }),
          ]),
        ],
        wallet_1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectOk().expectBool(true);

    block.receipts[2].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
    block.receipts[2].events.expectPrintEvent(
      `${deployer.address}.ryder-nft`,
      "0x65"
    );

    block.receipts[4].events.expectPrintEvent(
      `${deployer.address}.ryder-nft`,
      "0x6565"
    );
    block.receipts[4].events.expectPrintEvent(
      `${deployer.address}.ryder-nft`,
      "0x6666"
    );
  },
});

Clarinet.test({
  name: "Ensure that users can't transfer other NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      claim(wallet_1.address),
      transfer(1, wallet_1.address, deployer.address, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that user can't mint directly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      Tx.contractCall("ryder-nft", "mint", [types.principal(wallet_1.address)], wallet_1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that user can burn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      claim(wallet_1.address),
      burn(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-last-token-id",
      [],
      wallet_1.address
    );
    receipt.result.expectOk().expectUint(MAX_TOKENS);
  },
});
