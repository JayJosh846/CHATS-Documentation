require('dotenv').config();
var Web3 = require('web3');

var provider = new Web3.providers.HttpProvider(process.env.blockchainRPC);

var web3 = new Web3(provider);
const account = process.env.account;
const accountPass = process.env.account_pass;
const contract = process.env.contract

const abi = ''

const deployedContract = new web3.eth.Contract(abi, contract);

module.exports = {
  web3,
  address,
  deployedContract,
  account,
  accountPass
};