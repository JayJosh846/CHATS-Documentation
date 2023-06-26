"use strict";
// var _a;
exports.__esModule = true;
const { Op } = require("sequelize");
const ampConn = require('./consumers/connection');
const { Organisation, User, Wallet, FundAccount, Transaction, Order, Market } = require("./models");
const {
  createAccountWallet,
  mintToken,
  approveToSpend,
  transferFrom,
  transferTo,
} = require("./../../../services/Blockchain");

const { createPair } = require("../../../services/Bantu");
const ninVerification = require("../../../services/NinController");

var createWalletQueue = ampConn["default"].declareQueue("createWallet", {
  durable: true,
  prefetch: 1,
});

var mintTokenQueue = ampConn["default"].declareQueue("mintToken", {
  durable: true,
  prefetch: 1,
});

var approveToSpendQueue = ampConn["default"].declareQueue("approveToSpend", {
  durable: true,
  prefetch: 1,
});

var transferFromQueue = ampConn["default"].declareQueue("transferFrom", {
  durable: true,
  prefetch: 1,
});

var transferToQueue = ampConn["default"].declareQueue("transferTo", {
  durable: true,
  prefetch: 1,
});

var ninVerificationQueue = ampConn["default"].declareQueue("nin_verification", {
  durable: true,
  prefetch: 1,
});

ampConn["default"]
  .completeConfiguration()
  .then(function () {
    createWalletQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const type = content.type;
        const campaign = content.campaign ? content.campaign : null;
        let user;
        if (type === "organisation") {
          user = await Organisation.findByPk(content.id);
        } else if (type === "user") {
          user = await User.findByPk(content.id);
        }
        createAccountWallet()
          .then(async (response) => {
            const address = response.AccountCreated.address;
            const privateKey = response.AccountCreated.privateKey;
            let walletRow;
            if (type === "organisation") {
              const existingWallet = await user.getWallet();
              if (existingWallet.length) {
                walletRow = {
                  address,
                  privateKey,
                  CampaignId: campaign,
                };
              } else {
                const bantuPair = createPair();
                walletRow = {
                  address,
                  privateKey,
                  CampaignId: campaign,
                  bantuAddress: bantuPair.publicKey,
                  bantuPrivateKey: bantuPair.secret,
                };
              }
            } else {
              walletRow = {
                address,
                privateKey,
                CampaignId: campaign,
              };
            }

            const wallet = await user.createWallet(walletRow);
            msg.ack();
          })
          .catch((err) => {
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running consumer for Create Wallet");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

ampConn["default"]
  .completeConfiguration()
  .then(function () {
    mintTokenQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const address = content.address;
        const amount = content.amount;
        const fundTransaction = content.fund;
        mintToken(address, amount).then(async () => {
          await Organisation.findOne({
            where: { id: content.id },
            include: {
              model: Wallet,
              as: "Wallet",
              where: {
                bantuAddress: {
                  [Op.ne]: null,
                },
              },
            },
          })
            .then(async (org) => {
              await org.Wallet[0]
                .increment("balance", { by: amount })
                .then(async () => {
                  await FundAccount.findByPk(fundTransaction).then(
                    (record) => {
                      record.status = "successful";
                      record.save();
                    }
                  );
                });
              console.log("Done");
              msg.ack();
            })
            .catch((error) => {
              console.log("An Error Occurred", error.message);
              msg.nack();
            });
        });
      })
      .then(function () {
        return console.log("Running consumer for Mint Token");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

ampConn["default"]
  .completeConfiguration()
  .then(function () {
    approveToSpendQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const ngoAddr = content.ngoAddress;
        const ngoPassword = content.ngoPrivateKey;
        const reciever = content.reciever;
        const amount = content.amount;
        const transactionUuid = content.transactionId;

        approveToSpend(ngoAddr, ngoPassword, reciever, amount)
          .then(async (response) => {
            const transaction = await Transaction.findOne({
              where: { uuid: transactionUuid },
            });
            await transaction
              .update({
                status: "success",
                transactionHash: response.Approved.TransactionHash,
              })
              .then(async (transaction) => {
                const sender = await Wallet.findOne({
                  where: { address: ngoAddr },
                });
                const recieverAdd = await Wallet.findOne({
                  where: { address: reciever },
                });
                await sender.decrement("balance", { by: amount }).catch(() => {
                  console.log("Could not deduct");
                });
                await recieverAdd
                  .increment("balance", { by: amount })
                  .catch(() => {
                    console.log("Could not increment");
                  });
              })
              .catch(() => {
                console.log("Could not find transaction");
              });
            msg.ack();
          })
          .catch(async (err) => {
            const transaction = await Transaction.findOne({
              where: { uuid: transactionUuid },
            });
            await transaction.update({ status: "declined" });
            msg.ack();
          });
      })
      .then(function () {
        return console.log("Running consumer for Approve to Spend");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

ampConn["default"]
  .completeConfiguration()
  .then(function () {
    transferFromQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const owner = content.ownerAddress;
        const reciever = content.recieverAddress;
        const spender = content.spenderAddress;
        const spenderKey = content.senderKey;
        const amount = Math.ceil(content.amount);
        const transactionId = content.transactionId;
        const pendingOrder = content.pendingOrder;
        const order = await Order.findOne({
          where: { id: pendingOrder },
          include: {
            model: OrderProducts,
            as: "Cart",
            include: {
              model: Products,
              as: "Product",
              include: { model: Market, as: "Vendor" },
            },
          },
        });

        transferFrom(owner, spender, spenderKey, reciever, amount)
          .then(async (response) => {
            const gottenResponse = response.TransferedFrom;
            const beneficiaryWallet = await Wallet.findOne({
              where: { address: spender },
            });
            const vendorWallet = await Wallet.findOne({
              where: { address: gottenResponse.Receiver },
            });
            const order = await Order.findOne({
              where: { id: pendingOrder },
              include: {
                model: OrderProducts,
                as: "Cart",
                include: {
                  model: Products,
                  as: "Product",
                  include: { model: Market, as: "Vendor" },
                },
              },
            });
            const transactionRecord = await Transaction.findByPk(
              transactionId
            );

            await beneficiaryWallet
              .decrement("balance", {
                by: gottenResponse.Amount,
              })
              .then(async () => {
                await vendorWallet
                  .increment("balance", {
                    by: gottenResponse.Amount,
                  })
                  .then(async () => {
                    await order
                      .update({ status: "confirmed" })
                      .then(async () => {
                        await transactionRecord.update({
                          status: "success",
                          is_approved: true,
                          transactionHash: gottenResponse.TransactionHash,
                        });

                        for (let cart of order.Cart) {
                          await cart.Product.decrement("quantity", {
                            by: cart.quantity,
                          });
                        }
                        msg.ack();
                      });
                  });
              });
          })
          .catch((error) => {
            
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running consumer for Transfer From");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

ampConn["default"]
  .completeConfiguration()
  .then(function () {
    transferToQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const amount = content.amount;
        const senderPass = content.senderPass;
        const senderAddress = content.senderAddress;
        const reciepientAddress = content.reciepientAddress;
        const transaction = content.transaction;

        transferTo(senderAddress, senderPass, reciepientAddress, amount)
          .then(async (response) => {
            console.log(response);
            const transactionExist = await Transaction.findByPk(transaction);
            const sender = await Wallet.findOne({
              where: { address: senderAddress },
            });
            const reciever = await Wallet.findOne({
              where: { address: reciepientAddress },
            });
            sender.decrement("balance", {
              by: amount,
            });
            reciever.increment("balance", {
              by: amount,
            });
            transactionExist.status = "success";
            transactionExist.transactionHash =
              response.Transfered.TransactionHash;
            transactionExist.save();
            msg.ack();
          })
          .catch((err) => {
            console.log(err);
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running consumer for Transfer To");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

ampConn["default"]
  .completeConfiguration()
  .then(function () {
    ninVerificationQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        let user = await User.findByPk(content.id);

        ninVerification(user)
          .then(async (response) => {
            if (response.message === "norecord") {
              await user.update({ status: "suspended" });
              msg.ack();
            }
            if (response.message === "Success") {
              let data = response.demoData[0];
              let names = [
                String(data.firstname).toLowerCase(),
                String(data.surname).toLowerCase(),
              ];
              if (
                names.includes(String(user.first_name).toLowerCase()) &&
                names.includes(String(user.last_name).toLowerCase())
              ) {
                await user.update({ status: "activated", is_nin_verified: true });
                console.log("User Activated");
              } else {
                await user.update({ status: "suspended" });
              }
              msg.ack();
              console.log("Concluded");
            }
          })
          .catch((error) => {
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running Nin Verification Queue");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });
