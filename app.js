const root = document.getElementById('app-root');

function renderFinancialUI() {
  root.innerHTML = `
    <div class="material-card" id="financial-card">
      <div class="heading">Financial Goal Planner</div>
      <div class="app-content-title">Plan Your Investment</div>
      <form id="financial-form" autocomplete="off">
        <div class="financial-form-2col">
          <div class="financial-form-row">
            <label for="goal">Goal (e.g., Target Amount):</label>
            <input type="number" id="goal" required placeholder="e.g., 100000" min="0">
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
            <label for="budget">Initial Investment (€):</label>
            <input type="number" id="budget" required placeholder="e.g., 10000" min="0">
          </div>
        </div>
        <button type="submit" class="calc-btn">Calculate Plan</button>
      </form>
      <div id="financial-result"></div>
    </div>
  `;

  root.querySelector("#financial-form").onsubmit = function (e) {
    e.preventDefault();
    const goal = parseFloat(root.querySelector("#goal").value) || 0;
    const months = parseInt(root.querySelector("#months").value) || 1;
    const rate = parseFloat(root.querySelector("#rate").value) || 0;
    const budget = parseFloat(root.querySelector("#budget").value) || 0;

    let r = rate / 100 / 12; // monthly rate
    let n = months;
    let FV = goal;
    let PV = budget;
    let monthly;
    if (r > 0) {
      monthly = (FV - PV * Math.pow(1 + r, n)) * r / (Math.pow(1 + r, n) - 1);
    } else {
      monthly = (FV - PV) / n;
    }

    let showResult = monthly > 0 && isFinite(monthly) && n > 0 && FV > PV;
    root.querySelector("#financial-result").innerHTML = showResult
      ? `
      <div class="result-block">
        To reach your goal of <strong>€${goal.toLocaleString()}</strong> in <strong>${months} months</strong> with an initial investment of <strong>€${budget.toLocaleString()}</strong> and an expected annual return of <strong>${rate}%</strong>:
        <span class="result-main">
          Invest <strong>€${monthly.toFixed(2)}</strong> per month
        </span>
        <small>(Assumes compounded monthly; for illustration purposes only.)</small>
      </div>
      `
      : `
      <div class="result-block" style="color:#e43f5a;">
        <strong>Please check your inputs.</strong> Goal should be greater than initial investment, and months > 0.
      </div>
      `;
  };
}

renderFinancialUI();