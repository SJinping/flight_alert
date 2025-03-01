const env = {
  development: {
    baseUrl: 'http://localhost:3000',
    amapKey: '你的开发环境高德地图key'
  },
  production: {
    baseUrl: 'https://your-production-domain',
    amapKey: '你的生产环境高德地图key'
  }
}

const currentEnv = 'development'

module.exports = {
  ...env[currentEnv],
  env: currentEnv
}