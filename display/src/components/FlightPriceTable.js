import React, { useState, useEffect } from 'react';
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
import dayjs from 'dayjs';

const FlightPriceTable = () => {
  const [flights, setFlights] = useState([]);
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [cities, setCities] = useState([]);
  const [viewType, setViewType] = useState('table'); // 'table' 或 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateFlights, setDateFlights] = useState([]);

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
    const formattedDate = dayjs(date).format('YYYYMMDD');
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

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        牛马特种兵专线
      </Typography>

      <Tabs value={viewType} onChange={(e, newValue) => setViewType(newValue)} sx={{ mb: 2 }}>
        <Tab value="table" label="表格视图" />
        <Tab value="calendar" label="日历视图" />
      </Tabs>
      
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
      ) : (
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
      )}

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