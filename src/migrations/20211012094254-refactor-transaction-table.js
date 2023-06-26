'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.addColumn('Transactions', 'reference', {
      allowNull: true,
      type: Sequelize.TEXT,
    });

    await queryInterface.addColumn('Transactions', 'transaction_hash', {
      allowNull: true,
      type: Sequelize.TEXT,
    });

    await queryInterface.addColumn('Transactions', 'transaction_type', {
      allowNull: true,
      type: Sequelize.ENUM('deposit', 'withdrawal', 'transfer', 'approval', 'spent')
    });

    await queryInterface.addColumn('Transactions', 'SenderWalletId', {
      allowNull: true,
      type: Sequelize.UUID,
      references: {
        model: {
          tableName: 'Wallets',
        },
        key: 'uuid'
      }
    });

    await queryInterface.addColumn('Transactions', 'ReceiverWalletId', {
      allowNull: true,
      type: Sequelize.UUID,
      references: {
        model: {
          tableName: 'Wallets',
        },
        key: 'uuid'
      }
    });

    await queryInterface.addColumn('Transactions', 'OrderId', {
      allowNull: true,
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Orders',
        },
        key: 'id'
      }
    });

    await queryInterface.addColumn('Transactions', 'VendorId', {
      allowNull: true,
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id'
      }
    });

    await queryInterface.addColumn('Transactions', 'BeneficiaryId', {
      allowNull: true,
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id'
      }
    });

    await queryInterface.addColumn('Transactions', 'OrganisationId', {
      allowNull: true,
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Organisations',
        },
        key: 'id'
      }
    });

    await queryInterface.removeColumn('Transactions', 'walletSenderId');
    await queryInterface.removeColumn('Transactions', 'walletRecieverId');
    await queryInterface.removeColumn('Transactions', 'TransactionalId');
    await queryInterface.removeColumn('Transactions', 'TransactionalType');
    await queryInterface.removeColumn('Transactions', 'transactionHash');

  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Transactions', 'reference');
    await queryInterface.removeColumn('Transactions', 'transaction_type');
    await queryInterface.removeColumn('Transactions', 'SenderWalletId');
    await queryInterface.removeColumn('Transactions', 'ReceiverWalletId');
    await queryInterface.removeColumn('Transactions', 'OrderId');
    await queryInterface.removeColumn('Transactions', 'VendorId');
    await queryInterface.removeColumn('Transactions', 'BeneficiaryId');
    await queryInterface.removeColumn('Transactions', 'OrganisationId');


    await queryInterface.addColumn('Transactions', 'walletSenderId', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    await queryInterface.addColumn('Transactions', 'walletRecieverId', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    await queryInterface.addColumn('Transactions', 'TransactionalId', {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addColumn('Transactions', 'TransactionalType', {
      type: Sequelize.STRING
    });

    await queryInterface.addColumn('Transactions', 'transactionHash', {
      type: Sequelize.STRING
    });
  }
};