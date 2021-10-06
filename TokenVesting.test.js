const BN = require('bignumber.js');
BN.config({ DECIMAL_PLACES: 0 })
BN.config({ ROUNDING_MODE: BN.ROUND_DOWN })
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const Token = artifacts.require('ABC');
const TokenVesting = artifacts.require('TokenVesting');
const truffleAssert = require('truffle-assertions');


const e18 = new BN('1000000000000000000');

const { assertion } = require('@openzeppelin/test-helpers/src/expectRevert');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
function toWei(n) {
	return new BN(n).multipliedBy(e18).toFixed();
}

function bn(x) {
	return new BN(x);
}
const cliff = 90 * 1 * 86400;
const week = 7 * 86400;
contract('TokenVesting Test', (accounts) => {
	let deployer = accounts[0];
	let fundRecipient = accounts[1];
	let fundRecipient2 = accounts[3];
	let locker = accounts[2];
	let users = accounts.slice(3);

	beforeEach(async () => {
		this.token = await Token.new(bn(1e18), { from: locker })
		this.tokenVesting = await TokenVesting.new();

		await this.tokenVesting.initialize(this.token.address, cliff, { from: deployer });
		await this.tokenVesting.setLockers([locker], true)
		await this.token.approve(this.tokenVesting.address, bn(1e18), { from: locker })
	});
	it("Lock ", async () => {
		await expectRevert(this.tokenVesting.lock(fundRecipient, 500, 5), "only locker can lock", { from: deployer })
		assert.equal((await this.token.balanceOf(locker)).valueOf().toString(), bn(1e18));
		const lockAmount = 500000000
		const percent = 5
		const balanceBefore = (await this.token.balanceOf(locker)).valueOf().toString()
		assert.equal(balanceBefore, bn(1e18))
		await this.tokenVesting.lock(fundRecipient, lockAmount, percent, { from: locker })
		const balanceAfter = (await this.token.balanceOf(locker)).valueOf().toString()
		assert.equal(bn(balanceBefore).minus(bn(balanceAfter)), lockAmount)

		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), 0)
		time.increase(cliff - 100)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), 0)
		time.increase(week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount * percent / 100)

		time.increase(20 * week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount)
		time.increase(200 * week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount)

		//lock2
		await this.tokenVesting.lock(fundRecipient, lockAmount, percent, { from: locker })
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), 0)
		time.increase(cliff - 100)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), 0)
		time.increase(week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount * percent / 100)
		time.increase(20 * week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount)
		time.increase(200 * week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount)


	})

	it("Unlock ", async () => {
		const lockAmount = 1000;
		const percent = 20;


		await this.tokenVesting.lock(fundRecipient2, lockAmount, percent, { from: locker })
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)

		time.increase(cliff);
		const balanceBefore = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore, 0)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: deployer });
		const balanceAfter = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter).minus(bn(balanceBefore)), 200)

		time.increase(week);
		const balanceBefore2 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore2, 200)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: deployer });
		const balanceAfter2 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter2).minus(bn(balanceBefore2)), 200)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)
		time.increase(86400);
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)

		time.increase(week);
		const balanceBefore3 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore3, 400)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: deployer });
		const balanceAfter3 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter3).minus(bn(balanceBefore3)), 200)

		time.increase(week);
		const balanceBefore4 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore4, 600)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: deployer });
		const balanceAfter4 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter4).minus(bn(balanceBefore4)), 200)

		time.increase(week);
		const balanceBefore5 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore5, 800)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: deployer });
		const balanceAfter5 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter5).minus(bn(balanceBefore5)), 200)

		await expectRevert( this.tokenVesting.unlock(0,fundRecipient2) ,"TokenVesting: no tokens are due")

	})
	it("blacklist", async () => {
		const lockAmount = 1000;
		const percent = 20;
		await this.tokenVesting.lock(fundRecipient2, lockAmount, percent, { from: locker })
		await expectRevert(this.tokenVesting.blackList(0, fundRecipient2), "only locker can add blackList", { from: deployer })
		const balanceLockerBefore = (await this.token.balanceOf(locker)).valueOf().toString()
		await this.tokenVesting.blackList(0, fundRecipient2, { from: locker })
		const balanceLockerAfter = (await this.token.balanceOf(locker)).valueOf().toString()
		assert.equal(bn(balanceLockerAfter).minus(bn(balanceLockerBefore)), 1000)

		await this.tokenVesting.lock(fundRecipient2, lockAmount, percent, { from: locker })
		time.increase(cliff)
		await this.tokenVesting.unlock(1, fundRecipient2)
		assert.equal((await this.token.balanceOf(fundRecipient2)).valueOf().toString(), 200)
		await this.tokenVesting.blackList(1, fundRecipient2, { from: locker })
		time.increase(week);
	
		await expectRevert.unspecified(this.tokenVesting.getUnlockable(1, fundRecipient2))
	})

});