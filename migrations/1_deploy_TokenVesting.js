/* global artifacts */

const ABC = artifacts.require('ABC')
const TokenVesting = artifacts.require('TokenVesting')


module.exports = async (deployer,accounts) => {
     await deployer.deploy(TokenVesting)
     const VestingIntance = await TokenVesting.deployed();
     const token_address = "0x821c663d084b0d6f4de1beed649284be1b5f35f7"
      await VestingIntance.initialize(token_address);
   
}