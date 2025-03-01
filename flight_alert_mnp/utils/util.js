const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()

  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const generateBookingUrl = (iataCode, depDate, retDate) => {
  return `https://flights.ctrip.com/online/list/round-szx-${iataCode}?_=1&depdate=${depDate}_${retDate}`
}

const showError = (message) => {
  wx.showToast({
    title: message,
    icon: 'error',
    duration: 2000
  })
}

const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  })
}

const hideLoading = () => {
  wx.hideLoading()
}

module.exports = {
  formatTime,
  formatNumber,
  generateBookingUrl,
  showError,
  showLoading,
  hideLoading
}