const coachesController = require('../controllers/Coach');

const router = require('express').Router();
const isAuth = require('../middlewares/isAuth');
const isCoach = require('../middlewares/isCoach');

router.post('/:userId', coachesController.postCoach);
router.get('/', isAuth, isCoach, coachesController.getCoach);
router.put('/', isAuth, isCoach,coachesController.putCoach);
router.get('/revenue', isAuth, isCoach, coachesController.getRevenue);

module.exports = router;