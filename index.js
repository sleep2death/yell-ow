const fs = require('fs')
const readline = require('readline')
const request = require('request')
const async = require('async')
const parseTorrent = require('parse-torrent')
const iconv = require('iconv-lite')

const getPages = require('./page')

const spinners = [
  '|/-\\',
  '⠂-–—–-',
  '◐◓◑◒',
  '◴◷◶◵',
  '◰◳◲◱',
  '▖▘▝▗',
  '■□▪▫',
  '▌▀▐▄',
  '▉▊▋▌▍▎▏▎▍▌▋▊▉',
  '▁▃▄▅▆▇█▇▆▅▄▃',
  '←↖↑↗→↘↓↙',
  '┤┘┴└├┌┬┐',
  '◢◣◤◥',
  '.oO°Oo.',
  '.oO@*',
  '🌍🌎🌏',
  '◡◡ ⊙⊙ ◠◠',
  '☱☲☴',
  '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏',
  '⠋⠙⠚⠞⠖⠦⠴⠲⠳⠓',
  '⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆',
  '⠋⠙⠚⠒⠂⠂⠒⠲⠴⠦⠖⠒⠐⠐⠒⠓⠋',
  '⠁⠉⠙⠚⠒⠂⠂⠒⠲⠴⠤⠄⠄⠤⠴⠲⠒⠂⠂⠒⠚⠙⠉⠁',
  '⠈⠉⠋⠓⠒⠐⠐⠒⠖⠦⠤⠠⠠⠤⠦⠖⠒⠐⠐⠒⠓⠋⠉⠈',
  '⠁⠁⠉⠙⠚⠒⠂⠂⠒⠲⠴⠤⠄⠄⠤⠠⠠⠤⠦⠖⠒⠐⠐⠒⠓⠋⠉⠈⠈',
  '⢄⢂⢁⡁⡈⡐⡠',
  '⢹⢺⢼⣸⣇⡧⡗⡏',
  '⣾⣽⣻⢿⡿⣟⣯⣷',
  '⠁⠂⠄⡀⢀⠠⠐⠈',
  '🌑🌒🌓🌔🌕🌝🌖🌗🌘🌚'
]

const spinner = spinners[19]
let sCount = 0
const sLength = spinner.length

const headers = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
  ACCEPT_ENCODING: 'gzip, deflate, sdch, br',
  ACCEPT_LANGUAGE: 'zh-CN,zh;q=0.8,ja;q=0.6,en;q=0.4,zh-TW;q=0.2',
  ACCEPT: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
}

getPages('http://www.t66y.com/thread0806.php?fid=15&page=', {count: 1, pages: 5}, list => {
  const result = []
  async.eachSeries(list, (item, callback) => {
    waterfall(result, item, callback)
  }, () => {
    fs.writeFile('./result.txt', result.join('\n\n'), error => {
      if(error) throw error

      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0, null)
      process.stdout.write('ALL DONE')
    })
  })
})

function waterfall(result, item, callback) {
  const url = `http://www.t66y.com/${item.path}`

  const timer = setInterval(() => {
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0, null)
    process.stdout.write(`${getSpinner()} processing ${item.title}`)
  }, 200)

  async.waterfall([
    cb => {
      request({headers, url, timeout: 5000}, (error, response, page) => {
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
      request({headers, url: torrentInfoPage, timeout: 5000}, (error, response, page) => {
        if(!error && response.statusCode === 200) {
          const reg = new RegExp(/name="ref" value="([a-z0-9]+)".+NAME="reff" value="(.+)"+/g)
          const res = reg.exec(page)
          if(res) {
            cb(null, res[1], res[2])
          }else{
            cb(`torrent download info not found in ${torrentInfoPage}`)
          }
        }else{
          cb(`torrent download page not found: ${torrentInfoPage}`)
        }
      })
    },
    (ref, reff, cb) => {
      const url = `http://www.rmdown.com/download.php?ref=${ref}&reff=${encodeURIComponent(reff)}&submit=download`

      request({headers, urltimeout: 5000, url}).on('response', res => {
        const fws = fs.createWriteStream(`${item.title}.torrent`)
        res.pipe(fws)
      })

      parseTorrent.remote(url, (error, parsedTorrent) => {
        if(error || !parsedTorrent) {
          return cb(`invalid torrent file in ${url}: ${error}`)
        }
        cb(null, parseTorrent.toMagnetURI(parsedTorrent))
      })
    },
    (magnet, cb) => {
      magnet = magnet.replace(/&dn=(.+?)&/g, `&dn=${item.title}&`)
      cb(null, magnet)
    }
  ], (error, magnet) => {
    if(magnet) result.push(magnet)

    clearInterval(timer)
    callback()
  })

  function getSpinner() {
    sCount = sCount < sLength - 1 ? sCount + 1 : 0
    return spinner[sCount]
  }
}

