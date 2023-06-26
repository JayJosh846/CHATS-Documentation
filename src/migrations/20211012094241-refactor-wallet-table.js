'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.addColumn('Wallets', 'UserId', {
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: "Users",
        },
        key: "id",
      },
    });

    await queryInterface.addColumn('Wallets', 'OrganisationId', {
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: "Organisations",
        },
        key: "id",
      },
    });

    await queryInterface.addColumn('Wallets', 'wallet_type', {
      type: Sequelize.ENUM('user', 'organisation'),
      defaultValue: 'user'
    });

    await queryInterface.addColumn('Wallets', 'crypto_balance', {
      type: Sequelize.FLOAT,
      defaultValue: 0.00,
    });

    await queryInterface.addColumn('Wallets', 'fiat_balance', {
      type: Sequelize.FLOAT,
      defaultValue: 0.00,
    });

    await queryInterface.addColumn('Wallets', 'local_currency', {
      type: Sequelize.STRING,
      defaultValue: 'NGN'
    });

    await queryInterface.removeColumn('Wallets', 'AccountUserId');
    await queryInterface.removeColumn('Wallets', 'AccountUserType');

  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Wallets', 'UserId');
    await queryInterface.removeColumn('Wallets', 'OrganisationId');
    await queryInterface.removeColumn('Wallets', 'wallet_type');
    await queryInterface.removeColumn('Wallets', 'crypto_balance');
    await queryInterface.removeColumn('Wallets', 'fiat_balance');
    await queryInterface.removeColumn('Wallets', 'local_currency');
    await queryInterface.addColumn('Wallets', 'AccountUserId', {
      allowNull: false,
      type: Sequelize.INTEGER,
    });
    await queryInterface.addColumn('Wallets', 'AccountUserType', {
      type: Sequelize.STRING,
    });
  }
};