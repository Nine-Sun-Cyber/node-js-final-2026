const usersController = require('../controllers/users');

const router = require('express').Router();
const isAuth = require('../middlewares/isAuth');

router.post('/signup', usersController.signup);
router.post('/login', usersController.login);
router.get('/profile', isAuth, usersController.getProfile);
router.put('/profile', isAuth, usersController.putProfile);
router.put('/password', isAuth, usersController.putPassword);

//M5
router.get('/credit-package', isAuth, usersController.getCreditPackage);
router.get('/courses', isAuth, usersController.getCourses);

module.exports = router;