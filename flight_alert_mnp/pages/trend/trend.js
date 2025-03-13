Page({
  data: {
    cities: [],
    cityFlights: {},
    currentCity: '',
    canvasWidth: 0,
    canvasHeight: 600
  },

  onLoad() {
    console.log('trend page loaded')
    const app = getApp()
    
    // 检查全局数据
    if (!app.globalData.flights || !app.globalData.flights.length) {
      console.log('waiting for flight data...')
      app.flightDataReadyCallback = () => {
        this.initData()
      }
      return
    }

    this.initData()
  },

  onShow() {
    this.initData()
  },

  initData() {
    try {
      const app = getApp()
      console.log('App globalData:', app.globalData) // 添加日志
      const cities = app.globalData.cities || []
      const flights = app.globalData.flights || []
      
      console.log('Cities:', cities) // 添加日志
      console.log('Flights:', flights) // 添加日志
      
      if (!flights.length) {
        console.log('no flight data available')
        return
      }

      // 获取屏幕宽度
      const systemInfo = wx.getSystemInfoSync()
      const canvasWidth = systemInfo.windowWidth - 40
      
      // 获取当前日期
      const currentDate = this.formatDate(new Date())
      
      // 按城市分组并处理航班数据
      const cityFlights = {}
      const validCities = [] // 存储有效航班的城市
      
      cities.forEach(city => {
        const cityData = flights.filter(f => f.city === city)
        if (cityData.length > 0) {
          // 按日期组合分组，保留最新价格
          const flightMap = {}
          cityData.forEach(flight => {
            const key = `${flight.depDate}-${flight.retDate}`
            if (!flightMap[key] || flightMap[key].timestamp < flight.timestamp) {
              flightMap[key] = {
                ...flight,
                date: this.formatTimestamp(flight.timestamp),
                isExpired: flight.depDate < currentDate,
                displayPrice: `¥${flight.price}`
              }
            }
          })
          
          // 转换为数组并排序
          const processedFlights = Object.values(flightMap)
            .sort((a, b) => a.timestamp - b.timestamp)
          
          // 检查是否有未过期的航班
          const hasValidFlights = processedFlights.some(flight => !flight.isExpired)
          
          if (hasValidFlights) {
            cityFlights[city] = processedFlights
            validCities.push(city) // 只添加有有效航班的城市
          }
        }
      })

      console.log('processed city flights:', cityFlights)
      console.log('valid cities:', validCities)

      this.setData({
        cities: validCities, // 只使用有有效航班的城市
        cityFlights,
        currentCity: validCities.length > 0 ? validCities[0] : '',
        canvasWidth
      }, () => {
        console.log('After setData:', this.data) // 添加日志
        if (validCities.length > 0) {
          wx.nextTick(() => {
            console.log('Drawing chart...') // 添加日志
            this.drawChart()
          })
        } else {
          console.log('No valid cities with future flights')
          // 可以在这里添加无数据提示
        }
      })
    } catch (error) {
      console.error('初始化数据失败:', error)
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      })
    }
  },

  drawChart() {
    console.log('drawChart called')
    const { currentCity, cityFlights, canvasWidth, canvasHeight } = this.data
    const flights = cityFlights[currentCity]
    
    if (!flights || flights.length === 0) {
      console.log('No flights data for chart')
      return
    }

    try {
      const ctx = wx.createCanvasContext('priceChart')
      
      // 清空画布
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      ctx.setFillStyle('#ffffff')
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      
      const padding = {
        left: 60,
        right: 20,
        top: 30,
        bottom: 60
      }
      
      const chartWidth = canvasWidth - padding.left - padding.right
      const chartHeight = canvasHeight - padding.top - padding.bottom
    
      // 计算价格范围和刻度
      const prices = flights.map(f => f.price)
      const minPrice = Math.floor((Math.min(...prices) - 100) / 100) * 100
      const maxPrice = Math.ceil((Math.max(...prices) + 100) / 100) * 100
      const priceRange = maxPrice - minPrice
      const priceStep = Math.ceil(priceRange / 5 / 100) * 100
    
      // 绘制坐标轴
      ctx.beginPath()
      ctx.setLineWidth(1)
      ctx.setStrokeStyle('#666')
      // Y轴
      ctx.moveTo(padding.left, padding.top)
      ctx.lineTo(padding.left, canvasHeight - padding.bottom)
      // X轴
      ctx.lineTo(canvasWidth - padding.right, canvasHeight - padding.bottom)
      ctx.stroke()
    
      // 绘制价格刻度和网格线
      ctx.setFontSize(12)
      ctx.setTextAlign('right')
      for (let price = minPrice; price <= maxPrice; price += priceStep) {
        const y = canvasHeight - padding.bottom - ((price - minPrice) / priceRange * chartHeight)
        
        // 绘制刻度线
        ctx.beginPath()
        ctx.moveTo(padding.left - 5, y)
        ctx.lineTo(padding.left, y)
        ctx.stroke()
        
        // 绘制价格文本
        ctx.fillText(`¥${price}`, padding.left - 8, y + 4)
        
        // 绘制网格线
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(canvasWidth - padding.right, y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    
      // 绘制日期刻度
      ctx.setTextAlign('center')
      const dateInterval = Math.ceil(flights.length / 6)
      flights.forEach((flight, index) => {
        if (index % dateInterval === 0) {
          const x = padding.left + (index / (flights.length - 1)) * chartWidth
          ctx.save()
          ctx.translate(x, canvasHeight - padding.bottom + 5)
          ctx.rotate(Math.PI / 4)
          ctx.fillText(flight.date, 0, 0)
          ctx.restore()
        }
      })
    
      // 绘制坐标轴标题
      ctx.setFontSize(14)
      ctx.setTextAlign('center')
      ctx.fillText('更新时间', canvasWidth / 2, canvasHeight - 10)
      ctx.save()
      ctx.translate(20, canvasHeight / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('价格 (元)', 0, 0)
      ctx.restore()
    
      // 绘制价格曲线
      ctx.beginPath()
      ctx.setLineWidth(2)
      ctx.setStrokeStyle('#1976d2')
      
      flights.forEach((flight, index) => {
        const x = padding.left + (index / (flights.length - 1)) * chartWidth
        const y = canvasHeight - padding.bottom - ((flight.price - minPrice) / priceRange * chartHeight)
    
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
    
        // 绘制数据点
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.setFillStyle(flight.isExpired ? '#9e9e9e' : '#1976d2')
        ctx.fill()
        ctx.restore()
      })
      
      ctx.stroke()
      // 在绘制完成后调用 draw
      ctx.draw(false, () => {
        console.log('Chart drawn successfully')
      })
    } catch (error) {
      console.error('绘制图表失败:', error)
    }
  },

  onReady() {
    // 页面渲染完成后重新绘制图表
    if (this.data.cities.length > 0) {
      this.drawChart()
    }
  },  // 这里加上逗号

  handleCityChange(e) {
    try {
      const city = this.data.cities[e.detail.value]
      this.setData({ currentCity: city }, () => {
        wx.nextTick(() => {
          this.drawChart()
        })
      })
    } catch (error) {
      console.error('切换城市失败:', error)
    }
  },

  formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp * 1000)
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    } catch (error) {
      console.error('格式化时间戳失败:', error)
      return ''
    }
  },

  formatDate(date) {
    try {
      return date.toISOString().split('T')[0]
    } catch (error) {
      console.error('格式化日期失败:', error)
      return ''
    }
  },

  handleTap(e) {
    const { currentCity, cityFlights } = this.data
    const flights = cityFlights[currentCity]
    
    if (!flights || flights.length === 0) return
    
    const { x, y } = e.detail
    const padding = 40
    const chartWidth = this.data.canvasWidth - padding * 2
    const index = Math.floor((x - padding) / (chartWidth / (flights.length - 1)))
    
    if (index >= 0 && index < flights.length) {
      const flight = flights[index]
      if (!flight.isExpired) {
        const url = `https://flights.ctrip.com/online/list/round-szx-${flight.iataCode}?_=1&depdate=${flight.depDate}_${flight.retDate}`
        wx.setClipboardData({
          data: url,
          success() {
            wx.showToast({
              title: '链接已复制',
              icon: 'success'
            })
          }
        })
      }
    }
  }
})