const { expect } = require("chai");

describe("RyderMint", function () {
	let ryderNft, ryderMint, owner, bob, sara, paymentRecipient;
	const zeroAddress = "0x0000000000000000000000000000000000000000";
	const MAX_MINT_PER_ADDRESS = 2;
	const testPriceInWei = 150;
	const id1 = 5003;
	const id2 = 5002;

	const ERR_UNAUTHORIZED = "403";
	const ERR_NOT_LAUNCHED = "506";
	const ERR_MAX_MINT_REACHED = "507";
	const ERR_PAYMENT_FAILED = "508";
	const ERR_INVALID_PAYMENT = "509";
	const ERR_NOT_ALLOWED = "510";

	const getEthBalanceOf = async (address) => {
		return ethers.provider.getBalance(address);
	}

	const prepareAllowlistMint = async (allowlist) => {
		return Promise.all([
			ryderMint.connect(owner).setLaunched(true),
			ryderMint.connect(owner).setPriceInWei(testPriceInWei),
			ryderMint.connect(owner).setAllowListedMany(allowlist)
		]);
	};

	const preparePublicMint = async () => {
		return Promise.all([
			prepareAllowlistMint([]),
			ryderMint.connect(owner).setPublicMint(true)
		]);
	}

	const doMintFor = async (sender, amount = 1, overrideValue) => {
		return ryderMint.connect(sender)["mint(uint256)"](amount, { value: overrideValue || (testPriceInWei * amount) });
	};

	beforeEach(async () => {
		[owner, bob, sara, paymentRecipient] = await ethers.getSigners();
		const [ryderNftContract, ryderMintContract] = await Promise.all([
			ethers.getContractFactory("RyderNFT"),
			ethers.getContractFactory("RyderMint")
		]);
		ryderNft = await ryderNftContract.deploy([owner.address]);
		ryderMint = await ryderMintContract.deploy(ryderNft.address, []);
		await ryderMint.setPaymentRecipient(paymentRecipient.address, { from: owner.address });
		await ryderNft.setMinter(ryderMint.address, true, { from: owner.address });
	});

	it("cannot mint before launch", async function () {
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const tx = doMintFor(bob);
		await expect(tx).to.be.revertedWith(ERR_NOT_LAUNCHED);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(0);
	});

	it("allowlisted address can mint during allow-list mint", async function () {
		await prepareAllowlistMint([bob.address]);
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const tx = doMintFor(bob);
		await expect(tx).to.emit(ryderNft, 'Transfer');
		expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(testPriceInWei);
	});

	it("allowlisted address can mint until the limit during allow-list mint", async function () {
		await prepareAllowlistMint([bob.address]);
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const tx = doMintFor(bob, MAX_MINT_PER_ADDRESS);
		await expect(tx).to.emit(ryderNft, 'Transfer');
		expect(await ryderNft.balanceOf(bob.address)).to.equal(MAX_MINT_PER_ADDRESS);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(testPriceInWei * MAX_MINT_PER_ADDRESS);
	});

	it("allowlisted address cannot mint more than the mint limit during allow-list mint", async function () {
		await prepareAllowlistMint([bob.address]);
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const tx = doMintFor(bob, MAX_MINT_PER_ADDRESS + 1);
		await expect(tx).to.revertedWith(ERR_MAX_MINT_REACHED);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(0);
	});

	it("mint fails when forwarding the wrong amount of ETH", async function () {
		await prepareAllowlistMint([bob.address]);
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const tx = doMintFor(bob, 1, testPriceInWei - 1);
		await expect(tx).to.revertedWith(ERR_INVALID_PAYMENT);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(0);
	});

	it("non-allowlisted address cannot mint during allow-list mint", async function () {
		await prepareAllowlistMint([bob.address]);
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		const tx = doMintFor(sara);
		await expect(tx).to.revertedWith(ERR_UNAUTHORIZED);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(0);
	});

	it("anyone can mint during public mint", async function () {
		await preparePublicMint();
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		await Promise.all([doMintFor(bob), doMintFor(sara)]);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
		expect(await ryderNft.balanceOf(sara.address)).to.equal(1);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(testPriceInWei * 2);
		expect(await ryderNft.getTokenIdNonce()).to.equal(5003 - 2);
	});

	it("anyone can more than the allow-list limit during public mint", async function () {
		const mintAmount = MAX_MINT_PER_ADDRESS + 1;
		await preparePublicMint();
		const paymentRecipientBalance = await getEthBalanceOf(paymentRecipient.address);
		await doMintFor(bob, mintAmount);
		expect(await ryderNft.balanceOf(bob.address)).to.equal(mintAmount);
		expect((await getEthBalanceOf(paymentRecipient.address)).sub(paymentRecipientBalance).toNumber()).to.equal(testPriceInWei * mintAmount);
	});

	it("admin can set another admin", async function () {
		await ryderMint.connect(owner).setAdmin(bob.address, true);
		expect(await ryderMint.isAdmin(bob.address)).to.equal(true);
	});

	it("admin cannot de-admin itself", async function () {
		const tx = ryderMint.connect(owner).setAdmin(owner.address, false);
		await expect(tx).to.be.revertedWith(ERR_NOT_ALLOWED);
	});

	it("admin can launch the mint", async function () {
		expect(await ryderMint.getMintLaunched()).to.equal(false);
		await ryderMint.connect(owner).setLaunched(true);
		expect(await ryderMint.getMintLaunched()).to.equal(true);
	});

	it("admin can enable public mint", async function () {
		expect(await ryderMint.getPublicMint()).to.equal(false);
		await ryderMint.connect(owner).setPublicMint(true);
		expect(await ryderMint.getPublicMint()).to.equal(true);
	});

	it("admin can change price in wei", async function () {
		await ryderMint.connect(owner).setPriceInWei(100);
		expect(await ryderMint.getPriceInWei()).to.equal(100);
		await ryderMint.connect(owner).setPriceInWei(200);
		expect(await ryderMint.getPriceInWei()).to.equal(200);
	});

	it("admin can add addresses to the allow list", async function () {
		expect(await ryderMint.isAllowListed(bob.address)).to.equal(false);
		expect(await ryderMint.isAllowListed(sara.address)).to.equal(false);
		await ryderMint.connect(owner).setAllowListedMany([bob.address, sara.address]);
		expect(await ryderMint.isAllowListed(bob.address)).to.equal(true);
		expect(await ryderMint.isAllowListed(sara.address)).to.equal(true);
	});

	it("admin can change payment recipient", async function () {
		await ryderMint.connect(owner).setPaymentRecipient(bob.address);
		expect(await ryderMint.getPaymentRecipient()).to.equal(bob.address);
		await ryderMint.connect(owner).setPaymentRecipient(sara.address);
		expect(await ryderMint.getPaymentRecipient()).to.equal(sara.address);
	});

	it('non-admin cannot call any admin function', async function () {
		await expect(ryderMint.connect(bob).setLaunched(true)).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMint.connect(bob).setPublicMint(true)).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMint.connect(bob).setPriceInWei(100)).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMint.connect(bob).setAllowListedMany([bob.address])).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMint.connect(bob).setPaymentRecipient(sara.address)).to.be.revertedWith(ERR_UNAUTHORIZED);
		await expect(ryderMint.connect(bob).setAdmin(sara.address, true)).to.be.revertedWith(ERR_UNAUTHORIZED);
	});
});
