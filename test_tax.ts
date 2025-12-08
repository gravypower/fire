const brackets = [
  { min: 0, max: 18200, rate: 0 },
  { min: 18200, max: 45000, rate: 19 },
  { min: 45000, max: 120000, rate: 32.5 },
  { min: 120000, max: 180000, rate: 37 },
  { min: 180000, max: null, rate: 45 },
];

function calculateTax(income: number, brackets: any[]) {
  let totalTax = 0;
  
  console.log(`\nCalculating tax for income: $${income.toLocaleString()}`);
  console.log('---');
  
  for (const bracket of brackets) {
    const bracketMin = bracket.min;
    const bracketMax = bracket.max ?? Infinity;
    
    if (income <= bracketMin) {
      break;
    }
    
    const taxableInBracket = Math.min(income, bracketMax) - bracketMin;
    
    if (taxableInBracket > 0) {
      const tax = taxableInBracket * (bracket.rate / 100);
      console.log(`Bracket $${bracketMin.toLocaleString()}-$${bracketMax === Infinity ? '∞' : bracketMax.toLocaleString()}: $${taxableInBracket.toLocaleString()} @ ${bracket.rate}% = $${tax.toFixed(2)}`);
      totalTax += tax;
    }
  }
  
  console.log('---');
  console.log(`Total tax: $${totalTax.toFixed(2)}`);
  console.log(`Effective rate: ${(tax/income*100).toFixed(2)}%`);
  console.log(`Monthly tax: $${(totalTax/12).toFixed(2)}`);
  
  return totalTax;
}

// Test with $80,000 income
calculateTax(80000, brackets);

// Test with $50,000 income
calculateTax(50000, brackets);

// Test with $120,000 income
calculateTax(120000, brackets);
