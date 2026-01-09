import { Contact, SendStatus } from '../types';

export const parseCSV = (content: string): Contact[] => {
  const lines = content.split(/\r?\n/);
  const contacts: Contact[] = [];
  
  // Start from index 1 to skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma or semicolon, handling simple cases
    // Note: For complex CSVs with quoted strings containing commas, a library like 'papaparse' is recommended.
    // This regex handles basic splitting by comma or semicolon
    const columns = line.split(/[,;]/).map(col => col.trim());

    if (columns.length >= 2) {
      // Generate a simple random ID for React keys
      const id = `row-${i}-${Date.now()}`;
      
      const rawPhone = columns[1] || '';
      // Sanitize phone: keep only digits
      const phone = rawPhone.replace(/\D/g, '');

      contacts.push({
        id,
        Nome: columns[0] || 'Desconhecido',
        Telefone: phone,
        Nome_Campanha: columns[2] || 'Geral',
        Nome_template: columns[3] || 'boas_vindas',
        status: SendStatus.IDLE
      });
    }
  }
  return contacts;
};