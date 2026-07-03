// === 实时汇率换算工具模块 ===
import { t } from '../i18n.js';
// 数据来源（多源fallback）
const API_SOURCES = [
  'https://api.frankfurter.app',
  'https://open.er-api.com/v6',
];

// 离线备用汇率（2024基准，相对美元）
const FALLBACK_RATES = {
  USD:1, CNY:7.24, EUR:0.92, JPY:155.8, GBP:0.79, HKD:7.82, KRW:1370, AUD:1.53, CAD:1.37,
  CHF:0.89, SGD:1.34, TWD:32.1, INR:83.5, RUB:90.2, BRL:5.12, MXN:17.2,
  THB:36.5, MYR:4.68, PHP:57.2, IDR:16100, VND:24800, NZD:1.64, SEK:10.5,
  NOK:10.7, DKK:6.88, TRY:32.5, ZAR:18.3, AED:3.67
};

// 常用货币列表
const CURRENCIES = [
  { code: 'CNY', name: '人民币', symbol: '¥', flag: '🇨🇳' },
  { code: 'USD', name: '美元', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: '欧元', symbol: '€', flag: '🇪🇺' },
  { code: 'JPY', name: '日元', symbol: '¥', flag: '🇯🇵' },
  { code: 'GBP', name: '英镑', symbol: '£', flag: '🇬🇧' },
  { code: 'HKD', name: '港币', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'KRW', name: '韩元', symbol: '₩', flag: '🇰🇷' },
  { code: 'AUD', name: '澳元', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: '加元', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: '瑞士法郎', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'SGD', name: '新加坡元', symbol: 'S$', flag: '🇸🇬' },
  { code: 'TWD', name: '新台币', symbol: 'NT$', flag: '🇹🇼' },
  { code: 'INR', name: '印度卢比', symbol: '₹', flag: '🇮🇳' },
  { code: 'RUB', name: '卢布', symbol: '₽', flag: '🇷🇺' },
  { code: 'BRL', name: '巴西雷亚尔', symbol: 'R$', flag: '🇧🇷' },
  { code: 'MXN', name: '墨西哥比索', symbol: 'Mex$', flag: '🇲🇽' },
  { code: 'THB', name: '泰铢', symbol: '฿', flag: '🇹🇭' },
  { code: 'MYR', name: '马来西亚林吉特', symbol: 'RM', flag: '🇲🇾' },
  { code: 'PHP', name: '菲律宾比索', symbol: '₱', flag: '🇵🇭' },
  { code: 'IDR', name: '印尼盾', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'VND', name: '越南盾', symbol: '₫', flag: '🇻🇳' },
  { code: 'NZD', name: '新西兰元', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'SEK', name: '瑞典克朗', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: '挪威克朗', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: '丹麦克朗', symbol: 'kr', flag: '🇩🇰' },
  { code: 'TRY', name: '土耳其里拉', symbol: '₺', flag: '🇹🇷' },
  { code: 'ZAR', name: '南非兰特', symbol: 'R', flag: '🇿🇦' },
  { code: 'AED', name: '阿联酋迪拉姆', symbol: 'د.إ', flag: '🇦🇪' },
];

// 缓存汇率 (5分钟有效)
let rateCache = { from: null, to: null, rate: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000;

export function render(container) {
  container.innerHTML = '';

  const currencyOptions = CURRENCIES.map(c =>
    `<option value="${c.code}">${c.flag} ${c.code} - ${c.name}</option>`
  ).join('');

  const html = `
    <div class="rate-container">
      <div class="rate-card">
        <h2>${t('rate.title')}</h2>
        <div class="rate-updated" id="rateUpdated">${t('rate.source')}</div>

        <!-- 输入金额 -->
        <div class="rate-input-group">
          <input type="number" id="rateAmount" class="rate-amount" value="1" min="0" step="any" placeholder="${t('rate.amount_ph')}" />
          <select id="rateFrom" class="rate-select">${currencyOptions}</select>
        </div>

        <!-- 交换按钮 -->
        <div class="rate-swap-row">
          <button id="rateSwap" class="rate-swap-btn">${t('rate.swap')}</button>
        </div>

        <!-- 目标货币 -->
        <div class="rate-input-group">
          <select id="rateTo" class="rate-select">${currencyOptions}</select>
          <div class="rate-amount" id="rateOutput" style="display:flex;align-items:center;justify-content:center;cursor:default;">—</div>
        </div>

        <!-- 转换结果 -->
        <div class="rate-result">
          <div class="rate-result-label">${t('rate.result_label')}</div>
          <div class="rate-result-value" id="rateResult">—</div>
          <div class="rate-result-rate" id="rateInfo"></div>
        </div>

        <!-- 快捷金额 -->
        <div class="rate-presets">
          <button class="rate-preset" data-amt="1">1</button>
          <button class="rate-preset" data-amt="10">10</button>
          <button class="rate-preset" data-amt="100">100</button>
          <button class="rate-preset" data-amt="500">500</button>
          <button class="rate-preset" data-amt="1000">1,000</button>
          <button class="rate-preset" data-amt="10000">10,000</button>
        </div>
      </div>

      <!-- 底部信息 -->
      <div style="text-align:center;padding:16px;color:#484f58;font-size:.75rem;">
        <p>${t('rate.disclaimer')}</p>
        <p style="margin-top:4px;">${t('rate.credit')}</p>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // ---- DOM refs ----
  const $ = (id) => document.getElementById(id);
  const amountInput = $('rateAmount');
  const fromSelect = $('rateFrom');
  const toSelect = $('rateTo');
  const outputDisplay = $('rateOutput');
  const resultValue = $('rateResult');
  const rateInfo = $('rateInfo');
  const rateUpdated = $('rateUpdated');

  // 默认值
  fromSelect.value = 'CNY';
  toSelect.value = 'USD';

  // ---- 获取汇率（多源fallback） ----
  async function getRate(from, to) {
    if (from === to) return 1;

    // 检查缓存
    if (rateCache.from === from && rateCache.to === to && (Date.now() - rateCache.timestamp) < CACHE_TTL) {
      return rateCache.rate;
    }

    let lastErr = null;

    // 尝试多个 API 源
    for (const baseUrl of API_SOURCES) {
      try {
        let url;
        if (baseUrl.includes('frankfurter')) {
          url = `${baseUrl}/latest?from=${from}&to=${to}`;
        } else {
          // open.er-api.com 格式不同
          url = `${baseUrl}/latest/${from}`;
        }

        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) continue;
        const data = await resp.json();

        let rate;
        if (data.rates) {
          rate = data.rates[to];
        }
        if (!rate) continue;

        rateCache = { from, to, rate, timestamp: Date.now() };
        rateUpdated.textContent = t('rate.updated') + (data.date || new Date().toISOString().slice(0,10)) + t('rate.updated_src');
        return rate;
      } catch (err) {
        lastErr = err;
        continue;
      }
    }

    // 所有API都失败 → 使用离线备用数据
    if (FALLBACK_RATES[from] && FALLBACK_RATES[to]) {
      const rate = FALLBACK_RATES[to] / FALLBACK_RATES[from];
      rateCache = { from, to, rate, timestamp: Date.now() };
      rateUpdated.textContent = t('rate.cached');
      return rate;
    }

    // 彻底失败
    if (rateCache.rate && rateCache.from === from && rateCache.to === to) {
      rateUpdated.textContent = t('rate.cached');
      return rateCache.rate;
    }
    throw lastErr || new Error('所有数据源不可用');
  }

  // ---- 执行换算 ----
  async function convert() {
    const from = fromSelect.value;
    const to = toSelect.value;
    const amount = parseFloat(amountInput.value) || 0;

    if (amount <= 0) {
      resultValue.textContent = '—';
      outputDisplay.textContent = '—';
      rateInfo.textContent = '';
      return;
    }

    resultValue.textContent = t('rate.calculating');
    outputDisplay.textContent = t('rate.calculating');

    try {
      const rate = await getRate(from, to);
      const result = amount * rate;

      const fromCur = CURRENCIES.find(c => c.code === from);
      const toCur = CURRENCIES.find(c => c.code === to);

      resultValue.textContent = formatNumber(result);
      outputDisplay.textContent = formatNumber(result);

      const fromLabel = fromCur ? `${fromCur.flag} ${fromCur.code}` : from;
      const toLabel = toCur ? `${toCur.flag} ${toCur.code}` : to;
      rateInfo.textContent = `1 ${fromLabel} = ${formatNumber(rate)} ${toLabel}`;
    } catch (err) {
      resultValue.textContent = t('rate.error');
      outputDisplay.textContent = '⚠️';
      rateInfo.textContent = t('rate.network_err');
      resultValue.style.color = '#f85149';
      setTimeout(() => { resultValue.style.color = ''; }, 3000);
    }
  }

  function formatNumber(n) {
    if (Math.abs(n) < 0.01 && n !== 0) return n.toFixed(6);
    if (Math.abs(n) < 1) return n.toFixed(4);
    if (Math.abs(n) < 1000) return n.toFixed(2);
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---- 事件绑定 ----
  let convertTimer = null;
  function debounceConvert() {
    clearTimeout(convertTimer);
    convertTimer = setTimeout(convert, 300);
  }

  amountInput.addEventListener('input', debounceConvert);
  fromSelect.addEventListener('change', convert);
  toSelect.addEventListener('change', convert);

  // 交换货币
  $('rateSwap').addEventListener('click', () => {
    const tmp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = tmp;
    convert();
  });

  // 快捷金额
  document.querySelectorAll('.rate-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      amountInput.value = btn.dataset.amt;
      convert();
    });
  });

  // 初始加载
  convert();
}

// 自动初始化：如果页面有 #app 容器则自动渲染
const appEl = document.getElementById('app');
if (appEl) {
  render(appEl);
}
