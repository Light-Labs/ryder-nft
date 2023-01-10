import { ethers } from "hardhat";

const paymentRecipient = "0xF70c34D7D589aae3E346aF5aC435034bC1E64386";
const admins = [
  "0x2157D514EE7abFD13f4d7e740CaC2CEEcC0bf4ef",
  "0x4e82C2935ad9bD63b45aAa24a26dA00a1c2bfa1a",
  "0x0B65Df3609EBa3E8Ad70fC31C7916746173dA2ED"
];

const claimTriggers = [
  "0x511D07C7504314eb7BD41AE57b2d172Af93eD874"
];

const ryderNftAddress = "0x3dD95873911B083b17FB8f5dD11EeE016F5BdD3E";
// const ryderNftAddressTestnet = "0x7a3176824DEa963Df77D18cf26165528080D78CB";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying mint V2 contract with the account: ", deployer.address);
  console.log("Recipient of payments: ", paymentRecipient);

  const ryderMintV2Contract = await ethers.getContractFactory("RyderMintV2");
  const ryderNft = await ethers.getContractAt("RyderNFT", ryderNftAddress);
  const ryderMintV2 = await ryderMintV2Contract.deploy(ryderNft.address, admins);
  await ryderMintV2.setPaymentRecipient(paymentRecipient, { from: deployer.address });
  for (const trigger of claimTriggers)
    await ryderMintV2.setClaimTrigger(trigger, true, { from: deployer.address });
  await ryderNft.setMinter(ryderMintV2.address, true, { from: deployer.address });
  console.log(`Deployed contract\nRyderMintV2: ${ryderMintV2.address}\nAdmins: ${admins.join(', ')}\nClaim triggers: ${claimTriggers.join(', ')}`);
  console.log(`Deploy TXID: ${ryderMintV2.deployTransaction.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
