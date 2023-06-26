const connect = require('./web3js');

const BlockchainTrx = async (_result, _from, _pswd) => {
  const nonce = await connect.web3.eth.getTransactionCount(_from);
  const data = _result.encodeABI();
  const tx = {
    nonce: nonce,
    from: _from,
    to: connect.address,
    data: data,
    gas: 400000,
    gasPrice: 0,
  };

  const transfer = await connect.web3.eth.personal.signTransaction(tx, _pswd);
  const serializetx = transfer.raw;
  const sendtx = await connect.web3.eth.sendSignedTransaction(serializetx);

  return sendtx;
};

//Users' Management by Admin

/**
 * @name CreateAccount
 * @description This creates a blockchain account with system generated/encrypted password for users
 * @param {string} _passwrd: generated encrypted password for user
 * @returns {object[]} object with transaction status; true or throws
 */
exports.CreateAccount = async _passwrd => {
  try {
    await connect.web3.eth.personal.unlockAccount(
      connect.account,
      connect.account_pass,
      0,
    );
    let addr = await connect.web3.eth.personal.newAccount(_passwrd);
    const result = await connect.contract.methods.SetWhiteList(addr);
    await BlockchainTrx(result, connect.account, connect.account_pass);

    return addr;
  } catch (error) {
    err = {
      name: 'Web3-CreateAccount',
      error: error.message,
    };
    throw err;
  }
};
