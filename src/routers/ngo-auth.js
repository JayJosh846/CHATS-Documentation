const router = require('express').Router();

const NgoAuthCtrl = require('../controllers/NgoAuthController');

router.post('/register', NgoAuthCtrl.createUser);
router.post('/login', NgoAuthCtrl.signIn);
router.post('/reset-password', NgoAuthCtrl.resetPassword);
router.post('/update-password', NgoAuthCtrl.updatePassword);
router.post('/update-profile', NgoAuthCtrl.updateProfile);
router.get('/user-detail/:id', NgoAuthCtrl.userDetails);
router.get('/dashboard', NgoAuthCtrl.dashboard);

module.exports = router;
