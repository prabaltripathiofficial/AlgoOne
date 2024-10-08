import { useMemo, useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Slider, 
  Select, 
  MenuItem, 
  FormControl,
  useTheme,
  useMediaQuery
} from "@mui/material";
import "./App.css";
import axios from 'axios';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';

function App() {
  const [rawData, setRawData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sliderValue, setSliderValue] = useState(10);
  const [pageSize, setPageSize] = useState(10);
  const [previewRowCount, setPreviewRowCount] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const [inOutMoneyFilter, setInOutMoneyFilter] = useState('');
  const [maxReturnMaxRisk, setMaxReturnMaxRisk] = useState(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const STRIKE_THRESHOLD = 214.29;

  const calculateTableHeight = (rows) => {
    const ROW_HEIGHT = 40;
    const HEADER_HEIGHT = 56;
    const PADDING = 20;
    return (rows * ROW_HEIGHT) + HEADER_HEIGHT + PADDING;
  };

  const InOutMoneyFilter = ({ header }) => {
    const { column } = header;

    return (
      <FormControl variant="standard" size="small" sx={{ minWidth: 120 }}>
        <Select
          value={column.getFilterValue() ?? ''}
          onChange={(e) => {
            column.setFilterValue(e.target.value);
            setInOutMoneyFilter(e.target.value);
            updateDisplayData(rawData, sliderValue, e.target.value);
          }}
          displayEmpty
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="in">In</MenuItem>
          <MenuItem value="out">Out</MenuItem>
        </Select>
      </FormControl>
    );
  };

  const applyInOutMoneyFilter = (data, filterValue) => {
    if (!filterValue) return data;
    return data.filter(row => {
      if (filterValue === 'in') return row.percent_in_out_money >= 0;
      if (filterValue === 'out') return row.percent_in_out_money < 0;
      return true;
    });
  };

  const filterData = (data, rowCount, inOutFilter) => {
    if (!data || data.length === 0) return [];

    const filteredByInOut = applyInOutMoneyFilter(data, inOutFilter);
    
    if (filteredByInOut.length === 0) return [];

    const actualRowCount = Math.min(rowCount, filteredByInOut.length);
    const halfCount = Math.floor(actualRowCount / 2);

    const higherStrikes = filteredByInOut
      .filter(row => row.strike > STRIKE_THRESHOLD)
      .sort((a, b) => a.strike - b.strike)
      .slice(0, halfCount);

    const lowerStrikes = filteredByInOut
      .filter(row => row.strike <= STRIKE_THRESHOLD)
      .sort((a, b) => b.strike - a.strike)
      .slice(0, halfCount);

    // let remainingCount = actualRowCount - (higherStrikes.length + lowerStrikes.length);
    // let extraRows = [];
    
    // if (remainingCount > 0) {
    //   const extraHigher = filteredByInOut
    //     .filter(row => row.strike > STRIKE_THRESHOLD)
    //     .sort((a, b) => a.strike - b.strike)
    //     .slice(higherStrikes.length, higherStrikes.length + remainingCount);
      
    //   const extraLower = filteredByInOut
    //     .filter(row => row.strike <= STRIKE_THRESHOLD)
    //     .sort((a, b) => b.strike - a.strike)
    //     .slice(lowerStrikes.length, lowerStrikes.length + (remainingCount - extraHigher.length));
      
    //   extraRows = [...extraHigher, ...extraLower];
    // }

    return [...higherStrikes, ...lowerStrikes]
      .sort((a, b) => a.strike - b.strike);
  };

  const updateDisplayData = (data, rowCount, inOutFilter) => {
    const newDisplayData = filterData(data, rowCount, inOutFilter);
    setDisplayData(newDisplayData);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('https://frontendassignment-algo-one.netlify.app/table_data');
      setRawData(response.data);
      const maxValue = Math.max(...response.data.map(item => item.percent_return_1_sigma_max_risk));
      setMaxReturnMaxRisk(maxValue);
      updateDisplayData(response.data, sliderValue, inOutMoneyFilter);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    updateDisplayData(rawData, sliderValue, inOutMoneyFilter);
  }, [rawData, sliderValue, inOutMoneyFilter]);

  const handleSliderChange = (event, value) => {
    setSliderValue(value);
    setPreviewRowCount(value);
    if (!isDragging) {
      setPageSize(value);
    }
  };

  const handleSliderMouseDown = () => {
    setIsDragging(true);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
    setPageSize(sliderValue);
  };

  const getColorForPercentage = (percentage) => {
    if (percentage <= 10) return '#FF5252';
    if (percentage <= 50) return '#FFEB3B';
    return '#4CAF50';
  };


  const columns = useMemo(() => [
    { 
      accessorKey: "strike", 
      header: "Strike",
      size: 100,
      Cell: ({ cell }) => cell.getValue().toFixed(2)
    },
    { 
      accessorKey: "percent_in_out_money", 
      header: "% In/Out Money",
      Filter: ({ column }) => (
        <FormControl variant="standard" size="small" sx={{ minWidth: 120 }}>
          <Select
            value={column.getFilterValue() ?? ''}
            onChange={(e) => {
              column.setFilterValue(e.target.value);
              setInOutMoneyFilter(e.target.value);
            }}
            displayEmpty
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="in">In</MenuItem>
            <MenuItem value="out">Out</MenuItem>
          </Select>
        </FormControl>
      ),
      filterFn: (row, id, filterValue) => {
        if (!filterValue) 
          return true;
        if (filterValue === 'in') 
          return row.getValue(id) >= 0;
        if (filterValue === 'out') 
          return row.getValue(id) < 0;
        return true;
      },
      enableColumnFilter: true,
      size: 150,
      Cell: ({ cell }) => (
        <Box
          sx={{
            backgroundColor: cell.getValue() >= 0 ? '#FFF5E6' : '#FFFBE6',
            color: cell.getValue() >= 0 ? '#FF9800' : '#FFC107',
            borderRadius: '4px',
            padding: '4px 8px',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin:'0px',
          }}
        >
          {cell.getValue().toFixed(2)}
        </Box>
      ),
    },
    { accessorKey: "percent_max_risk", header: "% Max Risk", size: 120,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "percent_cost_to_insure", header: "% Cost To Insure", size: 150,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "sigma_break_even", header: "Sigma Break Even", size: 150,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "percent_to_dbl", header: "% To Dbl", size: 120,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "prob_above", header: "Prob Above", size: 120,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "opt_mid_price", header: "Opt Mid Price", size: 120,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "percent_ask_time_value", header: "% Ask Time Value", size: 150,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "delta", header: "Delta", size: 100,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "opt_open_int", header: "Opt Open Int", size: 120 ,
      Cell: ({ cell }) => cell.getValue().toFixed(2)},
    { accessorKey: "black_scholes_ratio_siv", header: "Black Scholes Ratio (SIV)", size: 200,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "black_scholes_ratio_50_day", header: "Black Scholes Ratio (50 Day)", size: 200,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { accessorKey: "iv_hv", header: "IV/HV", size: 100 },
    { accessorKey: "percent_bid_ask_spread", header: "$ BA Spread", size: 120,
      Cell: ({ cell }) => cell.getValue().toFixed(2) },
    { 
      accessorKey: "percent_return_1_sigma_max_risk", 
      header: "%Return 1σ/%Max Risk", 
      size: 150,
      Cell: ({ cell }) => {
        const value = cell.getValue();
        const percentage = (value / maxReturnMaxRisk) * 100;
        const color = getColorForPercentage(percentage);
        cell.getValue().toFixed(2);
        
        return (
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${percentage}%`,
              backgroundColor: color,
              opacity: 0.3,
            }} />
            <Typography sx={{ 
              position: 'relative', 
              zIndex: 1, 
              width: '100%',
              textAlign: 'right',
              pr: 1,
            }}>
              {value.toFixed(2)}
            </Typography>
          </Box>
        );
      },
    },
  ],[maxReturnMaxRisk]);

  const table = useMaterialReactTable({
    columns: columns,
    data: displayData,
    state: {
      isLoading: isLoading,
      density: 'compact',
      showColumnFilters: true,
      pagination: {
        pageSize: pageSize,
        pageIndex: 0,
      },
    },
    initialState: { 
      showColumnFilters: true,
      density: 'compact',
      pagination: {
        pageSize: pageSize,
      },
    },
    enableFilters: true,
    enableColumnFilters: true,
    enableGlobalFilter: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableStickyHeader: true,
    enableStickyFooter: true,
    muiTableContainerProps: {
      sx: {
        height: `${calculateTableHeight(pageSize)}px`,
        transition: 'height 0.2s ease',
        border: 'solid #B7B7B7 2px',
      }
    },
    enableHiding: false,
    enablePagination: false,
    enableColumnResizing: true,
    layoutMode: 'grid',
    muiTablePaperProps: {
      sx: {
        '& .MuiTable-root': {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: isMobile ? '0.75rem' : '0.875rem',
        padding: '4px 8px',
        border: '1px solid #e0e0e0',
        borderTop: 'none',
        borderLeft: 'none',
        '&:last-child': {
          borderRight: 'none',
        },
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontSize: isMobile ? '0.8rem' : '0.9rem',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#0F172A',
        border: '1px solid #1a2d4d',
        borderTop: 'none',
        borderLeft: 'none',
        height: 'auto',
        minHeight: '100px',
        whiteSpace: 'normal',

        '& .Mui-TableHeadCell-Content': {
          whiteSpace: 'normal',
        },
        '& .Mui-TableHeadCell-Content-Labels': {
          whiteSpace: 'normal',
        },
        '& .Mui-TableHeadCell-Content-Actions': {
          color: 'white',
        },
        '& .MuiTableSortLabel-icon': {
          color: 'white !important',
        },
        '& .MuiSelect-select': {
          color: 'white',
        },
        '& .MuiSelect-icon': {
          color: 'white',
        },
        '& .MuiInputBase-root': {
          color: 'white',
        },
        '& .MuiInput-underline:before': {
          borderBottomColor: 'white',
        },
        '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
          borderBottomColor: 'white',
        },
        '& .MuiIconButton-root': {
          color: 'white',
        },
        '& .MuiSvgIcon-root': {
          color: 'white',
        },
      },
    },
    muiFilterTextFieldProps: {
      sx: {
        '& .MuiInputBase-input': {
          color: 'white',
        },
        '& .MuiInputLabel-root': {
          color: 'white',
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'white',
        },
      },
      variant: 'standard',
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        backgroundColor: row.index % 2 === 0 ? '#EFEFEF' : '#F5F5F5',
        '&:last-child td': {
          borderBottom: 'none',
        },
      },
    }),
  });

  return (
    <Container maxWidth={false} sx={{ py: 5 }}>
      <Box sx={{ 
        width: '100%',
        maxWidth: '200px', 
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <Typography variant="body2" color="text.secondary">
          {isDragging ? `Preview: ${previewRowCount} rows` : `Showing ${displayData.length} rows`}
        </Typography>
        <Slider
          value={sliderValue}
          onChange={handleSliderChange}
          onMouseDown={handleSliderMouseDown}
          onMouseUp={handleSliderMouseUp}
          min={0}
          max={30}
          step={2}
          marks
          valueLabelDisplay="auto"
          sx={{ width: '100%' }}
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ color: '#0F172A', display: 'inline' }}>
          Apple Inc. (AAPL) $ 214.29
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#962121', ml: 1 }}>
          ($ -2.38) -1.1%
        </Typography>
      </Box>
      <Box sx={{ overflowX: 'auto', width: '100%' }}>
        <MaterialReactTable table={table} />
      </Box>
    </Container>
  );
}

export default App;