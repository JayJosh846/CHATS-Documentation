'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Orders', 'reference', {
      after: 'id',
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });

    await queryInterface.addColumn('Orders', 'VendorId', {
      after: 'reference',
      allowNull: false,
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id'
      }
    });

    await queryInterface.removeColumn('Orders', 'OrderUniqueId');

    await queryInterface.removeColumn('Orders', 'UserId');
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Orders', 'reference');
    await queryInterface.removeColumn('Orders', 'VendorId');
    await queryInterface.addColumn('Orders', 'OrderUniqueId', {
      after: 'id',
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
    await queryInterface.addColumn('Orders', 'UserId', {
      after: 'OrderUniqueId',
      allowNull: false,
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id'
      }
    });
  }
};