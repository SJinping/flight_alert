// const BASE_URL = 'https://raw.githubusercontent.com/SJinping/flight_alert/main/display/public'
const BASE_URL = 'https://cdn.jsdelivr.net/gh/SJinping/flight_alert@main/display/public'
const AMAP_KEY = '0c3f35dcf4e32955b133c8a24a41973a'

// 添加开发环境标志
const isDev = false  // 开发时设为 true，发布时改为 false

const request = (options) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'content-type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(res.data.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}

const getFlightData = async () => {
  try {
    if (isDev) {
      // 开发环境：从本地读取
      const fs = wx.getFileSystemManager()
      return new Promise((resolve, reject) => {
        fs.readFile({
          // 使用 wx.env.USER_DATA_PATH 的相对路径
          filePath: './data/price_log.txt',
          encoding: 'utf-8',
          success: (res) => {
            try {
              const data = JSON.parse(res.data)
              resolve(data)
            } catch (e) {
              resolve(res.data)
            }
          },
          fail: (err) => {
            console.error('读取本地文件失败:', err)
            reject(err)
          }
        })
      })
    } else {
      // 生产环境：从远程读取
      const response = await request({
        url: '/price_log.txt'
      })
      return response
    }
  } catch (error) {
    console.error('获取航班数据失败:', error)
    throw error
  }
}

async function getCityLocation(cityName) {
  const maxRetries = 3;
  const retryDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://restapi.amap.com/v3/geocode/geo',
          data: {
            key: AMAP_KEY,
            address: cityName,
            output: 'JSON'
          },
          success: (res) => {
            if (res && res.data) {
              resolve(res.data);
            } else {
              reject(new Error('Invalid response'));
            }
          },
          fail: (error) => {
            reject(error);
          }
        });
      });

      if (result.status === '1' && result.geocodes && result.geocodes.length > 0) {
        return result;
      }

      if (result.infocode === '10003') {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      return null;
    } catch (error) {
      console.error(`获取${cityName}坐标失败:`, error);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return null;
}

module.exports = {
  getFlightData,
  getCityLocation
}; // 删除多余的花括号，修正导出语句