const app = getApp()

Page({
  data: {
    markers: [],
    polylines: [],
    loading: true,
    mapReady: false,
    selectedCity: null,
    cityFlights: [],
    dialogVisible: false,
    includePoints: [],
    showDrawer: false,
    mapScale: 4,
    showCityFlights: false,
    mapSubKey: 'TZZBZ-EAVCC-KWF22-AHUSZ-4ZZOE-WGBFV',  // 添加你的地图 subkey
    mapSetting: {
      showScale: false,          // 不显示比例尺
      showCompass: false,        // 不显示指南针
      enableRotation: false,     // 禁用旋转
      enableOverlooking: false,  // 禁用俯视
      enableSatellite: false,    // 不显示卫星图
      enableTraffic: false,      // 不显示路况
      enableBuilding: false,     // 不显示3D建筑
      showLabel: false           // 不显示地图标签（地点名称等）
    }
  },

  onLoad() {
    if (app.globalData.flights) {
      this.loadCityCoordinates()
    } else {
      app.flightDataReadyCallback = () => {
        this.loadCityCoordinates()
      }
    }
  },

  async loadCityCoordinates() {
    try {
      const cities = [...new Set(app.globalData.cities)];
      if (!cities || cities.length === 0) {
        console.log('No cities data available');
        return;
      }

      // 尝试从本地缓存读取坐标数据
      const cachedCoordinates = wx.getStorageSync('cityCoordinates') || {};
      app.globalData.cityCoordinates = { ...cachedCoordinates };

      for (const city of cities) {
        if (!app.globalData.cityCoordinates[city]) {
          console.log('Fetching coordinates for city:', city);
          const coordinates = await this.getCityCoordinate(city);
          if (coordinates) {
            app.globalData.cityCoordinates[city] = coordinates;
            // 更新本地缓存
            wx.setStorageSync('cityCoordinates', app.globalData.cityCoordinates);
          }
          // 添加请求间隔，避免频繁请求
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      this.updateMarkers();
    } catch (error) {
      console.error('加载城市坐标失败:', error);
      wx.showToast({
        title: '加载地图数据失败',
        icon: 'error'
      });
    }
  },  // 添加逗号

  async getCityCoordinate(cityName) {
    try {
      const { getCityLocation } = require('../../utils/request')
      const response = await getCityLocation(cityName)
      
      if (!response || !response.geocodes || !response.geocodes[0]) {
        console.error('Invalid response for city:', cityName, response)
        return null
      }

      const location = response.geocodes[0].location.split(',')
      return {
        latitude: parseFloat(location[1]),
        longitude: parseFloat(location[0])
      }
    } catch (error) {
      console.error('获取城市坐标失败:', error)
      return null
    }
  },

  updateMarkers() {
    const cities = app.globalData.cities
    const markers = []
    const includePoints = []

    cities.forEach((city, index) => {
      const coordinates = app.globalData.cityCoordinates[city]
      if (coordinates) {
        markers.push({
          id: index,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          title: city,
          width: 1,  // 最小化默认标记
          height: 1,
          alpha: 0,  // 使默认标记完全透明
          anchor: {x: 0.5, y: 1},
          callout: {
            content: city,
            color: '#666666',
            fontSize: 13,
            borderRadius: 4,
            bgColor: '#ffffff',
            padding: '4 8',
            display: 'ALWAYS',
            textAlign: 'center',
            borderWidth: 0,
            anchorY: 0,
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
          },
          label: {
            content: '●',
            color: 'rgba(25, 118, 210, 0.75)',
            fontSize: 22,
            anchorX: -6,
            anchorY: -3,
            borderWidth: 2,
            borderColor: '#ffffff',
            borderRadius: 50,
            textAlign: 'center'
          }
        })

        includePoints.push({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        })
      }
    })

    this.setData({ 
      markers, 
      includePoints 
    }, () => {
      console.log('Markers updated:', markers);  // 添加日志
    })
  },

  generateRoutes(activeFlights) {
    const routes = activeFlights.map(flight => {
      const fromMarker = this.data.markers.find(m => m.title === '深圳')
      const toMarker = this.data.markers.find(m => m.title === flight.city)
      
      if (!fromMarker || !toMarker) return null

      return {
        points: [{
          latitude: fromMarker.latitude,
          longitude: fromMarker.longitude
        }, {
          latitude: toMarker.latitude,
          longitude: toMarker.longitude
        }],
        color: '#1976d2',
        width: 2,
        arrowLine: true
      }
    }).filter(Boolean)

    this.setData({
      polylines: routes,
      loading: false,
      mapReady: true
    })
  },

  handleMarkerTap(e) {
    const { markerId } = e.detail
    const app = getApp()
    const currentDate = this.formatDate(new Date())
    
    const cityFlights = app.globalData.flights
      .filter(f => f.city === markerId && f.depDate >= currentDate)
      .reduce((acc, flight) => {
        const key = `${flight.depDate}-${flight.retDate}`
        if (!acc[key] || acc[key].timestamp < flight.timestamp) {
          acc[key] = flight
        }
        return acc
      }, {})

    const uniqueFlights = Object.values(cityFlights)
      .sort((a, b) => a.price - b.price)

    if (uniqueFlights.length > 0) {
      this.setData({
        selectedCity: markerId,
        cityFlights: uniqueFlights,
        dialogVisible: true
      })
    }
  },

  formatDate(date) {
    return date.toISOString().split('T')[0]
  },

  markertap(e) {
    console.log('Marker tapped:', e);  // 添加调试日志
    const marker = this.data.markers.find(m => m.id === e.markerId);
    if (marker) {
      // 过滤当前日期之后的航班
      const currentDate = this.formatDate(new Date());
      const cityFlights = app.globalData.flights
        .filter(f => f.city === marker.title && f.depDate >= currentDate)
        .reduce((acc, flight) => {
          const key = `${flight.depDate}-${flight.retDate}`;
          if (!acc[key] || acc[key].timestamp < flight.timestamp) {
            acc[key] = flight;
          }
          return acc;
        }, {});

      // 将对象转换回数组并按价格排序
      const uniqueFlights = Object.values(cityFlights)
        .sort((a, b) => a.price - b.price);

      this.setData({
        selectedCity: {
          name: marker.title,
          flights: uniqueFlights
        },
        showCityFlights: true
      });
    }
  },

  closeCityFlights() {
    this.setData({
      showCityFlights: false,
      selectedCity: null
    });
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
  }
});