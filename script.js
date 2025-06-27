const form = document.getElementById('transaction-form');
const list = document.getElementById('transaction-list');
const totalSpan = document.getElementById('total');
const incomeSpan = document.getElementById('total-income');
const expenseSpan = document.getElementById('total-expense');
const ctx = document.getElementById('finance-chart').getContext('2d');
const catCtx = document.getElementById('category-chart').getContext('2d');
const startInput = document.getElementById('filter-start');
const endInput = document.getElementById('filter-end');
const categoryInput = document.getElementById('category');
const importJsonInput = document.getElementById('import-json');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let filteredTransactions = [...transactions];

const chart = new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ['Ingresos', 'Gastos'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#2ecc71', '#e74c3c']
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#333' } }
    }
  }
});

const categoryChart = new Chart(catCtx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Gastos por Categoría',
      data: [],
      backgroundColor: '#42a5f5'
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#333' },
        grid: { color: '#ccc' }
      },
      x: {
        ticks: { color: '#333' },
        grid: { color: '#ccc' }
      }
    }
  }
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const description = document.getElementById('description').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;
  const category = categoryInput.value;
  const date = document.getElementById('date').value;
  if (!description || isNaN(amount) || !date || amount <= 0) return;
  const transaction = { description, amount, type, date, category };
  transactions.push(transaction);
  localStorage.setItem('transactions', JSON.stringify(transactions));
  applyDateFilter();
  form.reset();
});

function updateUI(data) {
  list.innerHTML = '';
  let income = 0, expense = 0;
  const categoryTotals = {};

  data.forEach((tx, i) => {
    const li = document.createElement('li');
    li.className = tx.type;
    li.innerHTML = `
      ${tx.date} - ${tx.description} (${tx.category}) - $${tx.amount.toFixed(2)}
      <div>
        <button onclick="editTransaction(${i})">✏️</button>
        <button onclick="deleteTransaction(${i})">❌</button>
      </div>
    `;
    list.appendChild(li);
    if (tx.type === 'ingreso') income += tx.amount;
    else {
      expense += tx.amount;
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    }
  });

  totalSpan.textContent = (income - expense).toFixed(2);
  incomeSpan.textContent = income.toFixed(2);
  expenseSpan.textContent = expense.toFixed(2);

  chart.data.datasets[0].data = [income, expense];
  chart.update();

  categoryChart.data.labels = Object.keys(categoryTotals);
  categoryChart.data.datasets[0].data = Object.values(categoryTotals);
  categoryChart.update();
}

function deleteTransaction(index) {
  if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;
  const actualIndex = transactions.findIndex((t, i) => t === filteredTransactions[index]);
  if (actualIndex > -1) transactions.splice(actualIndex, 1);
  localStorage.setItem('transactions', JSON.stringify(transactions));
  applyDateFilter();
}

function editTransaction(index) {
  const tx = filteredTransactions[index];
  const actualIndex = transactions.findIndex(t => t === tx);
  if (actualIndex === -1) return;

  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = `
    <div class="modal">
      <h3>Editar Movimiento</h3>
      <form id="edit-form">
        <input type="text" id="edit-description" value="${tx.description}" required />
        <input type="number" id="edit-amount" value="${tx.amount}" required />
        <select id="edit-type">
          <option value="ingreso" ${tx.type === 'ingreso' ? 'selected' : ''}>Ingreso</option>
          <option value="gasto" ${tx.type === 'gasto' ? 'selected' : ''}>Gasto</option>
        </select>
        <select id="edit-category">
          <option value="general" ${tx.category === 'general' ? 'selected' : ''}>General</option>
          <option value="comida" ${tx.category === 'comida' ? 'selected' : ''}>Comida</option>
          <option value="transporte" ${tx.category === 'transporte' ? 'selected' : ''}>Transporte</option>
          <option value="servicios" ${tx.category === 'servicios' ? 'selected' : ''}>Servicios</option>
          <option value="educacion" ${tx.category === 'educacion' ? 'selected' : ''}>Educación</option>
          <option value="salud" ${tx.category === 'salud' ? 'selected' : ''}>Salud</option>
          <option value="otros" ${tx.category === 'otros' ? 'selected' : ''}>Otros</option>
        </select>
        <input type="date" id="edit-date" value="${tx.date}" required />
        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="save-btn">Guardar</button>
          <button type="button" id="cancel-edit" class="cancel-btn">Cancelar</button>
        </div>
      </form>
    </div>
  `;
  modalContainer.style.display = 'flex';

  document.getElementById('edit-form').onsubmit = (e) => {
    e.preventDefault();
    const updated = {
      description: document.getElementById('edit-description').value.trim(),
      amount: parseFloat(document.getElementById('edit-amount').value),
      type: document.getElementById('edit-type').value,
      category: document.getElementById('edit-category').value,
      date: document.getElementById('edit-date').value
    };
    if (!updated.description || isNaN(updated.amount) || updated.amount <= 0 || !updated.date) {
      alert('Por favor completá todos los campos correctamente.');
      return;
    }
    transactions[actualIndex] = updated;
    localStorage.setItem('transactions', JSON.stringify(transactions));
    modalContainer.innerHTML = '';
    modalContainer.style.display = 'none';
    applyDateFilter();
  };

  document.getElementById('cancel-edit').onclick = () => {
    modalContainer.innerHTML = '';
    modalContainer.style.display = 'none';
  };
}


function applyDateFilter() {
  const start = startInput.value;
  const end = endInput.value;
  filteredTransactions = transactions.filter(t => {
    return (!start || t.date >= start) && (!end || t.date <= end);
  });
  updateUI(filteredTransactions);
}

function clearFilter() {
  startInput.value = '';
  endInput.value = '';
  filteredTransactions = [...transactions];
  updateUI(filteredTransactions);
}

function exportToCSV() {
  let csv = 'Fecha,Descripción,Monto,Tipo,Categoría\n';
  filteredTransactions.forEach(tx => {
    csv += `${tx.date},${tx.description},${tx.amount},${tx.type},${tx.category}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finanzas.csv';
  a.click();
}

function exportToJSON() {
  const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finanzas.json';
  a.click();
}

importJsonInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data)) {
        transactions = data;
        localStorage.setItem('transactions', JSON.stringify(transactions));
        clearFilter();
      } else {
        alert('El archivo no tiene un formato válido.');
      }
    } catch (err) {
      alert('Error al importar el archivo.');
    }
  };
  reader.readAsText(file);
});

function exportAsPNG() {
  const element = document.getElementById('export-area');
  html2canvas(element, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
    const link = document.createElement('a');
    link.download = 'finanzas.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

async function exportAsPDF() {
  const element = document.getElementById('export-area');
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save('finanzas.pdf');
}

clearFilter();
