/* global artifacts */

const ABC = artifacts.require('ABC')
const TokenVesting = artifacts.require('TokenVesting')


module.exports = async (deployer) => {
      const intance = await deployer.deploy(TokenVesting,"0xD473Ca21B6deC5f559d8F45012B3Cc90337703ec")
   
     // const token = await deployer.deploy(ABC,"0xD473Ca21B6deC5f559d8F45012B3Cc90337703ec")
}