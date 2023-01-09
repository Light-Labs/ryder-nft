import { ethers } from "hardhat";

const paymentRecipient = "0xF70c34D7D589aae3E346aF5aC435034bC1E64386";
const admins = [
  "0x2157D514EE7abFD13f4d7e740CaC2CEEcC0bf4ef",
  "0x4e82C2935ad9bD63b45aAa24a26dA00a1c2bfa1a",
  "0x0B65Df3609EBa3E8Ad70fC31C7916746173dA2ED"
];

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account: ", deployer.address);
  console.log("Recipient of payments: ", paymentRecipient);
  // console.log("Account balance:", (await deployer.getBalance()).toString());

  const [ryderNftContract, ryderMintContract] = await Promise.all([
    ethers.getContractFactory("RyderNFT"),
    ethers.getContractFactory("RyderMint")
  ]);
  const ryderNft = await ryderNftContract.deploy([deployer.address]);
  const ryderMint = await ryderMintContract.deploy(ryderNft.address, []);
  await ryderMint.setPaymentRecipient(paymentRecipient, { from: deployer.address });
  await ryderNft.setMinter(ryderMint.address, true, { from: deployer.address });
  for (let admin of admins) {
    await ryderMint.setAdmin(admin, true, { from: deployer.address });
    await ryderNft.setAdmin(admin, true, { from: deployer.address });
  }
  console.log(`Deployed contracts and did setup\nRyderNFT: ${ryderNft.address}\nRyderMint: ${ryderMint.address}\nAdmins: ${admins.join(', ')}`);
  console.log(`RyderNFT deploy TXID: ${ryderNft.deployTransaction.hash}`);
  console.log(`RyderMINT deploy TXID: ${ryderMint.deployTransaction.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
