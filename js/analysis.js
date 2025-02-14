export function analyzeFinancialBehavior() {
  try {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const goals = JSON.parse(localStorage.getItem('goals')) || [];
    const analysisDiv = document.getElementById('behaviorAnalysis');
    
    if (!analysisDiv) {
      console.error('Analysis div not found');
      return;
    }

    if (transactions.length === 0) {
      analysisDiv.innerHTML = '<p>Comienza a registrar transacciones para ver tu análisis financiero.</p>';
      return;
    }

    const analysis = {
      totalIncome: 0,
      totalExpenses: 0,
      necessaryExpenses: 0,
      unnecessaryExpenses: 0,
      totalSavings: 0,
      savingsRate: 0,
      categoryBreakdown: {},
      trend: 'stable',
      recommendations: [],
      completedGoals: goals.filter(g => g.completed).length,
      activeGoals: goals.filter(g => !g.completed).length
    };

    // Initialize category breakdown
    const categories = {
      food: 'Alimentación',
      bills: 'Servicios',
      health: 'Salud',
      housing: 'Vivienda',
      education: 'Educación',
      transport: 'Transporte',
      clothing: 'Ropa',
      insurance: 'Seguros',
      maintenance: 'Mantenimiento',
      entertainment: 'Entretenimiento',
      hobbies: 'Pasatiempos',
      dining: 'Restaurantes',
      shopping: 'Compras',
      travel: 'Viajes',
      salary: 'Salario',
      savings: 'Ahorro',
      other: 'Otros'
    };

    Object.keys(categories).forEach(cat => {
      analysis.categoryBreakdown[cat] = 0;
    });

    // Process transactions and calculate metrics
    processTransactions(transactions, analysis);

    // Calculate savings rate
    analysis.savingsRate = analysis.totalIncome > 0 ? 
      (analysis.totalSavings / analysis.totalIncome) * 100 : 0;

    // Determine trend
    determineTrend(analysis);

    // Generate insights and recommendations
    generateRecommendations(analysis);

    // Render analysis
    renderAnalysis(analysisDiv, analysis, categories);

  } catch (error) {
    console.error('Error in analyzeFinancialBehavior:', error);
  }
}

function processTransactions(transactions, analysis) {
  transactions.forEach(t => {
    if (t.amount > 0) {
      analysis.totalIncome += t.amount;
    } else {
      const absAmount = Math.abs(t.amount);
      analysis.categoryBreakdown[t.category] = (analysis.categoryBreakdown[t.category] || 0) + absAmount;
      
      if (t.goalContribution) {
        analysis.totalSavings += absAmount;
      }
      
      analysis.totalExpenses += absAmount;
      
      if (t.necessity === 'high' || t.necessity === 'medium') {
        analysis.necessaryExpenses += absAmount;
      } else if (!t.goalContribution) {
        analysis.unnecessaryExpenses += absAmount;
      }
    }
  });
}

function determineTrend(analysis) {
  const unnecessaryExpenseRatio = analysis.unnecessaryExpenses / analysis.totalExpenses;
  const savingsRatio = analysis.totalSavings / analysis.totalIncome;
  const expenseToIncomeRatio = analysis.totalExpenses / analysis.totalIncome;
  const necessaryExpenseRatio = analysis.necessaryExpenses / analysis.totalExpenses;
  
  // Define thresholds for each trend level
  if (savingsRatio > 0.3 && unnecessaryExpenseRatio < 0.2 && analysis.completedGoals > 2) {
    analysis.trend = 'exceptional';
  } else if (savingsRatio > 0.25 && unnecessaryExpenseRatio < 0.25) {
    analysis.trend = 'excellent';
  } else if (savingsRatio > 0.2 && unnecessaryExpenseRatio < 0.3) {
    analysis.trend = 'improving';
  } else if (savingsRatio > 0.15 && unnecessaryExpenseRatio < 0.35) {
    analysis.trend = 'stable';
  } else if (savingsRatio > 0.1 && unnecessaryExpenseRatio < 0.4) {
    analysis.trend = 'moderate';
  } else if (savingsRatio > 0.05 && unnecessaryExpenseRatio < 0.45) {
    analysis.trend = 'concerning';
  } else if (savingsRatio > 0.02 && unnecessaryExpenseRatio < 0.5) {
    analysis.trend = 'risky';
  } else if (expenseToIncomeRatio > 1) {
    analysis.trend = 'critical';
  } else {
    analysis.trend = 'unstable';
  }
}

function generateRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.savingsRate < 20) {
    recommendations.push('Considera aumentar tu tasa de ahorro al 20% de tus ingresos');
  }
  
  if (analysis.unnecessaryExpenses > analysis.necessaryExpenses * 0.3) {
    recommendations.push('Los gastos no esenciales son elevados, considera reducirlos');
  }
  
  if (analysis.trend === 'declining') {
    recommendations.push('Tu balance está disminuyendo, revisa tus gastos recientes');
  }
  
  analysis.recommendations = recommendations;
}

function renderAnalysis(analysisDiv, analysis, categories) {
  analysisDiv.innerHTML = `
    <div class="analysis-grid">
      <div class="analysis-item">
        <h4>Resumen General</h4>
        <ul>
          <li>Ingresos Totales: $${analysis.totalIncome.toFixed(2)}</li>
          <li>Gastos Totales: $${analysis.totalExpenses.toFixed(2)}</li>
          <li>Ahorros Totales: $${analysis.totalSavings.toFixed(2)}</li>
          <li>Tasa de Ahorro: ${analysis.savingsRate.toFixed(1)}%</li>
        </ul>
      </div>
      
      <div class="analysis-item">
        <h4>Objetivos</h4>
        <p>Completados: ${analysis.completedGoals}</p>
        <p>Activos: ${analysis.activeGoals}</p>
      </div>

      <div class="analysis-item">
        <h4>Distribución de Gastos por Categoría</h4>
        <div class="category-breakdown">
          ${Object.entries(analysis.categoryBreakdown)
            .filter(([_, amount]) => amount > 0)
            .sort(([_, a], [__, b]) => b - a)
            .map(([category, amount]) => `
              <div class="category-item">
                <span>${categories[category]}</span>
                <span>$${amount.toFixed(2)}</span>
              </div>
            `).join('')}
        </div>
      </div>

      <div class="analysis-item">
        <h4>Tendencia</h4>
        <p class="${getTrendClass(analysis.trend)}">
          ${getTrendText(analysis.trend)}
        </p>
      </div>
    </div>

    <div class="recommendations">
      <h4>Recomendaciones</h4>
      <ul>
        ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
  `;
}

function getTrendText(trend) {
  const trends = {
    'exceptional': ' Excepcional - ¡Finanzas sobresalientes!',
    'excellent': ' Excelente - Mantén el gran trabajo',
    'improving': ' Mejorando - En el camino correcto',
    'stable': ' Estable - Consistente y balanceado',
    'moderate': ' Moderado - Oportunidad de mejora',
    'concerning': ' Preocupante - Necesita atención',
    'risky': ' Riesgoso - Requiere acción inmediata',
    'critical': ' Crítico - Situación financiera delicada',
    'unstable': ' Inestable - Necesita restructuración urgente'
  };
  
  return trends[trend] || ' Estable';
}

function getTrendClass(trend) {
  switch(trend) {
    case 'exceptional':
    case 'excellent':
      return 'positive';
    case 'improving':
      return 'improving';
    case 'stable':
      return 'neutral';
    case 'moderate':
    case 'concerning':
      return 'concerning';
    case 'risky':
    case 'critical':
    case 'unstable':
      return 'negative';
    default:
      return 'neutral';
  }
}