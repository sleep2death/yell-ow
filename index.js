const fs = require('fs')
const async = require('async')

const getPages = require('./lib/page')
const parse = require('./lib/parse')

getPages('http://www.t66y.com/thread0806.php?fid=15&page=', {count: 1, pages: 2}, list => {
  const date = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')
  const path = `result/${date}`
  fs.mkdirSync(path)

  let currentItem = 0

  async.eachSeries(list, (item, callback) => {
    currentItem += 1

    item.index = currentItem
    item.total = list.length

    parse(path, item, callback)
  }, () => {
    console.log('\nfinished')
  })
})
