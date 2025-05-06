import { initializeCharts } from './charts.js';
import { showNotification } from './notifications.js';
import { analyzeFinancialBehavior } from './analysis.js';

// Global state
let currentTransactionType = 'income';
let isListening = false;
let recognition = null;

/**
 * Initializes the application by updating the dashboard and setting up voice recognition.
 */
export function initializeApp() {
  updateDashboard();

  setupVoiceRecognition();
}

function setupVoiceRecognition() {
  if (document.getElementById('voiceInputBtn')) {
    initializeSpeechRecognition(); // Initialize speech recognition if voice button exists
  }
}

// Dashboard update functions
export function updateDashboard() {
  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  
  updateTotalBalance(transactions);
  setupCharts();
  generateRecommendations();
  updateAlerts();
}

/**
 * Generates financial recommendations based on the user's transactions and goals.
 * It checks for savings rate, unnecessary expenses, and overdue goals,
 * then updates the recommendations list in the UI.
 */
export function generateRecommendations() {
  const recommendationsList = document.getElementById('recommendationsList');
  if (!recommendationsList) return;

  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  const goals = JSON.parse(localStorage.getItem('goals')) || [];
  
  let recommendations = [];
  
  const lastMonthTransactions = getLastMonthTransactions(transactions);
  
  const totalIncome = lastMonthTransactions.reduce((sum, t) => t.amount > 0 ? sum + t.amount : sum, 0);
  const totalExpenses = lastMonthTransactions.reduce((sum, t) => t.amount < 0 ? sum + Math.abs(t.amount) : sum, 0);
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Generate recommendations
  if (savingsRate < 20) {
    recommendations.push({
      title: 'Aumenta tu tasa de ahorro',
      message: 'Intenta ahorrar al menos el 20% de tus ingresos mensuales.',
      type: 'warning'
    });
  }

  const unnecessaryExpenses = lastMonthTransactions.filter(t => 
    t.amount < 0 && t.necessity === 'low'
  ).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (unnecessaryExpenses > totalIncome * 0.3) {
    recommendations.push({
      title: 'Gastos no esenciales elevados',
      message: 'Los gastos en categorías no esenciales superan el 30% de tus ingresos.',
      type: 'warning'
    });
  }

  const overdueGoals = goals.filter(g => {
    const deadline = new Date(g.date);
    return !g.completed && deadline < new Date();
  });

  if (overdueGoals.length > 0) {
    recommendations.push({
      title: 'Objetivos atrasados',
      message: `Tienes ${overdueGoals.length} objetivo(s) financiero(s) atrasado(s).`,
      type: 'error'
    });
  }

  // Update recommendations list
  recommendationsList.innerHTML = recommendations.length > 0 ? 
    recommendations.map(rec => `
      <div class="alert ${rec.type}">
        <div class="alert-icon">${rec.type === 'warning' ? '⚠️' : '❌'}</div>
        <div class="alert-content">
          <h4>${rec.title}</h4>
          <p>${rec.message}</p>
        </div>
      </div>
    `).join('') :
    '<p>¡Buen trabajo! No hay recomendaciones pendientes.</p>';
}

/**
 * Updates the alerts list in the UI based on the user's transactions and goals.
 * Checks for low balance, upcoming goal deadlines, and unusual spending patterns.
 */
export function updateAlerts() {
  const alertsList = document.getElementById('alertsList');
  if (!alertsList) return;

  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  const goals = JSON.parse(localStorage.getItem('goals')) || [];
  const alerts = [];
  // Check for low balance
  const balance = transactions.reduce((sum, t) => sum + t.amount, 0);
  if (balance < 100) {
    alerts.push({
      title: 'Balance bajo',
      message: 'Tu balance actual está por debajo de $100',
      type: 'warning'
    });
  }

  const today = new Date();
  goals.forEach(goal => {
    if (!goal.completed) {
      const deadline = new Date(goal.date);
      const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline > 0 && daysUntilDeadline <= 7) {
        alerts.push({
          title: 'Objetivo próximo a vencer',
          message: `"${goal.name}" vence en ${daysUntilDeadline} días`,
          type: 'warning'
        });
      } else if (daysUntilDeadline <= 0) {
        alerts.push({
          title: 'Objetivo vencido',
          message: `"${goal.name}" ha vencido`,
          type: 'error'
        });
      }
    }
  });

  const lastWeekExpenses = transactions.filter(t => {
    const date = new Date(t.date);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return date >= lastWeek && t.amount < 0;
  });

  const averageWeeklyExpense = Math.abs(lastWeekExpenses.reduce((sum, t) => sum + t.amount, 0));
  if (averageWeeklyExpense > 1000) {
    alerts.push({
      title: 'Gasto semanal elevado',
      message: 'Tus gastos esta semana son más altos de lo usual',
      type: 'warning'
    });
  }

  // Update alerts list
  alertsList.innerHTML = alerts.length > 0 ? 
    alerts.map(alert => `
      <div class="alert ${alert.type}">
        <div class="alert-icon">${alert.type === 'warning' ? '⚠️' : '❌'}</div>
        <div class="alert-content">
          <h4>${alert.title}</h4>
          <p>${alert.message}</p>
        </div>
      </div>
    `).join('') :
    '<p>No hay alertas pendientes.</p>';
}

/**
 * Initializes speech recognition if the browser supports it.
 */
function initializeSpeechRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'es-ES';

    recognition.onresult = function(event) {
      const text = event.results[0][0].transcript.toLowerCase();
      processVoiceCommand(text);
    };

    recognition.onerror = function(event) {
      showNotification('Error', 'No se pudo reconocer el comando de voz', 'error');
      stopListening();
    };

    recognition.onend = function() {
      stopListening();
    };
  } else {
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) voiceBtn.style.display = 'none';
  }
}

/**
 * Toggles the voice input functionality on and off.
 */
export function toggleVoiceInput() {
  if (!isListening) {
    startListening();
  } else {
    stopListening();
  }
}

/**
 * Starts the speech recognition process.
 */
function startListening() {
  if (recognition) {
    recognition.start();
    isListening = true;
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) voiceBtn.classList.add('listening');
    showNotification('Escuchando...', 'Di "gasto" o "ingreso" seguido del monto y la descripción', 'info');
  }
}

/**
 * Stops the speech recognition process.
 */
function stopListening() {
  if (recognition) {
    recognition.stop();
    isListening = false;
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
  }
}

/**
 * Processes the voice command text to perform actions.
 */
function processVoiceCommand(text) {
  // Voice command processing logic here
  console.log('Processing voice command:', text);
}


document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Closes a modal by its ID.
 */
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
};

window.showTransactionModal = function(type) {
  currentTransactionType = type;
  const modal = document.getElementById('transactionModal');
  if (modal) {
    modal.style.display = 'block';
    document.querySelector('#transactionModal h2').textContent = 
      type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Gasto';
    
    // Update goal contribution select options
    const goalContribSelect = document.getElementById('goalContribution');
    if (goalContribSelect) {
      const goals = JSON.parse(localStorage.getItem('goals')) || [];
      const activeGoals = goals.filter(g => !g.completed);
      
      goalContribSelect.innerHTML = '<option value="none">Ninguna meta</option>' +
        activeGoals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    }
  }
};

/**
 * Updates the total balance displayed on the dashboard.
 *
 * @param {Array} transactions - An array of transaction objects.
 */
function updateTotalBalance(transactions) {
  const totalBalance = document.getElementById('totalBalance');
  if (totalBalance) {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    totalBalance.textContent = total.toFixed(2);
  }
}

/**
 * Initializes the charts if the necessary chart elements are present.
 */
function setupCharts() {
  const hasCharts = document.getElementById('monthlyChart');
  if (hasCharts) {
    initializeCharts();
  }
}

/**
 * Retrieves transactions from the last month.
 *
 * @param {Array} transactions - An array of transaction objects.
 * @returns {Array} - An array of transactions from the last month.
 */
function getLastMonthTransactions(transactions) {
  return transactions.filter(t => {
    const date = new Date(t.date);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return date >= lastMonth;
  });
}


