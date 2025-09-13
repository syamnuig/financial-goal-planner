
// Financial Goal Planner - Cleaned app.js using Frankfurter API only

const root = document.getElementById('app-root');

// Supported currencies
const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' }
];

// Utility to format date as YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Fetch current FX rate using Frankfurter API
async function fetchCurrentRate(base, target) {
    const url = `https://api.frankfurter.app/latest?from=${base}&to=${target}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.rates[target];
}

// Fetch historical FX rates over the past 6 months
async function fetchHistoricalRates(base, target) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 6);
    const url = `https://api.frankfurter.app/${formatDate(startDate)}..${formatDate(endDate)}?from=${base}&to=${target}`;
    const response = await fetch(url);
    const data = await response.json();
    return Object.entries(data.rates).map(([date, rates]) => ({
        date,
        rate: rates[target]
    }));
}

// Simple linear regression for FX prediction
function linearRegression(data) {
    const x = data.map((_, i) => i);
    const y = data.map(d => d.rate);
    const n = x.length;
    const sumx = x.reduce((a, b) => a + b, 0);
    const sumy = y.reduce((a, b) => a + b, 0);
    const sumxy = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumxx = x.reduce((a, b) => a + b * b, 0);
    const a = (n * sumxy - sumx * sumy) / (n * sumxx - sumx * sumx + 1e-10);
    const b = (sumy - a * sumx) / n;
    const residual = x.reduce((acc, val, i) => acc + Math.abs(y[i] - (a * val + b)), 0) / n;
    return { a, b, residual };
}

// Predict FX curve for next N months
function predictFXCurve(lr, months) {
    const curve = [];
    for (let i = 1; i <= months; ++i) {
        const weekIdx = Math.floor(i / 4);
        curve.push(lr.a * (lr.b + weekIdx) + lr.b);
    }
    return curve;
}

// Main FX data fetch and prediction
async function getFXData(base, target, months) {
    if (base === target) {
        return { current: 1, pred: 1, confidence: 1, fxCurve: Array(months).fill(1) };
    }
    const current = await fetchCurrentRate(base, target);
    const history = await fetchHistoricalRates(base, target);
    const weekly = history.filter((_, i) => i % 7 === 0);
    const lr = linearRegression(weekly);
    const pred = lr.a * (weekly.length + Math.floor(months / 4)) + lr.b;
    const confidence = Math.max(0, Math.min(1, 1 - lr.residual / (Math.abs(lr.b) + 1e-8)));
    const fxCurve = predictFXCurve(lr, months);
    return { current, pred, confidence, fxCurve };
}

// Entry point
renderInputScreen();

function renderInputScreen() {
    root.innerHTML = `
        <div class="material-card" id="financial-card">
            <div class="heading">Financial Goal Planner</div>
            <div class="app-content-title">Plan Your Investment</div>
            <form id="financial-form" autocomplete="off">
                <div class="financial-form-2col">
                    <div class="financial-form-row">
                        <label for="goal">Goal Amount:</label>
                        <input type="number" id="goal" required placeholder="e.g., 100000" min="0">
                        <select id="goal-currency">
                            ${CURRENCIES.map(c => `<option value="${c.code}"${c.code === "EUR" ? " selected" : ""}>${c.code}</option>`).join('')}
                        </select>
                    </div>
                    <div class="financial-form-row">
                        <label for="months">Months:</label>
                        <input type="number" id="months" required placeholder="e.g., 60" min="1">
                    </div>
                    <div class="financial-form-row">
                        <label for="rate">Expected Annual Return (%):</label>
                        <input type="number" id="rate" required placeholder="e.g., 8" step="0.01">
                    </div>
                    <div class="financial-form-row">
                        <label for="budget">Initial Investment:</label>
                        <input type="number" id="budget" required placeholder="e.g., 10000" min="0">
                        <select id="input-currency">
                            ${CURRENCIES.map(c => `<option value="${c.code}"${c.code === "EUR" ? " selected" : ""}>${c.code}</option>`).join('')}
                        </select>
                    </div>
                    <div class="financial-form-row">
                        <label for="monthly-currency">Monthly Contribution Currency:</label>
                        <select id="monthly-currency">
                            ${CURRENCIES.map(c => `<option value="${c.code}"${c.code === "EUR" ? " selected" : ""}>${c.code}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button type="submit" class="calc-btn">Calculate Plan</button>
            </form>
        </div>
    `;
    root.querySelector("#financial-form").onsubmit = function (e) {
        e.preventDefault();
        const goal = parseFloat(root.querySelector("#goal").value) || 0;
        const months = parseInt(root.querySelector("#months").value) || 1;
        const rate = parseFloat(root.querySelector("#rate").value) || 0;
        const budget = parseFloat(root.querySelector("#budget").value) || 0;
        const inputCurrency = root.querySelector("#input-currency").value;
        const monthlyCurrency = root.querySelector("#monthly-currency").value;
        const goalCurrency = root.querySelector("#goal-currency").value;
        renderResultScreen({
            goal, months, rate, budget, inputCurrency, monthlyCurrency, goalCurrency
        });
    };
}

// Robust fetch with timeout (not needed for Frankfurter, but kept for future-proofing)
async function safeFetch(url, timeout = 12000) {
    return Promise.race([
        fetch(url).then(res => {
            if (!res.ok) throw new Error("Network response not ok");
            return res.json();
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), timeout))
    ]);
}

async function renderResultScreen({ goal, months, rate, budget, inputCurrency, monthlyCurrency, goalCurrency }) {
    root.innerHTML = `
        <div class="material-card" id="result-card">
            <div class="heading">Financial Goal Planner</div>
            <div class="app-content-title">Your Investment Plan</div>
            <div id="fx-panel"></div>
            <div id="result-block"></div>
            <div class="chart-container">
                <canvas id="resultChart"></canvas>
            </div>
            <div id="suggestion-box"></div>
            <button class="back-btn" id="back-btn">Back / Edit Plan</button>
        </div>
    `;
    document.getElementById('back-btn').onclick = renderInputScreen;
    document.getElementById('fx-panel').innerHTML = "Fetching currency data...";
    document.getElementById('result-block').innerHTML = "";
    document.getElementById('suggestion-box').innerHTML = "";

    // Fetch FX for initial, monthly, and goal currencies
    let fxData = {};
    try {
        // All conversions to goal currency
        fxData.inputToGoal = await getFXData(inputCurrency, goalCurrency, months);
        fxData.monthlyToGoal = await getFXData(monthlyCurrency, goalCurrency, months);
        fxData.monthlyToInput = await getFXData(monthlyCurrency, inputCurrency, months);
    } catch (e) {
        document.getElementById('fx-panel').innerHTML = `<div class="fx-panel" style="color: #e43f5a;">Error fetching currency data. Please check your connection and try again.<br>${e.message}</div>`;
        return;
    }

    // Calculate plan
    let r = rate / 100 / 12;
    let n = months;
    let PV = convertAmount(budget, fxData.inputToGoal.current, inputCurrency, goalCurrency); // Convert initial to goal currency for logic
    let FV = goal;
    // We'll solve for monthly contribution in the selected monthly currency, but calculation is in goal currency
    // If monthly contribution is in a different currency, we need to solve for monthly in that currency such that, with conversions, the final goal is met.
    // We'll use the predicted FX rate for the average conversion over the period.
    let avgMonthlyToGoalFX = avgFX(fxData.monthlyToGoal.fxCurve, fxData.monthlyToGoal.current, n);
    // Solve for monthly in goal currency
    let monthly_goal;
    if (r > 0) {
        monthly_goal = (FV - PV * Math.pow(1 + r, n)) * r / (Math.pow(1 + r, n) - 1);
    } else {
        monthly_goal = (FV - PV) / n;
    }
    // Solve for monthly in user's selected monthly currency
    let monthly = monthly_goal / avgMonthlyToGoalFX;

    // Generate value curves (both in monthly currency and goal currency)
    let valuesMonthly = [];
    let valuesGoal = [];
    let cumulative = convertAmount(budget, fxData.inputToGoal.current, inputCurrency, goalCurrency); // All in goal currency
    let fxCurve = fxData.monthlyToGoal.fxCurve;
    for (let i = 1; i <= n; ++i) {
        cumulative = cumulative * (1 + r) + monthly * fxCurve[i - 1];
        valuesGoal.push(cumulative);
        valuesMonthly.push(cumulative / fxCurve[i - 1]);
    }
    let finalValueGoal = valuesGoal[valuesGoal.length - 1];
    let totalInvestedMonthly = monthly * n;

    // Chart
    showChart(valuesMonthly, valuesGoal, monthlyCurrency, goalCurrency);

    // FX Panel
    document.getElementById('fx-panel').innerHTML = fxPanelHTML(fxData, inputCurrency, monthlyCurrency, goalCurrency, months);

    // Result Block
    document.getElementById('result-block').innerHTML = `
        <div class="result-block">
            To reach your goal of <strong>${currencySymbol(goalCurrency)}${goal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${goalCurrency}</strong>
            in <strong>${months} months</strong>:
            <span class="result-main">
                Invest <strong>${currencySymbol(monthlyCurrency)}${monthly.toFixed(2)} ${monthlyCurrency}</strong> per month
            </span>
            <br>
            <span>
                Projected withdrawal: <b>${currencySymbol(goalCurrency)}${finalValueGoal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${goalCurrency}</b>
            </span>
            <br>
            <small>(Assumes compounded monthly, FX prediction based on past 6 months)</small>
        </div>
    `;

    // Suggestion Box
    document.getElementById('suggestion-box').innerHTML = suggestionHTML({
        goal, months, rate, budget, inputCurrency, monthlyCurrency, goalCurrency, monthly, fxData, finalValueGoal, totalInvestedMonthly
    });
}

function currencySymbol(code) {
    return (CURRENCIES.find(c => c.code === code) || {}).symbol || '';
}

// Convert amount from base to target using fxRate (if base !== target), otherwise returns amount unchanged
function convertAmount(amount, fxRate, base, target) {
    if (base === target) return amount;
    return amount * fxRate;
}

function avgFX(fxCurve, current, n) {
    if (!fxCurve || fxCurve.length === 0) return current;
    let sum = fxCurve.slice(0, n).reduce((a, b) => a + b, 0);
    return sum / n;
}

// FX Panel HTML
function fxPanelHTML(fxData, inputCurrency, monthlyCurrency, goalCurrency, months) {
    let html = '';
    if (inputCurrency === goalCurrency && monthlyCurrency === goalCurrency) {
        html += `<div class="fx-panel">No currency conversion required — all in <b>${goalCurrency}</b>.</div>`;
        return html;
    }
    if (inputCurrency !== goalCurrency) {
        let confPct = (fxData.inputToGoal.confidence * 100).toFixed(1);
        html += `
            <div class="fx-panel">
                <b>Initial Investment FX:</b><br>
                1 ${inputCurrency} = ${fxData.inputToGoal.current.toFixed(4)} ${goalCurrency} (Current),
                Predicted: ${fxData.inputToGoal.pred.toFixed(4)} (${confPct}% confidence)
            </div>
        `;
    }
    if (monthlyCurrency !== goalCurrency) {
        let confPct = (fxData.monthlyToGoal.confidence * 100).toFixed(1);
        html += `
            <div class="fx-panel">
                <b>Monthly Contribution FX:</b><br>
                1 ${monthlyCurrency} = ${fxData.monthlyToGoal.current.toFixed(4)} ${goalCurrency} (Current),
                Predicted: ${fxData.monthlyToGoal.pred.toFixed(4)} (${confPct}% confidence)
            </div>
        `;
    }
    return html;
}

// Chart
function showChart(valuesMonthly, valuesGoal, monthlyCurrency, goalCurrency) {
    const ctx = document.getElementById('resultChart').getContext('2d');
    if (window.resultChartObj) window.resultChartObj.destroy();
    window.resultChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: valuesGoal.map((_, i) => `Month ${i + 1}`),
            datasets: [
                {
                    label: `Investment Value (${monthlyCurrency})`,
                    data: valuesMonthly,
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(25,118,210,0.11)',
                    fill: false,
                    tension: 0.15
                },
                {
                    label: `Investment Value (${goalCurrency})`,
                    data: valuesGoal,
                    borderColor: '#fbc02d',
                    backgroundColor: 'rgba(251,192,45,0.13)',
                    fill: false,
                    tension: 0.15
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Value' }
                },
                x: {
                    title: { display: true, text: 'Month' }
                }
            }
        }
    });
}

// Suggestion
function suggestionHTML({ goal, months, rate, budget, inputCurrency, monthlyCurrency, goalCurrency, monthly, fxData, finalValueGoal, totalInvestedMonthly }) {
    let suggestions = [];
    // If prediction confidence is low for monthly
    if (fxData.monthlyToGoal.confidence < 0.6 && monthlyCurrency !== goalCurrency) {
        suggestions.push(`⚠️ Currency prediction confidence is low for your monthly contribution. Consider contributing in your goal currency (${goalCurrency}) for more certainty.`);
    }
    // If monthly is high compared to budget, suggest increasing months
    if (monthly > budget * 0.15) {
        suggestions.push(`Consider increasing your investment period. For example, spreading your goal over ${months + 12} months could reduce your monthly investment.`);
    }
    // If finalValueGoal is close to the goal, all good
    if (finalValueGoal < goal * 0.98) {
        suggestions.push(`Due to predicted FX rate, your final withdrawal may fall short of your goal. Consider increasing your monthly investment or choosing a different contribution currency.`);
    }
    // Compare all currencies for monthly, suggest best
    let bestCurrency = monthlyCurrency;
    let minMonthly = monthly;
    for (let cur of CURRENCIES) {
        if (cur.code === monthlyCurrency) continue;
        // We'll use current rates for this quick suggestion
        let fxRate = fxData.monthlyToGoal.current;
        let monthly_other = monthly * (fxData.monthlyToGoal.current / fxRate);
        if (monthly_other < minMonthly) {
            minMonthly = monthly_other;
            bestCurrency = cur.code;
        }
    }
    if (bestCurrency !== monthlyCurrency) {
        suggestions.push(`Based on current predictions, contributing in <b>${bestCurrency}</b> may reduce your required monthly investment.`);
    }
    if (suggestions.length === 0) {
        suggestions.push(`Your plan looks solid! Stay consistent with your investments to reach your goal.`);
    }
    return `<div class="suggestion-box"><b>Suggestion:</b><br>${suggestions.join('<br>')}</div>`;
}

// App entrypoint
renderInputScreen();
