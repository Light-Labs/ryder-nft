const { expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("RyderMintV2", function () {
	let ryderNft, ryderMintV2, owner, bob, sara, paymentRecipient;
	const testPriceInWei = 150;

	const ERR_UNAUTHORIZED = "403";
	const ERR_NOT_LAUNCHED = "506";
	const ERR_SOLD_OUT = "507";
	const ERR_PAYMENT_FAILED = "508";
	const ERR_INVALID_PAYMENT = "509";
	const ERR_NOT_ALLOWED = "510";
	const ERR_NO_CLAIMS = "511";
	const ERR_CLAIM_EXPIRED = "512";
	const ERR_CLAIM_NOT_EXPIRED = "513";
	const ERR_TOO_EARLY = "514";

	const mineBlocksUntil = async (height) => helpers.mineUpTo(height);
	const mineBlocks = async (height) => helpers.mine(height);
	const getBlockHeight = async () => helpers.time.latestBlock();
	const getEthBalanceOf = async (address) => ethers.provider.getBalance(address);

	const maxBN = (...numbers) => numbers.reduce((prev, current) => prev && prev.gt && prev.gt(current) ? prev : current);

	const prepareMint = async (amount) => {
		return Promise.all([
			ryderMintV2.connect(owner).setPriceInWei(testPriceInWei),
			ryderMintV2.connect(owner).mintToContract(amount || 20),
			ryderMintV2.connect(owner).setLaunched(true)
		]);
	};

	const doMintFor = async (sender, amount = 1, overrideValue) => {
		const result = await ryderMintV2.connect(sender)["buy(uint256)"](amount, { value: overrideValue || (testPriceInWei * amount) });
		const receipt = await result.wait();
		return receipt.events[0] ? receipt.events[0].args[0] : null;
	};

	const doClaimFor = async (sender, heights) => {
		return ryderMintV2.connect(sender).claimMany(typeof heights === "number" ? [heights] : heights);
	};

	beforeEach(async () => {
		[owner, bob, sara, paymentRecipient] = await ethers.getSigners();
		const [ryderNftContract, ryderMintV2Contract] = await Promise.all([
			ethers.getContractFactory("RyderNFT"),
			ethers.getContractFactory("RyderMintV2")
		]);
		ryderNft = await ryderNftContract.deploy([owner.address]);
		ryderMintV2 = await ryderMintV2Contract.deploy(ryderNft.address, []);
		await ryderMintV2.setPaymentRecipient(paymentRecipient.address, { from: owner.address });
		await ryderNft.setMinter(ryderMintV2.address, true, { from: owner.address });
	});

	it("cannot buy before launch", async function () {
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const tx = doMintFor(bob);
		await expect(tx).to.be.revertedWith(ERR_NOT_LAUNCHED);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(0);
	});

	it("buy fails when forwarding the wrong amount of ETH", async function () {
		await prepareMint();
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const tx = doMintFor(bob, 1, testPriceInWei - 1);
		await expect(tx).to.revertedWith(ERR_INVALID_PAYMENT);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(0);
	});

	it("anyone can buy", async function () {
		await prepareMint();
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const [resultBob, resultSara] = await Promise.all([doMintFor(bob), doMintFor(sara)]);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(testPriceInWei * 2);
		const [claimsBob, claimsSara] = await Promise.all([
			ryderMintV2.getNftClaims(resultBob, bob.address),
			ryderMintV2.getNftClaims(resultSara, sara.address)
		]);
		expect(claimsBob).to.equal(1);
		expect(claimsSara).to.equal(1);
	});

	it("anyone can buy and claim", async function () {
		await prepareMint();
		const [resultBob, resultSara] = await Promise.all([doMintFor(bob), doMintFor(sara)]);
		await mineBlocksUntil(maxBN(resultBob, resultSara));
		await Promise.all([doClaimFor(bob, resultBob.toNumber()), doClaimFor(sara, resultSara.toNumber())]);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
		expect(await ryderNft.balanceOf(sara.address)).to.equal(1);
	});

	it("cannot claim early", async function () {
		await prepareMint();
		const resultBob = await doMintFor(bob);
		const tx = doClaimFor(bob, resultBob.toNumber());
		await expect(tx).to.be.revertedWith(ERR_TOO_EARLY);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
	});

	it("cannot claim expired claims", async function () {
		await prepareMint();
		const resultBob = await doMintFor(bob);
		await mineBlocks(256);
		const tx = doClaimFor(bob, resultBob.toNumber());
		await expect(tx).to.be.revertedWith(ERR_CLAIM_EXPIRED);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
	});

	it("can refresh expired claims and then claim", async function () {
		await prepareMint();
		const resultBob = await doMintFor(bob);
		await mineBlocks(256);
		const refresh = await ryderMintV2.connect(bob).refreshBuyClaims(resultBob.toNumber(), bob.address);
		const refreshReceipt = await refresh.wait();
		const refreshedHeight = refreshReceipt.events[0] ? refreshReceipt.events[0].args[0] : null;
		expect(refreshedHeight).to.not.be.null;
		const expiredClaim = doClaimFor(bob, resultBob.toNumber());
		doClaimFor(bob, refreshedHeight.toNumber());
		await expect(expiredClaim).to.be.revertedWith(ERR_NO_CLAIMS);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
	});

	it("admin can trigger claim for someone else", async function () {
		await prepareMint();
		const resultBob = await doMintFor(bob);
		await mineBlocksUntil(resultBob);
		await ryderMintV2.connect(owner).claimFor(resultBob, bob.address);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
	});

	it("claim trigger can trigger claim for someone else", async function () {
		await prepareMint();
		const resultBob = await doMintFor(bob);
		await mineBlocksUntil(resultBob);
		await ryderMintV2.connect(owner).setClaimTrigger(sara.address, true);
		await ryderMintV2.connect(sara).claimFor(resultBob, bob.address);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
	});

	it("non-admin cannot trigger claim for someone else", async function () {
		await prepareMint();
		const resultBob = await doMintFor(bob);
		await mineBlocksUntil(resultBob);
		const tx = ryderMintV2.connect(sara).claimFor(resultBob, bob.address);
		await expect(tx).to.be.revertedWith(ERR_UNAUTHORIZED);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
	});

	it("admin can set another admin", async function () {
		await ryderMintV2.connect(owner).setAdmin(bob.address, true);
		expect(await ryderMintV2.isAdmin(bob.address)).to.equal(true);
	});

	it("admin cannot de-admin itself", async function () {
		const tx = ryderMintV2.connect(owner).setAdmin(owner.address, false);
		await expect(tx).to.be.revertedWith(ERR_NOT_ALLOWED);
	});

	it("admin can launch the mint", async function () {
		expect(await ryderMintV2.getMintLaunched()).to.equal(false);
		await ryderMintV2.connect(owner).setLaunched(true);
		expect(await ryderMintV2.getMintLaunched()).to.equal(true);
	});

	it("admin can change price in wei", async function () {
		await ryderMintV2.connect(owner).setPriceInWei(100);
		expect(await ryderMintV2.getPriceInWei()).to.equal(100);
		await ryderMintV2.connect(owner).setPriceInWei(200);
		expect(await ryderMintV2.getPriceInWei()).to.equal(200);
	});

	it("admin can change payment recipient", async function () {
		await ryderMintV2.connect(owner).setPaymentRecipient(bob.address);
		expect(await ryderMintV2.getPaymentRecipient()).to.equal(bob.address);
		await ryderMintV2.connect(owner).setPaymentRecipient(sara.address);
		expect(await ryderMintV2.getPaymentRecipient()).to.equal(sara.address);
	});

	it('non-admin cannot call any admin function', async function () {
		await expect(ryderMintV2.connect(bob).setLaunched(true)).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMintV2.connect(bob).setPriceInWei(100)).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMintV2.connect(bob).setPaymentRecipient(sara.address)).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMintV2.connect(bob).setAdmin(sara.address, true)).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMintV2.connect(bob).setClaimTrigger(sara.address, true)).to.be.revertedWith(ERR_UNAUTHORIZED);
	});

	it("mint and buy all test", async function () {
		const totalAmount = 550;
		await prepareMint(totalAmount);
		const resultBob = await doMintFor(bob, totalAmount);
		await mineBlocksUntil(resultBob);
		await doClaimFor(bob, Array(totalAmount).fill(resultBob.toNumber()));
		expect(await ryderNft.balanceOf(bob.address)).to.equal(totalAmount);
	});
});
