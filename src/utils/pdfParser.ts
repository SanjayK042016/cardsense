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

function parseHDFCTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  // HDFC format: 16/12/2025| 22:52 EMI AMAZON SELLER SERVICESMUMBAI + 225 C 6,803.00 l
  // Reward may or may not be present: "+ 225 C amount" or "+ C amount"
  const pattern = /(\d{2}\/\d{2}\/\d{4})\|\s*\d{2}:\d{2}\s+(.+?)\s+[+\-]\s*(?:\d+\s+)?C\s*([\d,]+\.?\d*)/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const date = match[1];
    const description = match[2].trim();
    const amountStr = match[3].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    if (amount > 0 && description.length > 5) {
      const isPayment = /payment|bppy|reversal/i.test(description);
      if (!isPayment) {
        transactions.push({
          date,
          description: description.substring(0, 60),
          amount,
          type: 'debit',
          category: categorizeTransaction(description)
        });
      }
    }
  }

  return transactions;
}

function parseAxisTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  // AXIS format: 16/11/2025 UPI/SWIGGY/... RESTAURANTS 504.00 Dr 15.00 Cr
  const pattern = /(\d{2}\/\d{2}\/\d{4})\s+((?:UPI\/|REVERSAL|WWW|BB|CC|GST|FUEL|CASH).+?)\s+([A-Z][A-Z\s]+?)\s+([\d,]+\.?\d*)\s+Dr\s+[\d,.]+\s+Cr/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const date = match[1];
    const description = match[2].trim();
    const amountStr = match[4].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    if (amount > 0 && description.length > 5) {
      const isPayment = /payment|reversal|cashback rebate|fuel cashback/i.test(description);
      if (!isPayment) {
        transactions.push({
          date,
          description: description.substring(0, 60),
          amount,
          type: 'debit',
          category: categorizeTransaction(description)
        });
      }
    }
  }

  return transactions;
}

function parseGenericTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.length < 20) continue;

    const dateMatch = line.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
    if (!dateMatch) continue;

    const amountMatch = line.match(/([\d,]+\.\d{2})\s*(?:Dr|DR|Debit)/i);
    if (!amountMatch) continue;

    const date = dateMatch[1];
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    if (amount < 1) continue;

    const description = line
      .replace(dateMatch[0], '')
      .replace(amountMatch[0], '')
      .trim()
      .substring(0, 60);

    if (description.length < 5) continue;

    const isPayment = /payment|reversal/i.test(description);
    if (!isPayment) {
      transactions.push({
        date,
        description,
        amount,
        type: 'debit',
        category: categorizeTransaction(description)
      });
    }
  }

  return transactions;
}

export function parseTransactions(text: string): Transaction[] {
  // Detect bank first
  const isHDFC = /HDFC\s+BANK/i.test(text);
  const isAxis = /AXIS\s+BANK/i.test(text);

  if (isHDFC) {
    const transactions = parseHDFCTransactions(text);
    console.log(`✅ HDFC format detected: ${transactions.length} transactions`);
    return transactions;
  }

  if (isAxis) {
    const transactions = parseAxisTransactions(text);
    console.log(`✅ Axis Bank format detected: ${transactions.length} transactions`);
    return transactions;
  }

  // Fallback
  const transactions = parseGenericTransactions(text);
  console.log(`⚠️ Generic parser used: ${transactions.length} transactions`);
  return transactions;
}

export function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();

  if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('restaurant') ||
      desc.includes('cafe') || desc.includes('food') || desc.includes('dominos') ||
      desc.includes('mcdonald') || desc.includes('starbucks') || desc.includes('pizza') ||
      desc.includes('burger') || desc.includes('kitchen') || desc.includes('dining') ||
      desc.includes('eternal limited') || desc.includes('mumbai masti') ||
      desc.includes('kfc') || desc.includes('chai') || desc.includes('biryani')) {
    return 'Dining';
  }

  if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra') ||
      desc.includes('lifestyle') || desc.includes('fashion') || desc.includes('clothing') ||
      desc.includes('apparel') || desc.includes('cloth')) {
    return 'Shopping';
  }

  if (desc.includes('uber') || desc.includes('ola') || desc.includes('airline') ||
      desc.includes('hotel') || desc.includes('booking') || desc.includes('makemytrip') ||
      desc.includes('flight') || desc.includes('irctc') || desc.includes('taxi') ||
      desc.includes('travel') || desc.includes('rapido')) {
    return 'Travel';
  }

  if (desc.includes('grofers') || desc.includes('bigbasket') || desc.includes('dmart') ||
      desc.includes('reliance fresh') || desc.includes('grocery') || desc.includes('supermarket') ||
      desc.includes('instamart') || desc.includes('hypermarket') || desc.includes('fresh mart')) {
    return 'Groceries';
  }

  if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas') ||
      desc.includes('jio') || desc.includes('airtel') || desc.includes('bsnl') ||
      desc.includes('postpaid') || desc.includes('broadband') || desc.includes('utility')) {
    return 'Bills';
  }

  if (desc.includes('medical') || desc.includes('hospital') || desc.includes('pharmacy') ||
      desc.includes('clinic') || desc.includes('doctor') || desc.includes('apollo') ||
      desc.includes('narayana') || desc.includes('nhl') || desc.includes('iskin') ||
      desc.includes('healthflex')) {
    return 'Medical';
  }

  if (desc.includes('netflix') || desc.includes('prime') || desc.includes('hotstar') ||
      desc.includes('spotify') || desc.includes('sonyliv') || desc.includes('zee5') ||
      desc.includes('entertainment')) {
    return 'Entertainment';
  }

  if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('filling station')) {
    return 'Fuel';
  }

  if (desc.includes('dept store') || desc.includes('dept stores') || desc.includes('misc store') ||
      desc.includes('miscellaneous')) {
    return 'Shopping';
  }

  return 'Others';
}

export function extractCardDetails(text: string): Partial<ParsedStatement> {
  const details: Partial<ParsedStatement> = {};

  // Bank detection - order matters, check AXIS before generic patterns
  const bankPatterns = [
    { name: 'AXIS', pattern: /AXIS\s+BANK/i },
    { name: 'HDFC', pattern: /HDFC\s+BANK/i },
    { name: 'SBI', pattern: /STATE\s+BANK/i },
    { name: 'ICICI', pattern: /ICICI\s+BANK/i },
    { name: 'Kotak', pattern: /KOTAK/i },
    { name: 'IndusInd', pattern: /INDUSIND/i },
    { name: 'Yes Bank', pattern: /YES\s+BANK/i },
  ];

  for (const bank of bankPatterns) {
    if (bank.pattern.test(text)) {
      details.cardName = bank.name + ' Credit Card';
      console.log(`🏦 Bank detected: ${bank.name}`);
      break;
    }
  }

  // Card number - last 4 digits
  const cardPatterns = [
    /Credit\s+Card\s+No\.?\s*[:\-]?\s*\d+[X*]+(\d{4})/i,
    /Card\s+No\.?\s*[:\-]?\s*\d+[X*]+(\d{4})/i,
    /\d{6}[*]+(\d{4})/,
    /[X*]{12}(\d{4})/,
  ];

  for (const pattern of cardPatterns) {
    const match = text.match(pattern);
    if (match) {
      details.cardLastFour = match[1];
      console.log(`💳 Card ending: ${match[1]}`);
      break;
    }
  }

  // Credit limit - bank specific patterns
  const isAxis = /AXIS\s+BANK/i.test(text);
  const isHDFC = /HDFC\s+BANK/i.test(text);

  if (isAxis) {
    // AXIS: card number line has "652984******6192 500,000.00 467,785.74 50,000.00"
    // First number after masked card = credit limit
    const axisLimit = text.match(/\d{6}\*+\d{4}\s+([\d,]+\.?\d*)/);
    if (axisLimit) {
      const limit = parseFloat(axisLimit[1].replace(/,/g, ''));
      if (limit >= 10000) {
        details.creditLimit = limit;
        console.log(`💰 AXIS Credit limit: ₹${limit.toLocaleString('en-IN')}`);
      }
    }
  } else if (isHDFC) {
    // HDFC: Line format is "C9,42,000 C9,23,518 C3,76,800" (limit, available, cash limit)
    // Find 3 consecutive C-numbers, largest is the total credit limit
    const hdfcLimit = text.match(/C([\d,]+)\s+C([\d,]+)\s+C([\d,]+)/);
    if (hdfcLimit) {
      const vals = [hdfcLimit[1], hdfcLimit[2], hdfcLimit[3]]
        .map(v => parseFloat(v.replace(/,/g, '')));
      const limit = Math.max(...vals);
      if (limit >= 10000) {
        details.creditLimit = limit;
        console.log(`💰 HDFC Credit limit: ₹${limit.toLocaleString('en-IN')}`);
      }
    }
  }

  // Fallback generic limit patterns
  if (!details.creditLimit) {
    const limitPatterns = [
      /(?:Total\s+)?Credit\s+Limit\s+([\d,]+\.?\d*)/i,
      /TOTAL\s+CREDIT\s+LIMIT[^C]*C([\d,]+)/i,
    ];
    for (const pattern of limitPatterns) {
      const match = text.match(pattern);
      if (match) {
        const limit = parseFloat(match[1].replace(/,/g, ''));
        if (limit >= 10000 && limit <= 10000000) {
          details.creditLimit = limit;
          console.log(`💰 Credit limit (fallback): ₹${limit.toLocaleString('en-IN')}`);
          break;
        }
      }
    }
  }

  // Minimum due
  const minDuePatterns = [
    /MINIMUM\s+DUE\s*[₹C]?\s*([\d,]+\.?\d*)/i,
    /Minimum\s+(?:Amount\s+)?(?:Payment\s+)?Due\s*[:\-]?\s*([\d,]+\.?\d*)\s*Dr/i,
  ];

  for (const pattern of minDuePatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0 && amount < 1000000) {
        details.minimumDue = amount;
        console.log(`📋 Minimum due: ₹${amount}`);
        break;
      }
    }
  }

  return details;
}

export async function parseCreditCardStatement(file: File): Promise<ParsedStatement> {
  try {
    console.log(`\n🔍 Parsing: ${file.name}`);

    const text = await extractTextFromPDF(file);
    const transactions = parseTransactions(text);
    const cardDetails = extractCardDetails(text);

    const totalSpend = transactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    console.log(`✅ Results:`);
    console.log(`   - Card: ${cardDetails.cardName || 'Unknown'}`);
    console.log(`   - Transactions: ${transactions.length}`);
    console.log(`   - Total Spend: ₹${totalSpend.toFixed(2)}`);
    console.log(`   - Credit Limit: ${cardDetails.creditLimit ? '₹' + cardDetails.creditLimit.toLocaleString('en-IN') : 'Not found'}\n`);

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
    console.error('❌ Error parsing PDF:', error);
    throw new Error('Failed to parse credit card statement. Please check if this is a valid credit card PDF.');
  }
}
