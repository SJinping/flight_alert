Component({
  properties: {
    chartData: {
      type: Array,
      value: []
    },
    width: {
      type: Number,
      value: 320
    },
    height: {
      type: Number,
      value: 200
    }
  },

  data: {
    ctx: null
  },

  lifetimes: {
    attached() {
      const query = this.createSelectorQuery()
      query.select('#priceChart')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          
          const dpr = wx.getSystemInfoSync().pixelRatio
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)
          
          this.setData({ ctx }, () => {
            this.drawChart()
          })
        })
    }
  },

  methods: {
    drawChart() {
      const { ctx, chartData } = this.data
      if (!ctx || !chartData.length) return

      // 绘制图表逻辑
      this.drawAxis()
      this.drawLine()
      this.drawPoints()
    }
  }
})