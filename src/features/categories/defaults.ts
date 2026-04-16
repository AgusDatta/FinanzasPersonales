import type { CategoryRow } from '@db/schema.ts';
import { newId } from '@domain/id.ts';

type DefaultCategory = Omit<CategoryRow, 'createdAt'>;

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { id: newId('cat'), name: 'General', icon: '📁', color: '#607d8b', type: 'expense' },
  { id: newId('cat'), name: 'Comida', icon: '🍎', color: '#f57c00', type: 'expense' },
  { id: newId('cat'), name: 'Supermercado', icon: '🛒', color: '#ef6c00', type: 'expense' },
  { id: newId('cat'), name: 'Transporte', icon: '🚌', color: '#1976d2', type: 'expense' },
  { id: newId('cat'), name: 'Servicios', icon: '💡', color: '#7b1fa2', type: 'expense' },
  { id: newId('cat'), name: 'Educación', icon: '📚', color: '#00796b', type: 'expense' },
  { id: newId('cat'), name: 'Salud', icon: '💊', color: '#c2185b', type: 'expense' },
  { id: newId('cat'), name: 'Ocio', icon: '🎮', color: '#5e35b1', type: 'expense' },
  { id: newId('cat'), name: 'Suscripciones', icon: '📺', color: '#d81b60', type: 'expense' },
  { id: newId('cat'), name: 'Impuestos', icon: '🧾', color: '#455a64', type: 'expense' },
  { id: newId('cat'), name: 'Otros', icon: '📦', color: '#9e9e9e', type: 'expense' },
  { id: newId('cat'), name: 'Sueldo', icon: '💼', color: '#2e7d32', type: 'income' },
  { id: newId('cat'), name: 'Freelance', icon: '💻', color: '#388e3c', type: 'income' },
  { id: newId('cat'), name: 'Inversiones', icon: '📈', color: '#558b2f', type: 'income' },
  { id: newId('cat'), name: 'Regalos', icon: '🎁', color: '#9c27b0', type: 'income' },
];

export const AUTO_CATEGORIZE_RULES: Array<{ keyword: RegExp; category: string }> = [
  { keyword: /uber|cabify|didi|subte|sube|peaje|ypf|shell|axion/i, category: 'Transporte' },
  { keyword: /rappi|pedidosya|mcdonalds|burger|starbucks|café|cafe/i, category: 'Comida' },
  { keyword: /coto|jumbo|dia|carrefour|vea|disco|chango más|changomas/i, category: 'Supermercado' },
  { keyword: /edesur|edenor|metrogas|aysa|telecom|movistar|claro|personal|fibertel/i, category: 'Servicios' },
  { keyword: /netflix|spotify|disney|hbo|youtube premium|apple|prime video/i, category: 'Suscripciones' },
  { keyword: /afip|arba|monotributo|impuesto|rentas/i, category: 'Impuestos' },
  { keyword: /farmacity|doctor|clínica|hospital|laboratorio|farmacia/i, category: 'Salud' },
  { keyword: /cine|teatro|steam|playstation|xbox|spotify/i, category: 'Ocio' },
  { keyword: /sueldo|haber|salary|salario/i, category: 'Sueldo' },
];
