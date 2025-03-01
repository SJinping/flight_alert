Page({
  data: {
    alerts: [],
    targetPrice: '',
    selectedCity: ''
  },

  onLoad() {
    this.loadAlerts()
  },

  async addAlert() {
    const { targetPrice, selectedCity } = this.data
    if (!targetPrice || !selectedCity) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    const alert = {
      city: selectedCity,
      targetPrice: Number(targetPrice),
      createTime: Date.now()
    }

    const alerts = [...this.data.alerts, alert]
    wx.setStorageSync('priceAlerts', alerts)
    this.setData({ alerts })

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    })
  }
})