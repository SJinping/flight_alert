Component({
  properties: {
    validDates: {
      type: Array,
      value: []
    },
    minDate: {
      type: String,
      value: ''
    },
    maxDate: {
      type: String,
      value: ''
    },
    selectedDate: {
      type: String,
      value: ''
    }
  },

  data: {
    weeks: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],
    currentYear: '',
    currentMonth: '',
    currentDate: ''
  },

  lifetimes: {
    attached() {
      const now = new Date()
      this.setData({
        currentYear: now.getFullYear(),
        currentMonth: now.getMonth() + 1,
        currentDate: this.properties.selectedDate || this.formatDate(now)
      })
      this.generateDays()
    }
  },

  methods: {
    formatDate(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },

    isValidDate(dateStr) {
      return this.properties.validDates.includes(dateStr)
    },

    generateDays() {
      const { currentYear, currentMonth } = this.data
      const firstDay = new Date(currentYear, currentMonth - 1, 1)
      const lastDay = new Date(currentYear, currentMonth, 0)
      const days = []
      
      // 填充上个月的日期
      const firstDayWeek = firstDay.getDay()
      const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate()
      for (let i = firstDayWeek - 1; i >= 0; i--) {
        days.push({
          day: prevMonthLastDay - i,
          isCurrentMonth: false,
          isValid: false
        })
      }
      
      // 填充当前月的日期
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        days.push({
          day: i,
          isCurrentMonth: true,
          isValid: this.isValidDate(dateStr),
          isSelected: dateStr === this.data.currentDate
        })
      }
      
      // 填充下个月的日期
      const remainingDays = 42 - days.length // 保持6行
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          day: i,
          isCurrentMonth: false,
          isValid: false
        })
      }
      
      this.setData({ days })
    },

    handlePrevMonth() {
      let { currentYear, currentMonth } = this.data
      if (currentMonth === 1) {
        currentYear--
        currentMonth = 12
      } else {
        currentMonth--
      }
      this.setData({ currentYear, currentMonth }, () => {
        this.generateDays()
      })
    },

    handleNextMonth() {
      let { currentYear, currentMonth } = this.data
      if (currentMonth === 12) {
        currentYear++
        currentMonth = 1
      } else {
        currentMonth++
      }
      this.setData({ currentYear, currentMonth }, () => {
        this.generateDays()
      })
    },

    handleDateSelect(e) {
      const { day, isValid, isCurrentMonth } = e.currentTarget.dataset
      if (!isValid || !isCurrentMonth) return
      
      const dateStr = `${this.data.currentYear}-${String(this.data.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      this.setData({ currentDate: dateStr })
      this.triggerEvent('select', { date: dateStr })
    }
  }
})