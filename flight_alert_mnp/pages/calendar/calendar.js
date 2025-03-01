Page({
  data: {
    selectedDate: '',
    flights: [],
    hasFlightsDates: [], // 存储有航班的日期
    dialogVisible: false,
    dateFlights: [],
    calendarConfig: {
      navigationText: {
        prev: '◀',
        next: '▶'
      }
    }
  },

  onLoad() {
    const app = getApp()
    // console.log('Calendar page loaded, global flights:', app.globalData.flights)
    
    // 修改日历组件的默认配置
    this.setData({
      calendarConfig: {
        prev: '〈', // 使用更优雅的箭头符号
        next: '〉'  // 或者可以用 '‹' 和 '›' 
      }
    })

    if (!app.globalData.flights || app.globalData.flights.length === 0) {
      app.flightDataReadyCallback = () => {
        this.initializeCalendarData(app.globalData.flights)
      }
    } else {
      this.initializeCalendarData(app.globalData.flights)
    }
  },

  initializeCalendarData(flights) {
    // 获取所有有航班的出发日期，并确保格式为 YYYY-MM-DD
    const dates = [...new Set(flights.map(f => {
      
      // 如果日期格式是 YYYYMMDD，转换为 YYYY-MM-DD
      const formattedDate = f.depDate.replace(
        /(\d{4})(\d{2})(\d{2})/,
        '$1-$2-$3'
      )
      return formattedDate
    }))].sort()
        
    this.setData({
      flights: flights.map(f => ({
        ...f,
        depDate: f.depDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        retDate: f.retDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
      })),
      hasFlightsDates: dates
    })
  },

  handleDateSelect(e) {
    const date = e.detail.date
    console.log('Selected date:', date)
    
    // 查找选中日期的航班
    const flightsOnDate = this.data.flights
      .filter(f => f.depDate === date)
      .reduce((acc, flight) => {
        const key = `${flight.city}-${flight.depDate}-${flight.retDate}`
        if (!acc[key] || acc[key].timestamp < flight.timestamp) {
          acc[key] = flight
        }
        return acc
      }, {})

    const uniqueFlights = Object.values(flightsOnDate)
    
    if (uniqueFlights.length > 0) {
      this.setData({
        selectedDate: date,
        dateFlights: uniqueFlights,
        dialogVisible: true
      })
    } else {
      wx.showToast({
        title: '该日期无航班',
        icon: 'none'
      })
    }
  },

  handleBook(e) {
    const { iataCode, depDate, retDate, city } = e.currentTarget.dataset;
    
    // URL 参数
    const params = {
      ddate: depDate,
      adate: retDate,
      dcode: 'SZX',
      acode: iataCode,
      dcity: 'SZX',
      dcityName: '深圳',
      acity: iataCode,
      acityName: city,
      tripType: '2',
      filters: '[]',
      sort: '{"type":"price","value":-1}',
      from: 'swift-index'
    };

    // 构建完整 URL
    const baseUrl = 'https://m.ctrip.com/html5/flight/pages/first';
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    const url = `${baseUrl}?${queryString}`;

    // 复制链接到剪贴板
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showModal({
          title: '链接已复制',
          content: '请在浏览器中打开携程网页完成预订',
          showCancel: false
        });
      }
    });

    // // WebView 跳转方式（暂时注释）
    // console.log('Book URL:', url);
    // wx.navigateTo({
    //   url: `/pages/webview/webview?url=${encodeURIComponent(url)}`
    // });
  },

  closeDialog() {
    this.setData({
      dialogVisible: false
    });
  }
});