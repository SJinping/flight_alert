const EventBus = {
  listeners: {},

  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = new Set()
    }
    this.listeners[eventName].add(callback)
  },

  off(eventName, callback) {
    if (!this.listeners[eventName]) return
    if (!callback) {
      delete this.listeners[eventName]
    } else {
      this.listeners[eventName].delete(callback)
    }
  },

  emit(eventName, data) {
    if (!this.listeners[eventName]) return
    this.listeners[eventName].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`EventBus error in ${eventName}:`, error)
      }
    })
  }
}

module.exports = EventBus