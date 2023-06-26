const Roleservice = require('../services/RoleServices');
const util = require('../libs/Utils');

class RolesController {
  static async getAllRoles(req, res) {
    try {
      const allRole = await Roleservice.getAllRoles();
      if (allRole.length > 0) {
        util.setSuccess(200, 'Role retrieved', allRole);
      } else {
        util.setSuccess(200, 'No Role found');
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async addRole(req, res) {
    if (!req.body.name) {
      util.setError(400, 'Please provide complete details');
      return util.send(res);
    }
    const newRole = req.body;
    try {
      const createdRole = await Roleservice.addRole(newRole);
      util.setSuccess(201, 'Role Added!', createdRole);
      return util.send(res);
    } catch (error) {
      util.setError(400, error.message);
      return util.send(res);
    }
  }

  static async updatedRole(req, res) {
    const alteredRole = req.body;
    const {id} = req.params;
    if (!Number(id)) {
      util.setError(400, 'Please input a valid numeric value');
      return util.send(res);
    }
    try {
      const updateRole = await Roleservice.updateRole(id, alteredRole);
      if (!updateRole) {
        util.setError(404, `Cannot find Role with the id: ${id}`);
      } else {
        util.setSuccess(200, 'Role updated', updateRole);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }
  /**
   *          *
   * @param {*} req
   * @param {*} res
   * @description
   */
  static async getARole(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      util.setError(400, 'Please input a valid numeric value');
      return util.send(res);
    }

    try {
      const theRole = await Roleservice.getARole(id);

      if (!theRole) {
        util.setError(404, `Cannot find Role with the id ${id}`);
      } else {
        util.setSuccess(200, 'Found Role', theRole);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async deleteRole(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      util.setError(400, 'Please provide a numeric value');
      return util.send(res);
    }

    try {
      const RoleToDelete = await Roleservice.deleteRole(id);

      if (RoleToDelete) {
        util.setSuccess(200, 'Role deleted');
      } else {
        util.setError(404, `Role with the id ${id} cannot be found`);
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }
}

module.exports = RolesController;
