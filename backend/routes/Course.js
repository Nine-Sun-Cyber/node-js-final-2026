const courseController = require('../controllers/Course');
const isAuth = require('../middlewares/isAuth');

const router = require('express').Router();

//M5+M4
router.post('/:courseId', isAuth, courseController.bookCourse);
router.delete('/:courseId', isAuth, courseController.deletebooking);
router.get('/', courseController.getOngoingCourses);

module.exports = router;