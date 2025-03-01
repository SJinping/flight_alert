Component({
  properties: {
    cities: {
      type: Array,
      value: []
    },
    selected: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleSelect(e) {
      const { value } = e.detail
      this.triggerEvent('select', { city: this.properties.cities[value] })
    }
  }
})