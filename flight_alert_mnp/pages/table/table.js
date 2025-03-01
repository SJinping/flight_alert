Page({
  data: {
    flights: [],
    filteredFlights: [],
    displayedFlights: [],
    cities: [],
    selectedCity: '',
    minPrice: '',
    maxPrice: '',
    sortField: 'price',
    sortOrder: 'asc',
    pageSize: 20,
    currentPage: 1,
    hasMore: true,
    isLoading: false,
    citiesDebug: '',
    showCityDropdown: false  // 添加控制下拉菜单显示的变量
  },

  onLoad() {
    // 设置初始加载状态
    this.setData({
      loading: true,
      selectedCity: '',  // 确保初始状态为空，显示全部城市
      sortField: 'price',  // 默认按价格排序
      sortOrder: 'asc',    // 默认升序
      cities: ['全部城市']
    });
    
    this.restoreFilters();
    
    const app = getApp();
    
    if (!app.globalData.flights || app.globalData.flights.length === 0) {
      app.flightDataReadyCallback = () => {
        this.initializeTableData(app.globalData.flights);
      };
    } else {
      this.initializeTableData(app.globalData.flights);
    }
  },

  onShow() {
    console.log('table page showed');
    const app = getApp();
    const favorites = wx.getStorageSync('favorites') || [];
    
    this.initializeData(app, favorites);
  },

  initializeData(app, favorites) {
    console.log('Initializing data...');
    console.log('App global data:', app.globalData);
    
    if (app.globalData.flights && app.globalData.flights.length > 0) {
      
      const processed = this.processFlights(app.globalData.flights);
      
      this.setData({
        flights: app.globalData.flights,
        filteredFlights: processed,
        displayedFlights: [],
        cities: app.globalData.cities || [],
        favorites,
        currentPage: 1,
        hasMore: true
      }, () => {
        // console.log('After setData:');
        // console.log('flights length:', this.data.flights.length);
        // console.log('filteredFlights length:', this.data.filteredFlights.length);
        // console.log('cities:', this.data.cities);
        this.loadPageData();
      });
    } else {
      console.log('No flights data available, waiting for callback');
      app.flightDataReadyCallback = () => {
        console.log('Callback triggered with data:', app.globalData.flights);
        this.initializeData(app, favorites);
      };
    }
  },

  processFlights(flights) {
    if (!flights || !Array.isArray(flights)) {
      console.log('Invalid flights data:', flights);
      return [];
    }

    // 获取当前日期，格式化为 YYYYMMDD
    const today = new Date();
    const todayStr = today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    
    console.log('Today formatted:', todayStr);
    console.log('Total flights before filtering:', flights.length);

    // 1. 首先过滤掉过期航班
    let processed = flights.filter(flight => {
      const depDateStr = flight.depDate.replace(/-/g, '');
      return depDateStr >= todayStr;
    });
    
    console.log('Flights after date filtering:', processed.length);

    // 2. 按城市和日期分组，只保留最新记录
    const flightMap = new Map();
    processed.forEach(flight => {
      const key = `${flight.city}-${flight.depDate}-${flight.retDate}`;
      const existing = flightMap.get(key);
      
      // 如果是新记录或比现有记录更新，则更新 Map
      if (!existing || (existing.updateTime < flight.updateTime)) {
        flightMap.set(key, flight);
      }
    });

    // 将 Map 转回数组
    processed = Array.from(flightMap.values());
    console.log('Flights after deduplication:', processed.length);

    // 3. 应用其他过滤条件
    if (this.data.selectedCity && this.data.selectedCity !== '全部城市') {
      processed = processed.filter(f => f.city === this.data.selectedCity);
      console.log('Flights after city filtering:', processed.length);
    }
    
    if (this.data.minPrice) {
      processed = processed.filter(f => f.price >= Number(this.data.minPrice));
    }
    if (this.data.maxPrice) {
      processed = processed.filter(f => f.price <= Number(this.data.maxPrice));
    }

    // 4. 应用排序
    if (this.data.sortField) {
      processed.sort((a, b) => {
        if (this.data.sortField === 'price') {
          return this.data.sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
        } else if (this.data.sortField === 'depDate') {
          const dateA = new Date(a.depDate);
          const dateB = new Date(b.depDate);
          return this.data.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
    }

    return processed;
  },

  loadPageData() {
    if (this.data.isLoading || !this.data.hasMore) return;

    this.setData({ isLoading: true });

    const start = (this.data.currentPage - 1) * this.data.pageSize;
    const end = start + this.data.pageSize;
    const newItems = this.data.filteredFlights.slice(start, end);

    if (newItems.length > 0) {
      this.setData({
        displayedFlights: [...this.data.displayedFlights, ...newItems],
        currentPage: this.data.currentPage + 1,
        hasMore: end < this.data.filteredFlights.length,
        isLoading: false
      });
    } else {
      this.setData({
        hasMore: false,
        isLoading: false
      });
    }
  },

  handleCityChange(e) {
    const index = e.detail.value;
  const cityName = this.data.cities[index]; // 根据索引获取实际的城市名称
  
  console.log('选择的城市索引:', index);
  console.log('选择的城市名称:', cityName);
  
  this.setData({
    selectedCity: cityName,  // 设置为城市名称而不是索引
    displayedFlights: [],    // 清空当前显示的航班
    currentPage: 1,
    hasMore: true
  }, () => {
    this.handleFilter();     // 重新筛选数据
  });
  },

  handlePriceInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value
    }, this.handleFilter);
  },

  handleFilter() {
    const processed = this.processFlights(this.data.flights);
    this.setData({
      filteredFlights: processed,
      displayedFlights: [],
      currentPage: 1,
      hasMore: true
    }, () => {
      this.loadPageData();
    });
  },

  handleSort(e) {
    const { field } = e.currentTarget.dataset;
    const { sortField, sortOrder } = this.data;
    
    const newOrder = field === sortField && sortOrder === 'asc' ? 'desc' : 'asc';
    
    this.setData({
      sortField: field,
      sortOrder: newOrder
    }, this.handleFilter);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadPageData();
    }
  },

  onPullDownRefresh() {
    // 保存当前的筛选条件
    const currentFilters = {
      selectedCity: this.data.selectedCity,
      minPrice: this.data.minPrice,
      maxPrice: this.data.maxPrice,
      sortField: this.data.sortField,
      sortOrder: this.data.sortOrder
    };
    
    // 重新获取数据
    const app = getApp();
    app.refreshFlightData().then(() => {
      // 恢复筛选条件
      this.setData(currentFilters);
      
      // 使用恢复的筛选条件处理数据
      this.initializeTableData(app.globalData.flights);
      wx.stopPullDownRefresh();
    }).catch(error => {
      console.error('刷新数据失败:', error);
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
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
  },

  saveFilters() {
    // 将当前筛选条件保存到本地存储
    wx.setStorageSync('flightTableFilters', {
      selectedCity: this.data.selectedCity,
      minPrice: this.data.minPrice,
      maxPrice: this.data.maxPrice,
      sortField: this.data.sortField,
      sortOrder: this.data.sortOrder
    });
  },

  restoreFilters() {
    const filters = wx.getStorageSync('flightTableFilters');
    if (filters) {
      this.setData({
        selectedCity: filters.selectedCity || '',
        minPrice: filters.minPrice || '',
        maxPrice: filters.maxPrice || '',
        sortField: filters.sortField || '',
        sortOrder: filters.sortOrder || 'asc'
      });
    }
  },

  // 修改筛选方法，确保保存筛选条件
  filterByCity(e) {
    const index = e.detail.value;
    console.log('Selected city index:', index);
    console.log('Available cities:', this.data.cities);
    
    const selectedCity = this.data.cities[index];
    console.log('Selected city:', selectedCity);
    
    // 如果选择了"全部城市"，则清空筛选条件
    this.setData({
      selectedCity: selectedCity === '全部城市' ? '' : selectedCity
    });
    
    this.saveFilters();
    this.updateTableData();
  },

  filterByPrice() {
    this.saveFilters();
    this.updateTableData();
  },

  sortBy(e) {
    const field = e.currentTarget.dataset.field;
    let order = 'asc';
    
    if (this.data.sortField === field) {
      order = this.data.sortOrder === 'asc' ? 'desc' : 'asc';
    }
    
    this.setData({
      sortField: field,
      sortOrder: order
    });
    
    this.saveFilters();
    this.updateTableData();
  },

  updateTableData() {
    const processed = this.processFlights(this.data.flights);
    this.setData({
      filteredFlights: processed,
      displayedFlights: [],
      currentPage: 1,
      hasMore: true
    }, () => {
      this.loadPageData();
    });
  },

  initializeTableData(flights) {
    if (!flights || !Array.isArray(flights)) {
      console.log('Invalid flights data:', flights);
      return;
    }

    console.log('Initializing table data with', flights.length, 'flights');

    // 提取所有城市并去重
    const cities = [...new Set(flights.map(flight => flight.city))];
    // 确保城市按字母顺序排序
    cities.sort();
    
    console.log('Available cities:', cities);
    
    // 处理航班数据
    const filteredFlights = this.processFlights(flights);
    
    console.log('Filtered flights count:', filteredFlights.length);
    
    this.setData({
      flights: flights,
      filteredFlights: filteredFlights,
      cities: cities,
      loading: false
    });
  },

  // 修改切换下拉菜单显示的方法，添加日志
  toggleCityDropdown() {
    console.log('Toggle dropdown clicked, current state:', this.data.showCityDropdown);
    this.setData({
      showCityDropdown: !this.data.showCityDropdown
    });
    console.log('Dropdown state after toggle:', this.data.showCityDropdown);
  },

  // 修改选择城市的方法，添加日志
  selectCity(e) {
    const city = e.currentTarget.dataset.city;
    console.log('City selected:', city);
    
    this.setData({
      selectedCity: city,
      showCityDropdown: false
    });
    
    this.saveFilters();
    this.updateTableData();
  }
});