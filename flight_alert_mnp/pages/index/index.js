Page({
  data: {
    userInfo: null,
    hasUserInfo: false
  },

  onLoad() {
    // 检查是否已经授权
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          this.getUserInfo()
        }
      }
    })
  },

  getUserInfo() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        // 保存用户信息
        wx.setStorageSync('userInfo', res.userInfo)
        // 跳转到表格页面
        wx.switchTab({
          url: '/pages/table/table'
        })
      },
      fail: (err) => {
        console.error('获取用户信息失败：', err)
      }
    })
  }
})