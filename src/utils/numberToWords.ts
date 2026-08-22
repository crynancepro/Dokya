/**
 * Utility to convert numbers to French words (useful for Senegalese/UEMOA legal invoices and quotes)
 */

const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIZAINES_SPECIALES = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

function convertUnderThousand(n: number): string {
  let result = '';

  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    if (hundreds === 1) {
      result += 'cent ';
    } else {
      result += UNITES[hundreds] + (remainder === 0 ? ' cents ' : ' cent ');
    }
  }

  if (remainder > 0) {
    if (remainder < 10) {
      result += UNITES[remainder] + ' ';
    } else if (remainder < 20) {
      result += DIZAINES_SPECIALES[remainder - 10] + ' ';
    } else if (remainder < 70) {
      const tens = Math.floor(remainder / 10);
      const units = remainder % 10;
      if (units === 1 && tens !== 8) {
        result += DIZAINES[tens] + ' et un ';
      } else if (units > 0) {
        result += DIZAINES[tens] + '-' + UNITES[units] + ' ';
      } else {
        result += DIZAINES[tens] + ' ';
      }
    } else if (remainder < 80) {
      const units = remainder - 60;
      if (units === 11) {
        result += 'soixante et onze ';
      } else {
        result += 'soixante-' + DIZAINES_SPECIALES[units - 10] + ' ';
      }
    } else if (remainder < 90) {
      const units = remainder % 10;
      if (units > 0) {
        result += 'quatre-vingt-' + UNITES[units] + ' ';
      } else {
        result += 'quatre-vingts ';
      }
    } else {
      const units = remainder - 80;
      result += 'quatre-vingt-' + DIZAINES_SPECIALES[units - 10] + ' ';
    }
  }

  return result.trim();
}

export function numberToFrenchWords(amount: number, currency: string = 'FCFA'): string {
  const getCurrencyLabel = (cur: string, amt: number) => {
    const isPlural = amt > 1;
    const cleanCur = (cur || 'FCFA').toUpperCase();
    if (cleanCur === 'FCFA' || cleanCur === 'XOF') {
      return 'Francs CFA';
    }
    if (cleanCur === 'EUR' || cleanCur === '€' || cleanCur === 'EURO') {
      return isPlural ? 'Euros' : 'Euro';
    }
    if (cleanCur === 'USD' || cleanCur === '$' || cleanCur === 'DOLLAR') {
      return isPlural ? 'Dollars US' : 'Dollar US';
    }
    return cur;
  };

  const currencyLabel = getCurrencyLabel(currency, amount);

  if (!amount || isNaN(amount) || amount === 0) return `Zéro ${currencyLabel}`;

  const intAmount = Math.floor(Math.abs(amount));
  let result = '';

  const millions = Math.floor(intAmount / 1000000);
  const thousands = Math.floor((intAmount % 1000000) / 1000);
  const remainder = intAmount % 1000;

  if (millions > 0) {
    if (millions === 1) {
      result += 'un million ';
    } else {
      result += convertUnderThousand(millions) + ' millions ';
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      result += 'mille ';
    } else {
      result += convertUnderThousand(thousands) + ' mille ';
    }
  }

  if (remainder > 0) {
    result += convertUnderThousand(remainder) + ' ';
  }

  const formatted = result.trim();
  if (!formatted) return `Zéro ${currencyLabel}`;

  // Capitalize first letter
  const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  return `${capitalized} ${currencyLabel}`;
}
