const fs = require('fs')
const readline = require('readline')
const async = require('async')
const request = require('request')

const spinners = [
  '|/-\\',
  '⠂-–—–-',
  '▌▀▐▄',
  '▉▊▋▌▍▎▏▎▍▌▋▊▉',
  '▁▃▄▅▆▇█▇▆▅▄▃',
  '←↖↑↗→↘↓↙',
  '┤┘┴└├┌┬┐',
  '◢◣◤◥',
  '.oO°Oo.',
  '.oO@*',
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
  '⠁⠂⠄⡀⢀⠠⠐⠈'
]

const spinner = spinners[15]
let sCount = 0
const sLength = spinner.length

const HEADER = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
  ACCEPT_ENCODING: 'gzip, deflate, sdch, br',
  ACCEPT_LANGUAGE: 'zh-CN,zh;q=0.8,ja;q=0.6,en;q=0.4,zh-TW;q=0.2',
  ACCEPT: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
}

const TIMEOUT = 5000

const REG_DOWNLOAD_LINK = /http:\/\/www\.viidii\.info\/\?http:\/\/www______rmdown______com\/link______php\?hash=([0-9a-z]+)/g
const REG_TORRENT_INFO = /name="ref" value="([a-z0-9]+)".+NAME="reff" value="(.+)"+/g

module.exports = function (path, item, callback) {
  const url = `http://www.t66y.com/${item.path}`

  const timer = setInterval(() => {
    output(`${getSpinner()} processing ${item.title}`)
  }, 200)

  async.waterfall([
    // read the post, and find out the download link
    cb => {
      request({HEADER, url, timeout: TIMEOUT}, (error, response, page) => {
        if(!error && response.statusCode === 200) {
          const res = new RegExp(REG_DOWNLOAD_LINK).exec(page)
          if(res) {
            cb(null, `http://www.rmdown.com/link.php?hash=${res[1]}`)
          }else{
            cb(`can\`t find torrent download page in ${url}`)
          }
        }else{
          cb(`post page not found: ${url}`)
        }
      })
    },

    // read the download link page, and find out the torrent link
    (url, cb) => {
      request({HEADER, url, timeout: TIMEOUT}, (error, response, page) => {
        if(!error && response.statusCode === 200) {
          const res = new RegExp(REG_TORRENT_INFO).exec(page)
          if(res) {
            cb(null, res[1], res[2])
          }else{
            cb(`torrent download info not found in ${url}`)
          }
        }else{
          cb(`torrent download page not found: ${url}`)
        }
      })
    },

    // download the torrent
    (ref, reff, cb) => {
      const url = `http://www.rmdown.com/download.php?ref=${ref}&reff=${encodeURIComponent(reff)}&submit=download`

      request({HEADER, url, timeout: TIMEOUT})
        .on('error', error => {
          cb(error.toString())
        })
        .on('response', res => {
          const fws = fs.createWriteStream(`${path}/${filename(item.title)}.torrent`)

          res.on('end', () => {
            output(`${getSpinner()} processing ${item.title} [success]`)
            cb(null)
          })

          res.pipe(fws)
        })
    }
  ], error => {
    if(error) output(error)
    clearInterval(timer)
    callback()
  })

  function filename(str) {
    str = str.replace(/[<>:"/\\|?*~]/g, ' ')
    return str
  }

  function getSpinner() {
    sCount = sCount < sLength - 1 ? sCount + 1 : 0
    return spinner[sCount]
  }

  function output(str) {
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0, null)
    process.stdout.write(str)
  }
}
