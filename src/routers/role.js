const router = require('express').Router();

const RolesController = require('../controllers/RolesController');

router.get('/', RolesController.getAllRoles);
router.post('/', RolesController.addRole);
router.get('/:id', RolesController.getARole);
router.put('/:id', RolesController.updatedRole);
router.delete('/:id', RolesController.deleteRole);

module.exports = router;
