const app = require('../app')
const { dataSource } = require('../db/data-source')

async function start(retries = 3) {
  try {
    await dataSource.initialize()
    console.log('資料庫連線成功')

    app.listen(process.env.PORT, () => {
      console.log(`server 跑起來了：http://localhost:${process.env.PORT}`)
    })
  } catch (err) {
    console.error('資料庫連線失敗', err.message)
    if (retries > 0) {
      console.log(`重試中...剩餘 ${retries} 次`)
      setTimeout(() => start(retries - 1), 2000)
    } else {
      process.exit(1)
    }
  }
}

start()