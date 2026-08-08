import { STOCKS_DB, SECTORS_DB } from './data.js';
import {
  populateHistoricalData,
  calculateSMA,
  calculateRSI,
  calculateRelativeStrengthRatings,
  checkVCP,
  evaluateMinerviniTemplate,
  calculateMomentumScore
} from './momentum.js';

// --- APPLICATION STATE ---
const state = {
  activeView: 'watchlist-view',
  watchlist: ['RELIANCE', 'TCS', 'SBIN', 'HAL', 'ZOMATO', 'ASTRA'], // Default stock symbols
  selectedStock: null,
  activeScannerPreset: 'all',
  activeSector: 'TECH',
  sortColumn: 'momentumScore',
  sortAscending: false
};

// --- INITIALIZE APP ---
function init() {
  // 1. Generate full 260-day historical data and calculate O'Neil RS ratings
  calculateRelativeStrengthRatings(STOCKS_DB);

  // 2. Pre-calculate technical indicator values for all stocks
  STOCKS_DB.forEach(stock => {
    populateHistoricalData(stock);
    const history = stock.fullHistory;
    
    // Calculate technical averages
    stock.sma50 = calculateSMA(history, 50);
    stock.sma150 = calculateSMA(history, 150);
    stock.sma200 = calculateSMA(history, 200);
    stock.rsi = calculateRSI(history, 14);
    
    // Calculate custom momentum score and details
    const momData = calculateMomentumScore(stock);
    stock.momentumScore = momData.score;
    stock.volRatio = momData.volRatio;
  });

  // 3. Setup Navigation Event Listeners
  setupNavigation();

  // 4. Setup Watchlist Events
  renderWatchlist();
  renderUpcomingResults();

  // 5. Setup Scanner Events
  setupScanner();
  renderScannerResults();

  // 6. Setup Sector Heatmap Events
  setupSectors();
  renderSectorHeatmap();
  renderSectorConstituents();

  // 7. Setup Search Bar Autocomplete
  setupSearch();

  // 8. Start simulated live market updates
  startMarketTickSimulator();

  // 9. Check results calendar for alerts
  checkUpcomingResultAlerts();

  // 10. Modal close handler
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('stock-details-modal').addEventListener('click', (e) => {
    if (e.target.id === 'stock-details-modal') closeModal();
  });
}

// --- VIEW ROUTING ---
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Toggle nav active state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Hide all views
      document.getElementById('watchlist-view').style.display = 'none';
      document.getElementById('scanner-view').style.display = 'none';
      document.getElementById('sectors-view').style.display = 'none';

      // Show selected view
      const targetView = item.getAttribute('data-view');
      document.getElementById(targetView).style.display = 'flex';
      state.activeView = targetView;

      // Re-render components if needed
      if (targetView === 'watchlist-view') {
        renderWatchlist();
        renderUpcomingResults();
      } else if (targetView === 'scanner-view') {
        renderScannerResults();
      } else if (targetView === 'sectors-view') {
        renderSectorHeatmap();
        renderSectorConstituents();
      }
    });
  });
}

// --- SEARCH ENGINE ---
function setupSearch() {
  const searchInput = document.getElementById('stock-search');
  const searchDropdown = document.getElementById('search-dropdown');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toUpperCase().trim();
    if (!query) {
      searchDropdown.style.display = 'none';
      return;
    }

    const matches = STOCKS_DB.filter(stock => 
      stock.symbol.includes(query) || 
      stock.name.toUpperCase().includes(query)
    );

    if (matches.length === 0) {
      searchDropdown.innerHTML = `<div class="search-result-item" style="color: var(--text-muted);">No stocks found</div>`;
    } else {
      searchDropdown.innerHTML = matches.map(stock => `
        <div class="search-result-item" data-symbol="${stock.symbol}">
          <div class="search-result-info">
            <span class="search-result-symbol">${stock.symbol}</span>
            <span class="search-result-name">${stock.name}</span>
          </div>
          <span class="search-result-price">${stock.currency}${stock.price.toFixed(2)}</span>
        </div>
      `).join('');
    }
    searchDropdown.style.display = 'block';
  });

  // Handle selection from dropdown
  searchDropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.search-result-item');
    if (item && item.dataset.symbol) {
      openDetails(item.dataset.symbol);
      searchInput.value = '';
      searchDropdown.style.display = 'none';
    }
  });

  // Hide search on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchDropdown.style.display = 'none';
    }
  });
}

// --- WATCHLIST COMPONENT ---
function renderWatchlist() {
  const container = document.getElementById('watchlist-container');
  const countSpan = document.getElementById('watchlist-count');
  
  if (state.watchlist.length === 0) {
    container.innerHTML = `
      <div class="empty-watchlist">
        <i class="fa-solid fa-folder-open"></i>
        <p>Your watchlist is currently empty.</p>
        <p style="font-size:12px; color:var(--text-muted);">Search stocks at the top or find momentum leaders in the Scanner to add them here.</p>
      </div>
    `;
    countSpan.textContent = '0 Stocks Active';
    return;
  }

  countSpan.textContent = `${state.watchlist.length} Stock${state.watchlist.length > 1 ? 's' : ''} Active`;
  
  const watchlistStocks = STOCKS_DB.filter(s => state.watchlist.includes(s.symbol));

  container.innerHTML = watchlistStocks.map(stock => {
    const daysToResults = Math.ceil((new Date(stock.upcomingResultDate) - new Date()) / (1000 * 60 * 60 * 24));
    let resultsAlertClass = 'watchlist-card-earning-pill';
    let resultsText = `Results in ${daysToResults}d`;
    if (daysToResults <= 3) {
      resultsAlertClass += ' urgent';
      resultsText = `<i class="fa-solid fa-triangle-exclamation"></i> Results in ${daysToResults}d`;
    }

    const priceChange = stock.price - stock.priceHistory[18]; // 1D change
    const pctChange = (priceChange / stock.priceHistory[18]) * 100;
    const isPositive = pctChange >= 0;

    return `
      <div class="watchlist-stock-card glass" id="watchlist-card-${stock.symbol}">
        <div class="watchlist-card-top">
          <div class="watchlist-card-symbol-block">
            <span class="watchlist-card-symbol" data-symbol="${stock.symbol}">${stock.symbol}</span>
            <span class="watchlist-card-name">${stock.name}</span>
          </div>
          <i class="fa-solid fa-trash-can watchlist-card-remove" data-symbol="${stock.symbol}" title="Remove from Watchlist"></i>
        </div>

        <div class="watchlist-card-price-block" id="watchlist-price-${stock.symbol}">
          <span class="watchlist-card-price">${stock.currency}${stock.price.toFixed(2)}</span>
          <span class="watchlist-card-change ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '▲' : '▼'} ${Math.abs(pctChange).toFixed(2)}%
          </span>
        </div>

        <div class="watchlist-card-bottom">
          <span class="${resultsAlertClass}">${resultsText}</span>
          <span class="watchlist-card-score-pill ${stock.momentumScore >= 75 ? 'high-mom' : ''}">
            Score: ${stock.momentumScore}
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Add click listeners to symbols to open details modal
  container.querySelectorAll('.watchlist-card-symbol').forEach(el => {
    el.addEventListener('click', () => openDetails(el.dataset.symbol));
  });

  // Remove listener
  container.querySelectorAll('.watchlist-card-remove').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromWatchlist(el.dataset.symbol);
    });
  });
}

function renderUpcomingResults() {
  const tbody = document.getElementById('upcoming-results-body');
  
  if (state.watchlist.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); font-size:12px;">Add watchlist stocks to track results calendar</td></tr>`;
    return;
  }

  const watchlistStocks = STOCKS_DB.filter(s => state.watchlist.includes(s.symbol));
  
  // Sort watchlist stocks by result date (closest first)
  watchlistStocks.sort((a, b) => new Date(a.upcomingResultDate) - new Date(b.upcomingResultDate));

  tbody.innerHTML = watchlistStocks.map(stock => {
    const daysToResults = Math.ceil((new Date(stock.upcomingResultDate) - new Date()) / (1000 * 60 * 60 * 24));
    let alertBadge = `<span class="badge" style="background:rgba(255,255,255,0.03); color:var(--text-secondary);">Earnings Season</span>`;
    
    if (daysToResults <= 3) {
      alertBadge = `<span class="badge warning" style="background:rgba(251,191,36,0.15); color:var(--color-warning); border: 1px solid rgba(251,191,36,0.25);">High Catalyst Volatility</span>`;
    }

    return `
      <tr>
        <td>
          <div class="stock-symbol-cell" data-symbol="${stock.symbol}" style="font-weight:700;">${stock.symbol}</div>
          <div style="font-size:10px; color:var(--text-muted);">${stock.name}</div>
        </td>
        <td style="font-family:var(--font-heading); font-weight:600;">
          ${stock.upcomingResultDate}
          <div style="font-size:10px; color:var(--text-muted);">${daysToResults} day${daysToResults > 1 ? 's' : ''} left</div>
        </td>
        <td>${alertBadge}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.stock-symbol-cell').forEach(el => {
    el.addEventListener('click', () => openDetails(el.dataset.symbol));
  });
}

function addToWatchlist(symbol) {
  if (!state.watchlist.includes(symbol)) {
    state.watchlist.push(symbol);
    renderWatchlist();
    renderUpcomingResults();
    checkUpcomingResultAlerts();
    // Update active details modal state if open
    const detailsBtn = document.getElementById('details-watchlist-btn');
    if (detailsBtn && state.selectedStock === symbol) {
      detailsBtn.textContent = 'Remove from Watchlist';
      detailsBtn.classList.add('in-watchlist');
    }
  }
}

function removeFromWatchlist(symbol) {
  state.watchlist = state.watchlist.filter(s => s !== symbol);
  renderWatchlist();
  renderUpcomingResults();
  checkUpcomingResultAlerts();
  // Update active details modal state if open
  const detailsBtn = document.getElementById('details-watchlist-btn');
  if (detailsBtn && state.selectedStock === symbol) {
    detailsBtn.textContent = 'Add to Watchlist';
    detailsBtn.classList.remove('in-watchlist');
  }
}

function checkUpcomingResultAlerts() {
  const badge = document.getElementById('results-alert-badge');
  const badgeText = document.getElementById('results-alert-text');
  
  const urgentStocks = STOCKS_DB.filter(stock => 
    state.watchlist.includes(stock.symbol) &&
    Math.ceil((new Date(stock.upcomingResultDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 3
  );

  if (urgentStocks.length > 0) {
    badgeText.textContent = `${urgentStocks.length} Results Catalyst Alert`;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// --- MOMENTUM SCANNER COMPONENT ---
function setupScanner() {
  // Preset buttons logic
  const presetButtons = document.querySelectorAll('#preset-buttons .preset-btn');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      state.activeScannerPreset = btn.getAttribute('data-preset');
      // Clear custom query input when clicking presets
      document.getElementById('query-input').value = '';
      document.getElementById('query-error').style.display = 'none';
      renderScannerResults();
    });
  });

  // Query executor logic
  const queryBtn = document.getElementById('run-query-btn');
  queryBtn.addEventListener('click', runCustomQuery);
  document.getElementById('query-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') runCustomQuery();
  });
}

function runCustomQuery() {
  const queryText = document.getElementById('query-input').value.trim();
  const errorDiv = document.getElementById('query-error');
  
  if (!queryText) {
    errorDiv.style.display = 'none';
    return;
  }

  // Deactivate preset buttons
  document.querySelectorAll('#preset-buttons .preset-btn').forEach(btn => btn.classList.remove('active'));
  state.activeScannerPreset = 'custom';

  try {
    const filtered = parseAndExecuteQuery(queryText);
    errorDiv.style.display = 'none';
    renderScannerTable(filtered);
  } catch (err) {
    errorDiv.textContent = `Query Error: ${err.message}`;
    errorDiv.style.display = 'block';
  }
}

// Custom screener.in format query builder parser
// E.g., RSI > 60 AND Price > 150 AND PE < 35 AND Volume > 1.5
function parseAndExecuteQuery(queryStr) {
  const clauses = queryStr.split(/\s+AND\s+/i);
  
  return STOCKS_DB.filter(stock => {
    return clauses.every(clause => {
      // Regular expression to parse token operators
      // Supported tokens: RSI, Price, PE, MCAP, Volume, Score, RS, SMA(50), SMA(200)
      const match = clause.match(/^\s*(RSI|Price|PE|MCAP|Volume|Score|RS|SMA\(50\)|SMA\(200\))\s*(>|<|>=|<=|=)\s*([0-9.]+)\s*$/i);
      
      if (!match) {
        throw new Error(`Failed to parse clause: "${clause}". Use format: [Metric] [Operator] [Value]`);
      }

      const metric = match[1].toUpperCase();
      const operator = match[2];
      const targetVal = parseFloat(match[3]);

      let value;
      switch (metric) {
        case 'RSI': value = stock.rsi; break;
        case 'PRICE': value = stock.price; break;
        case 'PE': value = stock.peRatio; break;
        case 'MCAP': value = stock.marketCap; break;
        case 'VOLUME': value = stock.volRatio; break;
        case 'SCORE': value = stock.momentumScore; break;
        case 'RS': value = stock.rsRating; break;
        case 'SMA(50)': value = stock.price > stock.sma50 ? 1 : 0; break;
        case 'SMA(200)': value = stock.price > stock.sma200 ? 1 : 0; break;
        default: throw new Error(`Unknown indicator metric: "${metric}"`);
      }

      if (metric === 'SMA(50)' || metric === 'SMA(200)') {
        return targetVal === 1 ? value === 1 : value === 0;
      }

      switch (operator) {
        case '>': return value > targetVal;
        case '<': return value < targetVal;
        case '>=': return value >= targetVal;
        case '<=': return value <= targetVal;
        case '=': return value === targetVal;
        default: return false;
      }
    });
  });
}

function renderScannerResults() {
  if (state.activeScannerPreset === 'custom') return; // Handled by runCustomQuery

  let filtered = [...STOCKS_DB];

  switch (state.activeScannerPreset) {
    case 'minervini':
      filtered = STOCKS_DB.filter(s => evaluateMinerviniTemplate(s).passes);
      break;
    case 'oneil-rs':
      filtered = STOCKS_DB.filter(s => s.rsRating >= 80);
      break;
    case 'vcp':
      filtered = STOCKS_DB.filter(s => checkVCP(s));
      break;
    case 'rsi-volume':
      filtered = STOCKS_DB.filter(s => s.rsi >= 60 && s.rsi <= 80 && s.volRatio >= 1.5);
      break;
  }

  // Sort filtered list by momentum score
  filtered.sort((a, b) => b.momentumScore - a.momentumScore);
  renderScannerTable(filtered);
}

function renderScannerTable(stocks) {
  const tbody = document.getElementById('scanner-results-body');
  
  if (stocks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">No stocks matched the scanning criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = stocks.map(stock => {
    const isAdded = state.watchlist.includes(stock.symbol);
    return `
      <tr>
        <td>
          <span class="stock-symbol-cell" data-symbol="${stock.symbol}">${stock.symbol}</span>
        </td>
        <td style="font-size:12px;">${stock.name}</td>
        <td style="font-weight:600;" id="scanner-price-${stock.symbol}">${stock.currency}${stock.price.toFixed(2)}</td>
        <td>${stock.currency}${stock.marketCap.toFixed(1)}B</td>
        <td>${stock.peRatio}</td>
        <td id="scanner-rsi-${stock.symbol}">
          <span class="badge ${stock.rsi >= 70 ? 'danger' : stock.rsi >= 60 ? 'secondary' : 'success'}">${stock.rsi}</span>
        </td>
        <td>${stock.volRatio}x</td>
        <td>
          <span class="badge ${stock.rsRating >= 80 ? 'success' : 'secondary'}">${stock.rsRating}</span>
        </td>
        <td style="font-weight:700; color:var(--accent-primary);" id="scanner-score-${stock.symbol}">${stock.momentumScore}</td>
        <td>
          <button class="watchlist-toggle-btn ${isAdded ? 'in-watchlist' : ''}" data-symbol="${stock.symbol}">
            ${isAdded ? 'Remove' : 'Add'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Table click event handlers
  tbody.querySelectorAll('.stock-symbol-cell').forEach(el => {
    el.addEventListener('click', () => openDetails(el.dataset.symbol));
  });

  tbody.querySelectorAll('.watchlist-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sym = btn.dataset.symbol;
      if (state.watchlist.includes(sym)) {
        removeFromWatchlist(sym);
        btn.textContent = 'Add';
        btn.classList.remove('in-watchlist');
      } else {
        addToWatchlist(sym);
        btn.textContent = 'Remove';
        btn.classList.add('in-watchlist');
      }
    });
  });
}

// --- SECTOR FLOW HEATMAP ---
function setupSectors() {
  // Click handler for constituents
  document.getElementById('sectors-heatmap-container').addEventListener('click', (e) => {
    const card = e.target.closest('.sector-heatmap-card');
    if (card && card.dataset.sector) {
      state.activeSector = card.dataset.sector;
      renderSectorConstituents();
    }
  });
}

function renderSectorHeatmap() {
  const container = document.getElementById('sectors-heatmap-container');
  
  // Calculate rolling momentum performance for sectors
  container.innerHTML = SECTORS_DB.map(sector => {
    const change = sector.changePercent;
    const isPos = change >= 0;
    
    // Choose CSS class based on gain intensity
    let heatClass = 'flat';
    if (change > 1.5) heatClass = 'strong-up';
    else if (change > 0) heatClass = 'mild-up';
    else if (change < -1.5) heatClass = 'strong-down';
    else if (change < 0) heatClass = 'mild-down';

    return `
      <div class="sector-heatmap-card ${heatClass}" data-sector="${sector.symbol}">
        <span class="sector-heatmap-title">${sector.name}</span>
        <span class="sector-heatmap-change ${isPos ? 'pos' : 'neg'}">
          ${isPos ? '+' : ''}${change.toFixed(2)}%
        </span>
        <div class="sector-heatmap-value">
          <span>Index: ${sector.indexValue.toFixed(2)}</span>
          <span style="font-weight:700;">${sector.symbol}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderSectorConstituents() {
  const sector = SECTORS_DB.find(s => s.symbol === state.activeSector);
  const tbody = document.getElementById('sector-constituents-body');
  const title = document.getElementById('sector-table-title');

  if (!sector) return;

  title.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${sector.name} Constituents`;

  const constituents = STOCKS_DB.filter(s => sector.stocks.includes(s.symbol));

  tbody.innerHTML = constituents.map(stock => {
    const isAdded = state.watchlist.includes(stock.symbol);
    return `
      <tr>
        <td>
          <span class="stock-symbol-cell" data-symbol="${stock.symbol}">${stock.symbol}</span>
        </td>
        <td style="font-size:12px;">${stock.name}</td>
        <td style="font-weight:600;" id="sector-price-${stock.symbol}">${stock.currency}${stock.price.toFixed(2)}</td>
        <td>${stock.currency}${stock.marketCap.toFixed(1)}B</td>
        <td>${stock.peRatio}</td>
        <td id="sector-rsi-${stock.symbol}">
          <span class="badge ${stock.rsi >= 70 ? 'danger' : stock.rsi >= 60 ? 'secondary' : 'success'}">${stock.rsi}</span>
        </td>
        <td style="font-weight:700; color:var(--accent-primary);" id="sector-score-${stock.symbol}">${stock.momentumScore}</td>
        <td>
          <button class="watchlist-toggle-btn ${isAdded ? 'in-watchlist' : ''}" data-symbol="${stock.symbol}">
            ${isAdded ? 'Remove' : 'Add'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.stock-symbol-cell').forEach(el => {
    el.addEventListener('click', () => openDetails(el.dataset.symbol));
  });

  tbody.querySelectorAll('.watchlist-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sym = btn.dataset.symbol;
      if (state.watchlist.includes(sym)) {
        removeFromWatchlist(sym);
        btn.textContent = 'Add';
        btn.classList.remove('in-watchlist');
      } else {
        addToWatchlist(sym);
        btn.textContent = 'Remove';
        btn.classList.add('in-watchlist');
      }
    });
  });
}

// --- DETAILS MODAL & CUSTOM CANVAS CHART ---
let chartCanvasResizeListener = null;

function openDetails(symbol) {
  const stock = STOCKS_DB.find(s => s.symbol === symbol);
  if (!stock) return;

  state.selectedStock = symbol;

  // Setup basics
  document.getElementById('details-symbol').textContent = stock.symbol;
  document.getElementById('details-name').textContent = stock.name;
  document.getElementById('details-desc').textContent = stock.description;
  document.getElementById('details-result-date').textContent = new Date(stock.upcomingResultDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Setup live price header in details modal
  const priceChange = stock.price - stock.priceHistory[18];
  const pctChange = (priceChange / stock.priceHistory[18]) * 100;
  const isPositive = pctChange >= 0;
  const dPrice = document.getElementById('details-header-price');
  const dChange = document.getElementById('details-header-change');
  if (dPrice) dPrice.textContent = `${stock.currency}${stock.price.toFixed(2)}`;
  if (dChange) {
    dChange.textContent = `(${isPositive ? '+' : ''}${pctChange.toFixed(2)}%)`;
    dChange.style.color = isPositive ? 'var(--color-success)' : 'var(--color-danger)';
  }

  // Setup Sector badge
  const sectorBadge = document.getElementById('details-sector-badge');
  sectorBadge.textContent = stock.sector;
  
  // Set Watchlist Button state
  const watchlistBtn = document.getElementById('details-watchlist-btn');
  if (state.watchlist.includes(symbol)) {
    watchlistBtn.textContent = 'Remove from Watchlist';
    watchlistBtn.classList.add('in-watchlist');
  } else {
    watchlistBtn.textContent = 'Add to Watchlist';
    watchlistBtn.classList.remove('in-watchlist');
  }

  // Remove existing listener and attach new one
  const newWatchlistBtn = watchlistBtn.cloneNode(true);
  watchlistBtn.parentNode.replaceChild(newWatchlistBtn, watchlistBtn);
  newWatchlistBtn.addEventListener('click', () => {
    if (state.watchlist.includes(symbol)) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  });

  // Load Key statistics
  document.getElementById('stat-mcap').textContent = `${stock.currency}${stock.marketCap.toFixed(1)}B`;
  document.getElementById('stat-pe').textContent = stock.peRatio.toFixed(1);
  document.getElementById('stat-eps').textContent = `${stock.epsGrowth >= 0 ? '+' : ''}${stock.epsGrowth.toFixed(1)}%`;
  document.getElementById('stat-sales').textContent = `${stock.salesGrowth >= 0 ? '+' : ''}${stock.salesGrowth.toFixed(1)}%`;
  document.getElementById('stat-inst').textContent = `${stock.instHoldingChange >= 0 ? '+' : ''}${stock.instHoldingChange.toFixed(1)}%`;
  document.getElementById('stat-rsi').textContent = stock.rsi.toFixed(1);

  // Load Gauge chart
  const gaugeVal = document.getElementById('gauge-score-value');
  const gaugeVerdict = document.getElementById('gauge-verdict-text');
  const gaugeCircle = document.getElementById('momentum-gauge-circle');

  gaugeVal.textContent = stock.momentumScore;
  let verdictColor = 'var(--text-secondary)';
  if (stock.momentumScore >= 80) {
    gaugeVerdict.textContent = 'Super Momentum (Minervini Ideal)';
    verdictColor = 'var(--accent-primary)';
  } else if (stock.momentumScore >= 65) {
    gaugeVerdict.textContent = 'Strong Momentum (Buy on Pullback)';
    verdictColor = 'var(--color-success)';
  } else if (stock.momentumScore >= 45) {
    gaugeVerdict.textContent = 'Consolidating Trend';
    verdictColor = 'var(--color-warning)';
  } else {
    gaugeVerdict.textContent = 'Weak / Downtrend (Avoid)';
    verdictColor = 'var(--color-danger)';
  }
  gaugeVerdict.style.color = verdictColor;
  gaugeCircle.style.background = `conic-gradient(var(--accent-primary) ${stock.momentumScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)`;

  // Load Minervini checklist
  renderMinerviniChecklist(stock);

  // Render Canvas Chart
  const modal = document.getElementById('stock-details-modal');
  modal.classList.add('show');
  modal.showModal();

  // Draw chart and adjust canvas dimensions
  setTimeout(() => {
    drawTechnicalChart(stock);
  }, 100);

  // Handle responsive resize for canvas
  if (chartCanvasResizeListener) {
    window.removeEventListener('resize', chartCanvasResizeListener);
  }
  chartCanvasResizeListener = () => drawTechnicalChart(stock);
  window.addEventListener('resize', chartCanvasResizeListener);
}

function closeModal() {
  const modal = document.getElementById('stock-details-modal');
  modal.classList.remove('show');
  modal.close();
  if (chartCanvasResizeListener) {
    window.removeEventListener('resize', chartCanvasResizeListener);
    chartCanvasResizeListener = null;
  }
}

function renderMinerviniChecklist(stock) {
  const root = document.getElementById('minervini-checklist-root');
  const res = evaluateMinerviniTemplate(stock);

  const ruleLabels = [
    { key: 'priceAboveSMAs', label: `Price is above both the 150-day and 200-day moving averages` },
    { key: 'sma150Above200', label: `150-day moving average is above the 200-day moving average` },
    { key: 'sma200Upward', label: `200-day moving average is in an uptrend (1 month)` },
    { key: 'sma50AboveOtherSMAs', label: `50-day moving average is above 150-day and 200-day averages` },
    { key: 'priceAboveSMA50', label: `Current price is trading above the 50-day moving average` },
    { key: 'aboveLow52', label: `Current price is at least 30% above the 52-week low` },
    { key: 'nearHigh52', label: `Current price is within 25% of the 52-week high` },
    { key: 'strongRS', label: `Relative Strength (RS) rating is 70 or higher (Current: ${stock.rsRating})` }
  ];

  root.innerHTML = ruleLabels.map(rule => {
    const passed = res.rules[rule.key];
    return `
      <div class="checklist-item">
        <i class="fa-solid ${passed ? 'fa-circle-check' : 'fa-circle-xmark'} ${passed ? 'fa-check-circle' : 'fa-times-circle'}"></i>
        <span>${rule.label}</span>
      </div>
    `;
  }).join('');
}

function drawTechnicalChart(stock) {
  const canvas = document.getElementById('details-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Set dimensions to match computed layout
  const rect = canvas.parentNode.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const width = canvas.width;
  const height = canvas.height;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const history = stock.fullHistory;
  const volHistory = stock.volumeHistory;
  const len = history.length;

  // Calculate technical lines
  const ma50Vals = [];
  const ma200Vals = [];
  for (let i = 0; i < len; i++) {
    ma50Vals.push(calculateSMA(history.slice(0, i + 1), 50));
    ma200Vals.push(calculateSMA(history.slice(0, i + 1), 200));
  }

  // Find min/max values for scaling
  let maxPrice = -Infinity;
  let minPrice = Infinity;
  let maxVol = -Infinity;

  for (let i = 0; i < len; i++) {
    if (history[i] > maxPrice) maxPrice = history[i];
    if (history[i] < minPrice) minPrice = history[i];
    if (ma50Vals[i] && ma50Vals[i] > maxPrice) maxPrice = ma50Vals[i];
    if (ma50Vals[i] && ma50Vals[i] < minPrice) minPrice = ma50Vals[i];
    if (ma200Vals[i] && ma200Vals[i] > maxPrice) maxPrice = ma200Vals[i];
    if (ma200Vals[i] && ma200Vals[i] < minPrice) minPrice = ma200Vals[i];
    if (volHistory[i] > maxVol) maxVol = volHistory[i];
  }

  // Add 5% buffer to price range
  const priceBuffer = (maxPrice - minPrice) * 0.05 || 1;
  maxPrice += priceBuffer;
  minPrice = Math.max(0, minPrice - priceBuffer);

  const priceScale = chartHeight / (maxPrice - minPrice);
  const volScale = (chartHeight * 0.20) / maxVol; // Volume takes bottom 20%

  // Draw backgrounds and grids
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  // Horizontal Grid Lines & Price Labels
  const gridLinesCount = 5;
  for (let i = 0; i <= gridLinesCount; i++) {
    const yVal = minPrice + (maxPrice - minPrice) * (i / gridLinesCount);
    const y = paddingTop + chartHeight - (yVal - minPrice) * priceScale;
    
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    ctx.fillStyle = '#8f9aa6';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${stock.currency}${yVal.toFixed(1)}`, 8, y + 4);
  }

  // Convert coordinate indexes
  const getX = (idx) => paddingLeft + (idx / (len - 1)) * chartWidth;
  const getY = (price) => paddingTop + chartHeight - (price - minPrice) * priceScale;

  // Draw 200 SMA (Purple Line)
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let ma200Started = false;
  for (let i = 0; i < len; i++) {
    if (ma200Vals[i] > 0) {
      if (!ma200Started) {
        ctx.moveTo(getX(i), getY(ma200Vals[i]));
        ma200Started = true;
      } else {
        ctx.lineTo(getX(i), getY(ma200Vals[i]));
      }
    }
  }
  ctx.stroke();

  // Draw 50 SMA (Orange Line)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let ma50Started = false;
  for (let i = 0; i < len; i++) {
    if (ma50Vals[i] > 0) {
      if (!ma50Started) {
        ctx.moveTo(getX(i), getY(ma50Vals[i]));
        ma50Started = true;
      } else {
        ctx.lineTo(getX(i), getY(ma50Vals[i]));
      }
    }
  }
  ctx.stroke();

  // Draw price line chart (Cyan Glow Line)
  const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
  gradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(history[0]));
  for (let i = 1; i < len; i++) {
    ctx.lineTo(getX(i), getY(history[i]));
  }
  // close path to fill area under curve
  ctx.lineTo(getX(len - 1), paddingTop + chartHeight);
  ctx.lineTo(getX(0), paddingTop + chartHeight);
  ctx.fill();

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(history[0]));
  for (let i = 1; i < len; i++) {
    ctx.lineTo(getX(i), getY(history[i]));
  }
  ctx.stroke();

  // Draw Volume Bars at bottom
  const barWidth = Math.max(1, (chartWidth / len) * 0.7);
  for (let i = 0; i < len; i++) {
    const x = getX(i) - barWidth / 2;
    const volHeight = volHistory[i] * volScale;
    const y = paddingTop + chartHeight - volHeight;
    
    const isUp = history[i] >= (history[i - 1] || history[i]);
    ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
    ctx.fillRect(x, y, barWidth, volHeight);
  }

  // Draw timeline x-axis dates
  ctx.fillStyle = '#8f9aa6';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  
  const intervals = 4;
  for (let i = 0; i <= intervals; i++) {
    const idx = Math.floor((len - 1) * (i / intervals));
    const x = getX(idx);
    const date = new Date();
    date.setDate(date.getDate() - (len - 1 - idx));
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    ctx.fillText(label, x, height - 12);
  }
}

// --- REAL-TIME MARKET TICK SIMULATOR ---
function startMarketTickSimulator() {
  setInterval(() => {
    // Choose 2-3 random stocks to update
    const countToUpdate = 2 + Math.floor(Math.random() * 2);
    const updatedSymbols = [];

    for (let i = 0; i < countToUpdate; i++) {
      const idx = Math.floor(Math.random() * STOCKS_DB.length);
      const stock = STOCKS_DB[idx];
      
      // Perform Brownian random walk step (up/down 0.1% to 0.5%)
      const pctShock = (Math.random() - 0.5) * 0.006;
      const oldPrice = stock.price;
      stock.price = Number((stock.price * (1 + pctShock)).toFixed(2));
      
      // Update historical array close
      stock.fullHistory[stock.fullHistory.length - 1] = stock.price;

      // Update indicators dynamically
      stock.rsi = calculateRSI(stock.fullHistory, 14);
      stock.sma50 = calculateSMA(stock.fullHistory, 50);
      stock.sma150 = calculateSMA(stock.fullHistory, 150);
      stock.sma200 = calculateSMA(stock.fullHistory, 200);

      const momData = calculateMomentumScore(stock);
      stock.momentumScore = momData.score;
      stock.volRatio = momData.volRatio;

      updatedSymbols.push({
        symbol: stock.symbol,
        isUp: stock.price >= oldPrice,
        price: stock.price,
        currency: stock.currency
      });

      // Update sectoral index containing this stock
      const sector = SECTORS_DB.find(s => s.stocks.includes(stock.symbol));
      if (sector) {
        // Sector index value changes in line with stock updates
        sector.indexValue += (stock.price - oldPrice) * (sector.indexValue / 100000);
        sector.changePercent += pctShock * 25; // amplify index change for visual impact
      }
    }

    // In-place dynamic price updates to prevent destroying layout/focus
    updatedSymbols.forEach(tick => {
      const stock = STOCKS_DB.find(s => s.symbol === tick.symbol);
      if (!stock) return;

      const priceChange = stock.price - stock.priceHistory[18];
      const pctChange = (priceChange / stock.priceHistory[18]) * 100;
      const isPositive = pctChange >= 0;

      // 1. Update Watchlist view card in-place if visible
      const wlPriceBlock = document.getElementById(`watchlist-price-${tick.symbol}`);
      if (wlPriceBlock) {
        const priceSpan = wlPriceBlock.querySelector('.watchlist-card-price');
        const changeSpan = wlPriceBlock.querySelector('.watchlist-card-change');
        
        if (priceSpan) priceSpan.textContent = `${stock.currency}${stock.price.toFixed(2)}`;
        if (changeSpan) {
          changeSpan.textContent = `${isPositive ? '▲' : '▼'} ${Math.abs(pctChange).toFixed(2)}%`;
          changeSpan.className = `watchlist-card-change ${isPositive ? 'positive' : 'negative'}`;
        }
        
        const pulseClass = tick.isUp ? 'flash-up' : 'flash-down';
        wlPriceBlock.classList.add(pulseClass);
        setTimeout(() => {
          wlPriceBlock.classList.remove(pulseClass);
        }, 800);
      }

      // 2. Update Scanner table row in-place if visible
      const scannerPriceCell = document.getElementById(`scanner-price-${tick.symbol}`);
      if (scannerPriceCell) {
        scannerPriceCell.textContent = `${stock.currency}${stock.price.toFixed(2)}`;
        const row = scannerPriceCell.closest('tr');
        row.style.backgroundColor = tick.isUp ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';
        setTimeout(() => { row.style.backgroundColor = ''; }, 600);
      }
      
      const scannerRsiCell = document.getElementById(`scanner-rsi-${tick.symbol}`);
      if (scannerRsiCell) {
        scannerRsiCell.innerHTML = `<span class="badge ${stock.rsi >= 70 ? 'danger' : stock.rsi >= 60 ? 'secondary' : 'success'}">${stock.rsi}</span>`;
      }

      const scannerScoreCell = document.getElementById(`scanner-score-${tick.symbol}`);
      if (scannerScoreCell) {
        scannerScoreCell.textContent = stock.momentumScore;
      }

      // 3. Update Sector constituents table row in-place if visible
      const sectorPriceCell = document.getElementById(`sector-price-${tick.symbol}`);
      if (sectorPriceCell) {
        sectorPriceCell.textContent = `${stock.currency}${stock.price.toFixed(2)}`;
        const row = sectorPriceCell.closest('tr');
        row.style.backgroundColor = tick.isUp ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';
        setTimeout(() => { row.style.backgroundColor = ''; }, 600);
      }
      
      const sectorRsiCell = document.getElementById(`sector-rsi-${tick.symbol}`);
      if (sectorRsiCell) {
        sectorRsiCell.innerHTML = `<span class="badge ${stock.rsi >= 70 ? 'danger' : stock.rsi >= 60 ? 'secondary' : 'success'}">${stock.rsi}</span>`;
      }

      const sectorScoreCell = document.getElementById(`sector-score-${tick.symbol}`);
      if (sectorScoreCell) {
        sectorScoreCell.textContent = stock.momentumScore;
      }

      // 4. Update details modal in-place if open for this stock
      const modal = document.getElementById('stock-details-modal');
      if (modal.classList.contains('show') && state.selectedStock === tick.symbol) {
        drawTechnicalChart(stock);
        
        const dPrice = document.getElementById('details-header-price');
        const dChange = document.getElementById('details-header-change');
        if (dPrice) dPrice.textContent = `${stock.currency}${stock.price.toFixed(2)}`;
        if (dChange) {
          dChange.textContent = `(${isPositive ? '+' : ''}${pctChange.toFixed(2)}%)`;
          dChange.style.color = isPositive ? 'var(--color-success)' : 'var(--color-danger)';
        }
        
        document.getElementById('stat-rsi').textContent = stock.rsi.toFixed(1);
        document.getElementById('gauge-score-value').textContent = stock.momentumScore;
        document.getElementById('momentum-gauge-circle').style.background = `conic-gradient(var(--accent-primary) ${stock.momentumScore * 3.6}deg, rgba(255, 255, 255, 0.05) 0deg)`;
        
        renderMinerviniChecklist(stock);
      }
    });

    // Refresh general indices and sector cards
    renderSectorHeatmap();
    renderSidebarIndices();
    checkUpcomingResultAlerts();

  }, 3000); // Trigger every 3 seconds
}

function renderSidebarIndices() {
  const container = document.getElementById('sidebar-indices');
  container.innerHTML = SECTORS_DB.map(sector => {
    const isPos = sector.changePercent >= 0;
    return `
      <div class="sector-index-card" data-sector="${sector.symbol}">
        <div class="sector-meta">
          <span class="sector-name">${sector.name}</span>
          <span class="sector-symbol">${sector.symbol}</span>
        </div>
        <div class="sector-price-row">
          <span class="sector-value">${sector.indexValue.toFixed(2)}</span>
          <span class="sector-change ${isPos ? 'positive' : 'negative'}">
            ${isPos ? '+' : ''}${sector.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers to sidebar sector cards
  container.querySelectorAll('.sector-index-card').forEach(card => {
    card.addEventListener('click', () => {
      // Switch view to sectors
      const navSectors = document.getElementById('nav-sectors');
      navSectors.click();
      
      // Load sector details
      state.activeSector = card.dataset.sector;
      renderSectorHeatmap();
      renderSectorConstituents();
    });
  });
}

// Initial index load
renderSidebarIndices();

// Start
document.addEventListener('DOMContentLoaded', init);
init(); // Backwards fallback
