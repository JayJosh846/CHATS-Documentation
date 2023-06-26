'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Transactions', {
      uuid: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      walletSenderId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      walletRecieverId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      TransactionalId: {
        type: Sequelize.INTEGER,
      },
      TransactionalType: {
        type: Sequelize.STRING
      },
      transactionHash: {
        type: Sequelize.STRING
      },
      amount: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      status: {
        allowNull: false,
        type: Sequelize.ENUM('success', 'processing', 'declined', 'failed'),
        defaultValue: 'processing'
      },
      is_approved: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      narration: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      log: {
        type: Sequelize.TEXT,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Transactions');
  }
};
