const adminCourseController = require('../controllers/adminCourses');
const isAuth = require('../middlewares/isAuth');
const isCoach = require('../middlewares/isCoach');

const router = require('express').Router();

router.get("/", isAuth, isCoach, adminCourseController.getAll);
router.post("/", isAuth, isCoach, adminCourseController.create);
router.get("/:courseId", isAuth, adminCourseController.getOne);
router.put("/:courseId", isAuth, adminCourseController.update); 

module.exports = router;