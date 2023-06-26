const connect = require('./web3js');

/**
 * @name getOwner
 * @description This gets SuperUser Blockchain account of the contract
 * @param {string}  _From: Requester Blockchain account
 * @returns {array[]} address of the SuperUser
 */
exports.getOwner = async _From => {
  try {
    let result = await connect.contract.methods.isOwner().call({from: _From});
    return result;
  } catch (error) {
    err = {
      name: 'Web3-isOwner',
      error: error,
    };
    throw err;
  }
};
