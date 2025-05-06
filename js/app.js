import { initializeCharts } from './charts.js';
import { showNotification } from './notifications.js';
import { analyzeFinancialBehavior } from './analysis.js';

// Global state
let currentTransactionType = 'income';
let isListening = false;
let recognition = null;

// Initialize the application
export function initializeApp() {
  // Update UI based on stored data
  updateDashboard();

  // Initialize speech recognition if voice button exists
  const voiceBtn = document.getElementById('voiceInputBtn');
  if (voiceBtn) {
    initializeSpeechRecognition();
  }
}

// Dashboard update functions
export function updateDashboard() {
  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  
  // Update total balance
  const totalBalance = document.getElementById('totalBalance');
  if (totalBalance) {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    totalBalance.textContent = total.toFixed(2);
  }

  // Initialize charts if they exist
  const hasCharts = document.getElementById('monthlyChart');
  if (hasCharts) {
    initializeCharts();
  }

  // Update recommendations and alerts
  generateRecommendations();
  updateAlerts();
}

export function generateRecommendations() {
  const recommendationsList = document.getElementById('recommendationsList');
  if (!recommendationsList) return;

  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  const goals = JSON.parse(localStorage.getItem('goals')) || [];
  
  let recommendations = [];

  // Calculate metrics
  const lastMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return date >= lastMonth;
  });

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

  // Check for upcoming goal deadlines
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

  // Check for unusual spending patterns
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

// Voice input handling
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

export function toggleVoiceInput() {
  if (!isListening) {
    startListening();
  } else {
    stopListening();
  }
}

function startListening() {
  if (recognition) {
    recognition.start();
    isListening = true;
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) voiceBtn.classList.add('listening');
    showNotification('Escuchando...', 'Di "gasto" o "ingreso" seguido del monto y la descripción', 'info');
  }
}

function stopListening() {
  if (recognition) {
    recognition.stop();
    isListening = false;
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
  }
}

function processVoiceCommand(text) {
  // Voice command processing logic here
  console.log('Processing voice command:', text);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Make functions available globally
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

window.toggleVoiceInput = toggleVoiceInput;