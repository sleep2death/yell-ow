const request = require('request')
const async = require('async')
const iconv = require('iconv-lite')

const headers = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
  ACCEPT_ENCODING: 'gzip, deflate, sdch, br',
  ACCEPT_LANGUAGE: 'zh-CN,zh;q=0.8,ja;q=0.6,en;q=0.4,zh-TW;q=0.2',
  ACCEPT: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
}

module.exports = function (url, options, callback) {
  const list = []

  const count = options.count ? options.count : 1
  const pages = options.pages ? options.pages : 1

  const urlList = []
  for(let i = 1; i < (count + pages); i++) {
    urlList.push(url.concat(i.toString()))
  }

  async.eachSeries(urlList, (url, cb) => {
    request({headers, encoding: null, url, timeout: 5000}, (error, response, body) => {
      if(!error && response.statusCode === 200) {
        parse(iconv.decode(body, 'gb2312'), list)
        cb(null)
      }else{
        cb(new Error(`can't get the page: ${url}`))
      }
    })
  }, error => {
    if(error) throw error
    callback(list)
  })
}

function parse(body, list) {
  const REG = new RegExp(/<h3><a href="(htm_data.+?)".+?>(.+)<\/a>/g)
  let res = null

  while((res = REG.exec(body)) !== null) {
    list.push({path: res[1], title: res[2]})
  }

  return list
}
