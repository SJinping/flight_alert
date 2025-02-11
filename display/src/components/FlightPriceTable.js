import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
// import { Amap, Polyline, Marker } from '@amap/amap-react';
import { Map, Marker, Polyline } from '@uiw/react-amap';
import dayjs from 'dayjs';

// 在组件顶部添加安全配置
window._AMapSecurityConfig = {
  securityJsCode: process.env.REACT_APP_AMAP_SECURITY_CODE
};

const FlightPriceTable = () => {
  const [selectedCityFlights, setSelectedCityFlights] = useState([]);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [selectedCityName, setSelectedCityName] = useState('');
  const [flights, setFlights] = useState([]);
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [cities, setCities] = useState([]);
  const [viewType, setViewType] = useState('table');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateFlights, setDateFlights] = useState([]);
  const [cityCoordinates, setCityCoordinates] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const REACT_APP_AMAP_KEY = process.env.REACT_APP_AMAP_KEY
  
  // 添加获取城市坐标的函数
  const getCityCoordinate = useCallback(async (cityName) => {
    if (cityCoordinates[cityName]) {
      return cityCoordinates[cityName];
    }

    try {
      const response = await fetch(
        `https://restapi.amap.com/v3/geocode/geo?address=${cityName}&key=${REACT_APP_AMAP_KEY}&output=JSON`
      );
      const data = await response.json();
      
      if (data.status === '1' && data.geocodes.length > 0) {
        const [lng, lat] = data.geocodes[0].location.split(',');
        const coordinates = [Number(lng), Number(lat)];
        setCityCoordinates(prev => ({
          ...prev,
          [cityName]: coordinates
        }));
        return coordinates;
      }
    } catch (error) {
      console.error('获取城市坐标失败:', error);
    }
    return null;
  }, [REACT_APP_AMAP_KEY, cityCoordinates]);

  // 使用 useCallback 包装 fetchActiveRoutes
  const fetchActiveRoutes = useCallback(async () => {
    setLoading(true);
    const currentDate = dayjs().format('YYYY-MM-DD');
    const activeFlights = flights.filter(f => f.depDate >= currentDate);
    
    const cities = ['深圳', ...new Set(activeFlights.map(f => f.city))];
    await Promise.all(cities.map(city => getCityCoordinate(city)));
    
    const routes = activeFlights.map(f => ({
      from: '深圳',
      to: f.city,
      price: f.price
    }));
    
    setActiveRoutes(routes);
    setLoading(false);
  }, [flights, getCityCoordinate]); // 添加依赖项

  // 添加 useEffect 来在视图类型改变时获取路线
  useEffect(() => {
    if (viewType === 'map') {
      fetchActiveRoutes();
    }
  }, [viewType, fetchActiveRoutes]);

  useEffect(() => {
    // 在实际应用中，这里应该是从后端API获取数据
    fetch('/price_log.txt')
      .then(response => response.text())
      .then(data => {
        const parsedFlights = data
          .split('\n')
          .filter(line => line.trim())
          .map((line, index) => {
            const [city, depDate, retDate, price, timestamp] = line.split(',');
            return {
              id: index,
              city,
              depDate: dayjs(depDate).format('YYYY-MM-DD'),
              retDate: dayjs(retDate).format('YYYY-MM-DD'),
              price: Number(price),
              timestamp: Number(timestamp.trim())
            };
          });
        setFlights(parsedFlights);
        setFilteredFlights(parsedFlights);
        
        // 提取所有不重复的城市
        const uniqueCities = [...new Set(parsedFlights.map(f => f.city))];
        setCities(uniqueCities.sort());
      });
  }, []);

  // 处理筛选
  useEffect(() => {
    let filtered = [...flights];
    
    if (selectedCity) {
      filtered = filtered.filter(f => f.city === selectedCity);
    }
    
    if (priceRange.min) {
      filtered = filtered.filter(f => f.price >= Number(priceRange.min));
    }
    
    if (priceRange.max) {
      filtered = filtered.filter(f => f.price <= Number(priceRange.max));
    }
    
    setFilteredFlights(filtered);
  }, [selectedCity, priceRange, flights]);

  const columns = [
    { field: 'city', headerName: '目的地', width: 120 },
    { field: 'depDate', headerName: '出发日期', width: 120 },
    { field: 'retDate', headerName: '返程日期', width: 120 },
    { field: 'price', headerName: '价格(￥)', width: 100 },
    { 
      field: 'timestamp', 
      headerName: '更新时间', 
      width: 180,
      valueFormatter: (params) => {
        return dayjs(params.value).format('YYYY-MM-DD');
      },
    },
  ];

  // 处理日历日期点击
  const handleDateClick = (date) => {
    const flightsOnDate = flights.filter(f => f.depDate === dayjs(date).format('YYYY-MM-DD'));
    if (flightsOnDate.length > 0) {
      setDateFlights(flightsOnDate);
      setDialogOpen(true);
    }
  };

  // 获取有航班的日期
  const hasFlights = (date) => {
    const formattedDate = dayjs(date).format('YYYY-MM-DD');
    return flights.some(f => f.depDate === formattedDate);
  };

const [mapReady, setMapReady] = useState(false);
const [mapError, setMapError] = useState(null);

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        深圳牛马特种兵旅游专线
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={viewType} 
          onChange={(_event, newValue) => setViewType(newValue)} 
          aria-label="view tabs"
          sx={{ mb: 2 }}
        >
          <Tab value="table" label="表格视图" id="tab-table" />
          <Tab value="calendar" label="日历视图" id="tab-calendar" />
          <Tab value="map" label="地图视图" id="tab-map" />
        </Tabs>
      </Box>
      
      {viewType === 'table' ? (
        <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ width: 200 }}>
          <InputLabel>选择目的地</InputLabel>
          <Select
            value={selectedCity}
            label="选择目的地"
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <MenuItem value="">全部城市</MenuItem>
            {cities.map(city => (
              <MenuItem key={city} value={city}>{city}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <TextField
          label="最低价格"
          type="number"
          value={priceRange.min}
          onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
          sx={{ width: 150 }}
        />
        
        <TextField
          label="最高价格"
          type="number"
          value={priceRange.max}
          onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
          sx={{ width: 150 }}
        />
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredFlights}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10]}
          disableSelectionOnClick
          sortModel={[
            {
              field: 'timestamp',  // 修改这里，使用 timestamp 而不是 updateTime
              sort: 'desc'
            },
            {
              field: 'price',
              sort: 'asc'
            }
          ]}
        />
      </Paper>
      </>
      ) : viewType === 'calendar' ? (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Paper 
            sx={{ 
              p: 3,
              maxWidth: 400,
              margin: '0 auto',
              borderRadius: 2,
              boxShadow: 3
            }}
          >
            <DateCalendar 
              onChange={handleDateClick}
              shouldDisableDate={(date) => !hasFlights(date)}
              sx={{
                width: '100%',
                '& .MuiPickersDay-root': {
                  borderRadius: '50%',
                  '&:not(.Mui-disabled)': {
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: '#90caf9',
                    }
                  }
                },
                '& .MuiDayCalendar-weekDayLabel': {
                  color: '#1976d2',
                  fontWeight: 'bold'
                },
                '& .MuiPickersCalendarHeader-root': {
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  marginBottom: 1,
                  padding: 1
                }
              }}
            />
          </Paper>
        </LocalizationProvider>
      ) : (
        <Paper sx={{ height: 600, width: '100%', overflow: 'hidden', position: 'relative' }}>
    {(loading || !mapReady) && (
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
      }}>
        {loading ? '加载中...' : '地图初始化中...'}
      </Box>
    )}
    
    {mapError && (
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'error.main',
        zIndex: 1000
      }}>
        地图加载失败：{mapError}
      </Box>
    )}

    {REACT_APP_AMAP_KEY && !mapError && (
      <Map 
        amapkey={REACT_APP_AMAP_KEY}
        zoom={5}
        center={[114.085947, 22.547]}
        mapStyle="amap://styles/whitesmoke"
        onComplete={() => setMapReady(true)}
        onError={(error) => setMapError(error.message)}
      >
      {mapReady && Object.entries(cityCoordinates).map(([city, coordinates]) => {
        
        return (
          <Marker
        key={city}
        position={coordinates}
        label={{
          content: city,
          direction: 'top'
        }}
        clickable={true}
        onClick={() => {
          const currentDate = dayjs().format('YYYY-MM-DD');
          const futureFlights = flights
            .filter(f => f.city === city && f.depDate >= currentDate)
            .sort((a, b) => a.price - b.price);
          
          if (futureFlights.length > 0) {
            setSelectedCityFlights(futureFlights);
            setSelectedCityName(city);
            setCityDialogOpen(true);
          }
        }}
      />
        );
      })}
    
    {mapReady && activeRoutes.map((route, index) => {
      const fromCoord = cityCoordinates['深圳'];
      const toCoord = cityCoordinates[route.to];
      if (!fromCoord || !toCoord) return null;
      
      // 计算贝塞尔曲线的控制点
      const dx = toCoord[0] - fromCoord[0];
      const dy = toCoord[1] - fromCoord[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 调整控制点计算方式
      const heightFactor = distance * 0.15; // 降低高度系数
      const midPoint = [
        (fromCoord[0] + toCoord[0]) / 2,
        (fromCoord[1] + toCoord[1]) / 2
      ];
      const controlPoint = [
        midPoint[0], // 控制点 x 坐标保持在中点
        midPoint[1] + heightFactor // 控制点 y 坐标基于中点向上偏移
      ];
  
      // 生成更密集的贝塞尔曲线点以使曲线更平滑
      const points = [];
      for (let t = 0; t <= 1; t += 0.02) { // 减小步长，使曲线更平滑
        const x = Math.pow(1 - t, 2) * fromCoord[0] + 
                  2 * (1 - t) * t * controlPoint[0] + 
                  Math.pow(t, 2) * toCoord[0];
        const y = Math.pow(1 - t, 2) * fromCoord[1] + 
                  2 * (1 - t) * t * controlPoint[1] + 
                  Math.pow(t, 2) * toCoord[1];
        points.push([x, y]);
      }
      
      return (
        <Polyline
          key={index}
          path={points}
          strokeColor="#1976d2"
          strokeWeight={3}
          strokeStyle="solid"
          showDir={true}
          geodesic={false}
          lineJoin="round"
          lineCap="round"
          borderWeight={1}
          isOutline={true}
          outlineColor="rgba(255, 255, 255, 0.6)"
          extData={route}
          events={{
            click: (e) => {
              const routeData = e.target.getExtData();
              alert(`${routeData.from} -> ${routeData.to}\n价格：￥${routeData.price}`);
            }
          }}
        />
      );
    })}
    </Map>
    )}
  </Paper>
      )}

<Dialog open={cityDialogOpen} onClose={() => setCityDialogOpen(false)} maxWidth="md">
        <DialogTitle>{selectedCityName}航班信息</DialogTitle>
        <DialogContent>
          <List>
            {selectedCityFlights.map((flight, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`￥${flight.price}`}
                  secondary={`出发：${flight.depDate} 返回：${flight.retDate}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

<Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md">
        <DialogTitle>航班信息</DialogTitle>
        <DialogContent>
          <List>
            {dateFlights.map((flight, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`${flight.city} - ￥${flight.price}`}
                  secondary={`出发：${flight.depDate} 返回：${flight.retDate}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FlightPriceTable;