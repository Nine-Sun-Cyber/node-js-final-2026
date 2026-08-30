const coachController = require('../controllers/Coach');

const router = require('express').Router();

router.get('/', coachController.getAllCoach);
router.get('/:coachId', coachController.getCoachDetail);
router.get('/:coachId/courses', coachController.getCoachCourses);

module.exports = router;