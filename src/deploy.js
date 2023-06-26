const {web3, account, account_pass} = require('./services/web3js')

web3.eth.personal.unlockAccount(account, account_pass, 300).then(function (res) {
  console.log('unlock succeeded: ' + res);
  var code = 

  web3.eth
    .sendTransaction({
      from: account,
      gas: 7000000,
      data: code
    })
    .then(function (status) {
      console.log('Contract Address : ' + status.contractAddress);
    });
});
