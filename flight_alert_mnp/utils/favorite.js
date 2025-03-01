const getFavorites = () => {
  return wx.getStorageSync('favorites') || []
}

const addFavorite = (flight) => {
  const favorites = getFavorites()
  const exists = favorites.some(f => 
    f.city === flight.city && 
    f.depDate === flight.depDate && 
    f.retDate === flight.retDate
  )

  if (!exists) {
    favorites.push(flight)
    wx.setStorageSync('favorites', favorites)
    return true
  }
  return false
}

const removeFavorite = (flight) => {
  let favorites = getFavorites()
  favorites = favorites.filter(f => 
    !(f.city === flight.city && 
      f.depDate === flight.depDate && 
      f.retDate === flight.retDate)
  )
  wx.setStorageSync('favorites', favorites)
}

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite
}