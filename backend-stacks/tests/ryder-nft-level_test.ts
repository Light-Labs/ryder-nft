import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { mint, levelUpNfts, getNftSeed } from "./clients/ryder-nft-client.ts";

function hexToArrayBuffer(hex: string) {
  return new Uint8Array(hex.match(/[\da-f]{2}/gi)!.map((h) => parseInt(h, 16)));
}

Clarinet.test({
  name: "Ensure that admin can level up nfts",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      mint(2, 7, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    // check seeds
    let seed = getNftSeed(chain, 1, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x010000000000000000000000000000000000000000000000000000000000000000"
        )
      );
    seed = getNftSeed(chain, 2, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x070000000000000000000000000000000000000000000000000000000000000000"
        )
      );

    // level up nfts
    block = chain.mineBlock([levelUpNfts(deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    seed = getNftSeed(chain, 1, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x01cc4e2625d1277f875aa032830235475e94bf05576c31513b9122f81034cf9c58"
        )
      );
    seed = getNftSeed(chain, 2, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x071ac78a0b076f315f3c1a9ec6d04c249418584e4c2d05617e5f626c480facd0a8"
        )
      );
  },
});
