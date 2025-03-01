Component({
  properties: {
    spot: {
      type: Array,
      value: []
    },
    selected: {
      type: String,
      value: ''
    },
    spotColor: {
      type: String,
      value: '#1976d2'
    }
  },

  data: {
    days: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  },

  lifetimes: {
    attached() {
      this.generateCalendar()
    }
  },

  observers: {
    'spot': function() {
      this.generateCalendar()
    }
  },

  methods: {
    generateCalendar() {
      const { year, month } = this.data
      const days = []
      
      // 打印接收到的 spot 数组
      console.log('Spot dates:', this.properties.spot)
      
      // 获取当月第一天是星期几
      const firstDay = new Date(year, month - 1, 1).getDay()
      // 获取当月天数
      const daysInMonth = new Date(year, month, 0).getDate()
      
      // 补充上月天数
      for (let i = 0; i < firstDay; i++) {
        days.push({ day: '', disabled: true })
      }
      
      // 添加当月天数
      for (let i = 1; i <= daysInMonth; i++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        // 打印日期比较
        // console.log('Comparing date:', date, 'included:', this.properties.spot.includes(date))
        days.push({
          day: i,
          date,
          hasSpot: this.properties.spot.includes(date)
        })
      }
      
      this.setData({ days })
    },

    handleDayClick(e) {
      const { date } = e.currentTarget.dataset
      if (date) {
        this.triggerEvent('select', { date })
      }
    },

    handlePrevMonth() {
      let { year, month } = this.data
      if (month === 1) {
        year--
        month = 12
      } else {
        month--
      }
      this.setData({ year, month }, () => this.generateCalendar())
    },

    handleNextMonth() {
      let { year, month } = this.data
      if (month === 12) {
        year++
        month = 1
      } else {
        month++
      }
      this.setData({ year, month }, () => this.generateCalendar())
    }
  }
}) 