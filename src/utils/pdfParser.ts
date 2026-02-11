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
  // Real PDF.js output: "16/12/2025| 22:52 EMI AMAZON SELLER SERVICESMUMBAI + 225 C 6,803.00 l"
  // Spaces between all tokens. Description starts with capital letter after timestamp.
  const pattern = /(\d{2}\/\d{2}\/\d{4})\|\s*\d{2}:\d{2}\s+([A-Z][A-Z0-9 ]+?)\s+\+\s*\d*\s*C\s*([\d,]+\.?\d*)/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const date = match[1];
    const description = match[2].trim();
    const amountStr = match[3].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    if (amount > 0 && description.length > 3) {
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
  // Real PDF.js output: "16/11/2025 UPI/SWIGGY/... RESTAURANTS 504.00 Dr 15.00 Cr"
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
    const description = line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim().substring(0, 60);
    if (description.length < 5) continue;
    if (/payment|reversal/i.test(description)) continue;
    transactions.push({ date, description, amount, type: 'debit', category: categorizeTransaction(description) });
  }
  return transactions;
}

export function parseTransactions(text: string): Transaction[] {
  const isHDFC = /HDFC\s*Bank/i.test(text);
  const isAxis = /AXIS\s*BANK/i.test(text);

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
      desc.includes('eternal') || desc.includes('mumbai masti') || desc.includes('kfc') ||
      desc.includes('biryani') || desc.includes('chai')) return 'Dining';

  if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra') ||
      desc.includes('lifestyle') || desc.includes('fashion') || desc.includes('apparel') ||
      desc.includes('dept store') || desc.includes('cloth')) return 'Shopping';

  if (desc.includes('uber') || desc.includes('ola') || desc.includes('airline') ||
      desc.includes('hotel') || desc.includes('booking') || desc.includes('makemytrip') ||
      desc.includes('flight') || desc.includes('irctc') || desc.includes('rapido') ||
      desc.includes('travel')) return 'Travel';

  if (desc.includes('grofers') || desc.includes('bigbasket') || desc.includes('dmart') ||
      desc.includes('grocery') || desc.includes('supermarket') || desc.includes('instamart') ||
      desc.includes('hypermarket')) return 'Groceries';

  if (desc.includes('jio') || desc.includes('airtel') || desc.includes('bsnl') ||
      desc.includes('postpaid') || desc.includes('broadband') || desc.includes('electricity') ||
      desc.includes('utility')) return 'Bills';

  if (desc.includes('medical') || desc.includes('hospital') || desc.includes('pharmacy') ||
      desc.includes('clinic') || desc.includes('doctor') || desc.includes('apollo') ||
      desc.includes('narayana') || desc.includes('nhl') || desc.includes('healthflex') ||
      desc.includes('iskin')) return 'Medical';

  if (desc.includes('netflix') || desc.includes('prime') || desc.includes('hotstar') ||
      desc.includes('spotify') || desc.includes('sonyliv') || desc.includes('zee5')) return 'Entertainment';

  if (desc.includes('fuel') || desc.includes('petrol')) return 'Fuel';

  return 'Others';
}

export function extractCardDetails(text: string): Partial<ParsedStatement> {
  const details: Partial<ParsedStatement> = {};

  const bankPatterns = [
    { name: 'AXIS', pattern: /AXIS\s*BANK/i },
    { name: 'HDFC', pattern: /HDFC\s*Bank/i },
    { name: 'SBI', pattern: /STATE\s*BANK/i },
    { name: 'ICICI', pattern: /ICICI\s*BANK/i },
    { name: 'Kotak', pattern: /KOTAK/i },
    { name: 'IndusInd', pattern: /INDUSIND/i },
    { name: 'Yes Bank', pattern: /YES\s*BANK/i },
  ];

  for (const bank of bankPatterns) {
    if (bank.pattern.test(text)) {
      details.cardName = bank.name + ' Credit Card';
      console.log(`🏦 Bank detected: ${bank.name}`);
      break;
    }
  }

  const cardPatterns = [
    /Credit\s*Card\s*No\.?\s*[:\-]?\s*\d+[X*]+(\d{4})/i,
    /Card\s*No\.?\s*[:\-]?\s*\d+[X*]+(\d{4})/i,
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

  const isAxis = /AXIS\s*BANK/i.test(text);
  const isHDFC = /HDFC\s*Bank/i.test(text);

  if (isAxis) {
    // Real PDF.js: "652984****** 6192 500,000.00 467,785.74 50,000.00"
    const axisLimit = text.match(/\d{6}[*\s]+\d{4}\s+([\d,]+\.?\d*)/);
    if (axisLimit) {
      const limit = parseFloat(axisLimit[1].replace(/,/g, ''));
      if (limit >= 10000) {
        details.creditLimit = limit;
        console.log(`💰 AXIS Credit limit: ₹${limit.toLocaleString('en-IN')}`);
      }
    }
  } else if (isHDFC) {
    // Real PDF.js: "C9,42,000 C9,23,518 C3,76,800" - WITH spaces
    const allMatches = Array.from(text.matchAll(/C([\d,]+)\s+C([\d,]+)\s+C([\d,]+)/g));
    let maxLimit = 0;
    for (const m of allMatches) {
      const vals = [m[1], m[2], m[3]].map((v: string) => parseFloat(v.replace(/,/g, '')));
      const maxVal = Math.max(...vals);
      if (maxVal > maxLimit) maxLimit = maxVal;
    }
    if (maxLimit >= 10000) {
      details.creditLimit = maxLimit;
      console.log(`💰 HDFC Credit limit: ₹${maxLimit.toLocaleString('en-IN')}`);
    }
  }

  if (!details.creditLimit) {
    const limitPatterns = [
      /Credit\s*Limit\s*([\d,]+\.?\d*)/i,
      /CREDIT\s*LIMIT\s*([\d,]+)/i,
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

  const minDuePatterns = [
    /MINIMUM\s+DUE\s+DUE\s+DATE\s+C([\d,]+\.?\d*)/i,
    /Minimum\s+Payment\s+Due\s+([\d,]+\.?\d*)\s+Dr/i,
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
