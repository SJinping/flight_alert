const { getFlightData } = require('./utils/request')
const { showError, showLoading, hideLoading } = require('./utils/util')
const EventBus = require('./utils/event-bus')

App({
  eventBus: EventBus,
  globalData: {
    flights: [],
    cities: [],
    cityCoordinates: {},
    isLoading: false,
    hasError: false,
    errorMessage: ''
  },

  onLaunch() {
    this.loadFlightData()
  },

  onShow() {
    this.loadFlightData()
  },

  async loadFlightData() {
    try {
      const { getFlightData } = require('./utils/request')
      console.log('Starting to load flight data...')
      
      const csvData = await getFlightData()

      if (!csvData) {
        throw new Error('No data received')
      }

      // 使用已有的 parseFlightData 函数解析数据
      const flights = this.parseFlightData(csvData)
      
      // 处理数据并更新 globalData
      this.globalData.flights = flights
      this.globalData.cities = [...new Set(flights.map(f => f.city))]
      
      // 如果有回调，执行回调
      if (this.flightDataReadyCallback) {
        console.log('Executing callback...')
        this.flightDataReadyCallback()
      }
    } catch (error) {
      console.error('数据加载失败:', error)
      wx.showToast({
        title: '数据加载失败，请重试',
        icon: 'error',
        duration: 2000
      })
    }
  },

  setGlobalData(key, value) {
    this.globalData[key] = value
    this.eventBus.emit(`globalData:${key}`, value)
  },

  parseFlightData(data) {
    return data
      .split('\n')
      .filter(line => line.trim())
      .map((line, index) => {
        const [city, depDate, retDate, price, timestamp, iataCode] = line.split(',')
        return {
          id: index,
          city,
          depDate,
          retDate,
          price: Number(price),
          timestamp: Number(timestamp.trim()),
          iataCode: iataCode?.trim()
        }
      })
  }
})