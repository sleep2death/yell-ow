const fs = require('fs')
const async = require('async')

const getPages = require('./page')
const parse = require('./parse')

getPages('http://www.t66y.com/thread0806.php?fid=15&page=', {count: 1, pages: 2}, list => {
  const date = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')
  fs.mkdirSync(date)

  async.eachSeries(list, (item, callback) => {
    parse(date, item, callback)
  }, () => {
    console.log('finished')
  })
})
