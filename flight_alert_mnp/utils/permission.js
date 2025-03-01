const checkMapPermission = () => {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          resolve(true)
        } else {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => resolve(true),
            fail: (err) => reject(err)
          })
        }
      },
      fail: (err) => reject(err)
    })
  })
}

const openSetting = () => {
  wx.openSetting({
    success: (res) => {
      console.log('设置状态：', res.authSetting)
    }
  })
}

module.exports = {
  checkMapPermission,
  openSetting
}