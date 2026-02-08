import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
}

export interface ParsedStatement {
  cardName: string;
  cardLastFour: string;
  statementPeriod: string;
  transactions: Transaction[];
  totalSpend: number;
  creditLimit?: number;
  minimumDue?: number;
  previousBalance?: number;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

export function parseTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  const datePattern = /(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{2}\s+[A-Z]{3}\s+\d{4})/i;
  const amountPattern = /(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 10) continue;
    const dateMatch = line.match(datePattern);
    const amountMatch = line.match(amountPattern);
    if (dateMatch && amountMatch) {
      const date = dateMatch[1];
      const amountStr = amountMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      const description = line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim().substring(0, 50);
      if (amount > 0 && description.length > 3) {
        transactions.push({
          date,
          description,
          amount,
          type: 'debit',
          category: categorizeTransaction(description)
        });
      }
    }
  }
  return transactions;
}

export function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('food') || 
      desc.includes('zomato') || desc.includes('swiggy') || desc.includes('dominos') ||
      desc.includes('mcdonald') || desc.includes('starbucks')) return 'Dining';
  if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra') ||
      desc.includes('shop') || desc.includes('store') || desc.includes('mall')) return 'Shopping';
  if (desc.includes('uber') || desc.includes('ola') || desc.includes('airline') ||
      desc.includes('hotel') || desc.includes('booking') || desc.includes('makemytrip') ||
      desc.includes('flight') || desc.includes('irctc')) return 'Travel';
  if (desc.includes('grofers') || desc.includes('bigbasket') || desc.includes('dmart') ||
      desc.includes('reliance fresh') || desc.includes('grocery') || desc.includes('supermarket')) return 'Groceries';
  if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas') ||
      desc.includes('mobile') || desc.includes('recharge') || desc.includes('bill payment') ||
      desc.includes('paytm') || desc.includes('phonepe')) return 'Bills';
  if (desc.includes('online') || desc.includes('e-commerce') || desc.includes('digital')) return 'Online Shopping';
  return 'Others';
}

export function extractCardDetails(text: string): Partial<ParsedStatement> {
  const details: Partial<ParsedStatement> = {};
  const banks = ['HDFC', 'SBI', 'ICICI', 'AXIS', 'Kotak', 'Citi', 'American Express', 'AMEX'];
  for (const bank of banks) {
    if (text.toUpperCase().includes(bank.toUpperCase())) {
      details.cardName = bank + ' Credit Card';
      break;
    }
  }
  const cardPattern = /(?:card|account)\s*(?:number|no\.?)?\s*[:\-]?\s*[X*]{4,12}(\d{4})/i;
  const cardMatch = text.match(cardPattern);
  if (cardMatch) details.cardLastFour = cardMatch[1];
  const limitPattern = /(?:credit\s*limit|total\s*limit)[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i;
  const limitMatch = text.match(limitPattern);
  if (limitMatch) details.creditLimit = parseFloat(limitMatch[1].replace(/,/g, ''));
  const minDuePattern = /(?:minimum\s*(?:amount\s*)?due|min\.?\s*due)[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i;
  const minDueMatch = text.match(minDuePattern);
  if (minDueMatch) details.minimumDue = parseFloat(minDueMatch[1].replace(/,/g, ''));
  return details;
}

export async function parseCreditCardStatement(file: File): Promise<ParsedStatement> {
  try {
    const text = await extractTextFromPDF(file);
    const transactions = parseTransactions(text);
    const cardDetails = extractCardDetails(text);
    const totalSpend = transactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    return {
      cardName: cardDetails.cardName || 'Unknown Card',
      cardLastFour: cardDetails.cardLastFour || '****',
      statementPeriod: 'Last Month',
      transactions,
      totalSpend,
      creditLimit: cardDetails.creditLimit,
      minimumDue: cardDetails.minimumDue,
      previousBalance: cardDetails.previousBalance
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse credit card statement');
  }
}
