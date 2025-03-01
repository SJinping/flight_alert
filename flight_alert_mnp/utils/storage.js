const KEYS = {
  FLIGHT_DATA: 'FLIGHT_DATA',
  CITY_COORDINATES: 'CITY_COORDINATES',
  LAST_UPDATE: 'LAST_UPDATE'
}

const Storage = {
  set(key, data) {
    try {
      wx.setStorageSync(key, data)
    } catch (e) {
      console.error('存储数据失败:', e)
    }
  },

  get(key) {
    try {
      return wx.getStorageSync(key)
    } catch (e) {
      console.error('获取数据失败:', e)
      return null
    }
  },

  remove(key) {
    try {
      wx.removeStorageSync(key)
    } catch (e) {
      console.error('删除数据失败:', e)
    }
  },

  clear() {
    try {
      wx.clearStorageSync()
    } catch (e) {
      console.error('清除数据失败:', e)
    }
  }
}

module.exports = {
  Storage,
  KEYS
}