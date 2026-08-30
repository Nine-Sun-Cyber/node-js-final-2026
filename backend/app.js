const express = require('express');
const cors = require('cors');
const config = require('./config');
const { dataSource } = require('./db/data-source');
const appError = require('./utils/appError');
const skill = require('./routes/skill');
const users = require('./routes/users');
const CreditPackage = require('./routes/CreditPackage');
const Coach = require('./routes/Coach');
const adminCourses = require('./routes/adminCourses');
const Course = require('./routes/Course');
const publicCoaches = require('./routes/publicCoaches');

const app = express();
app.use(cors());
app.use(express.json());

//API
app.get('/healthcheck', async (req, res, next) => {
  try{
    await dataSource.query('SELECT 1');
    res.status(200).send('OK');
  }catch(error){
    res.status(503).send('Service Unavailable');
  }
}); 

app.use('/api/coaches/skill', skill);
app.use('/api/users', users);
app.use('/api/credit-package', CreditPackage);
app.use('/api/admin/coaches/courses', adminCourses);
app.use('/api/admin/coaches', Coach);
app.use('/api/courses', Course);
app.use('/api/coaches', publicCoaches);


app.use((req, res,next) =>{
//  res.status(404).json({
//    status: 'error',
//    message: '無此路由'
//  });
// New Error
  next(appError(400, "欄位未填寫正確"))
  return
});

app.use((err, req, res, next) =>{
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: statusCode === 500 ? 'error': 'failed',
    message: err.message || '伺服器錯誤'
  })
});


module.exports = app;