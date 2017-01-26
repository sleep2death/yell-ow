const request = require('request')
const async = require('async')
const parseTorrent = require('parse-torrent')
const chalk = require('chalk')
const iconv = require('iconv-lite')
const fs = require('fs')

const headers = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
  ACCEPT_ENCODING: 'gzip, deflate, sdch, br',
  ACCEPT_LANGUAGE: 'zh-CN,zh;q=0.8,ja;q=0.6,en;q=0.4,zh-TW;q=0.2',
  ACCEPT: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
}

request({headers, encoding: null, url: 'http://www.t66y.com/thread0806.php?fid=15'}, (error, response, body) => {
  if(!error && response.statusCode === 200) {
    parse(iconv.decode(body, 'gb2312'))
  }
})

function parse(body) {
  const REG = new RegExp(/<h3><a href="(htm_data.+?)".+?>(.+)<\/a>/g)
  const list = []
  const result = []
  let res = null

  while((res = REG.exec(body)) !== null) {
    if(list.indexOf(res) < 0) list.push({path: res[1], title: res[2]})
  }

  async.eachSeries(list, (item, callback) => {
    console.log(chalk.green.bold(item.title))
    waterfall(result, item, callback)
  }, error => {
    const finalStr = result.join('\n')
    fs.writeFile('./result.txt', result.join('\n'), error => {
      if(error) throw error
      console.log('done')
    })
  })
}

function waterfall(result, item, callback) {
  const url = `http://www.t66y.com/${item.path}`
  async.waterfall([
    cb => {
      request({headers, url}, (error, response, page) => {
        if(!error && response.statusCode === 200) {
          const reg = new RegExp(/http:\/\/www\.viidii\.info\/\?http:\/\/www______rmdown______com\/link______php\?hash=([0-9a-z]+)/g)
          const res = reg.exec(page)
          if(res) {
            cb(null, `http://www.rmdown.com/link.php?hash=${res[1]}`)
          }else{
            cb(`can\`t find torrent download link in ${url}`)
          }
        }else{
          cb(`post page not found: ${url}`)
        }
      })
    },
    (torrentInfoPage, cb) => {
      request({headers, url: torrentInfoPage}, (error, response, page) => {
        if(!error && response.statusCode === 200) {
          const reg = new RegExp(/name="ref" value="([a-z0-9]+)".+NAME="reff" value="(.+)"+/g)
          const res = reg.exec(page)
          if(res) {
            cb(null, res[1], res[2])
          }else{
            cb(`torrent download info not found in ${torrentInfoPage}`)
          }
        }else{
          cb(new Error(`torrent download page not found: ${torrentInfoPage}`))
        }
      })
    },
    (ref, reff, cb) => {
      const url = `http://www.rmdown.com/download.php?ref=${ref}&reff=${encodeURIComponent(reff)}&submit=download`
      /* const ws = fs.createWriteStream(`./data/${item.title}.torrent`)
      request.get(url, headers)
      .on('error', error => {
        return cb(`invalid torrent file in ${url}: ${error}`)
      })
      .pipe(ws)
      ws.on('close', error => {
        console.log('downloaded')
        cb()
        }) */
      parseTorrent.remote(url, (error, parsedTorrent) => {
        if(error || !parsedTorrent) {
          return cb(`invalid torrent file in ${url}: ${error}`)
        }
        cb(null, parseTorrent.toMagnetURI(parsedTorrent))
      })
    },
    (magnet, cb) => {
      // magnet = magnet.replace(/&dn=(.+?)&/g, `&dn=${item.title}&`)
      cb(null, magnet)
    }
  ], (error, magnet) => {
    if(error) console.log(chalk.red(error))
    if(magnet) result.push(magnet)
    callback()
  })
}

