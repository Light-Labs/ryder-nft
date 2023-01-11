import * as fs from "fs";
import { callReadOnlyFunction } from "micro-stacks/api";
import { UIntCV, uintCV } from "micro-stacks/clarity";
import { StacksMainnet } from "micro-stacks/network";

const MAX_TOKENS = 5003;
const RYDER_NFT_CONTRACT = {
  address: "SP1RYXGJP8R1CCMTDHJJQSP93ECDKPP9A0YWYZTGZ",
  name: "ryder-nft",
};
const network = new StacksMainnet({ coreApiUrl: "http://localhost:3999" });

const tiers = [
  "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4", // tier 0
  "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4", // tier 1
  "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4", // tier 2
  "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4", // tier 3
  "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4", // tier 4
  "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4", // tier 5
  "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4", // tier 6
  "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4", // tier 7
];

async function fetchTierByNftId(nftId: number) {
  return callReadOnlyFunction({
    contractAddress: RYDER_NFT_CONTRACT.address,
    contractName: RYDER_NFT_CONTRACT.name,
    functionName: "get-tier-by-token-id",
    functionArgs: [uintCV(nftId)],
    network,
  }) as Promise<UIntCV>;
}

(async () => {
  console.log("start");
  for (let i = 1; i <= MAX_TOKENS; i++) {
    const tier = await fetchTierByNftId(i);
    const metadata = {
      sip: 16,
      id: i,
      name: `Ryder Digital Collectible #${i}`,
      description:
        "Ryder is the world's first social wallet. One tap to save, swap, and recover assets. The first edition is limited to 5,003 pieces redeemable for the Ryder device. Each collectible comes with its own unique early backer benefits.",
      image: tiers[Number(tier.value)],
      external_url: "https://ryder.sale",
      attributes: [
        {
          trait_type: "tier",
          value: `${Number(tier.value)}`,
        },
      ],
      collection: "Ryder Digital Collectible",
    };
    fs.writeFileSync(`meta-data/${i}.json`, JSON.stringify(metadata));
  }
  console.log("done");
})();
