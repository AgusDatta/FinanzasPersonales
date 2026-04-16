type Locale = 'es-AR' | 'en';

const dict: Record<Locale, Record<string, string>> = {
  'es-AR': {
    'app.title': 'Finanzas Personales',
    'app.tagline': 'Tu dinero, bajo control.',
    'nav.dashboard': 'Dashboard',
    'nav.transactions': 'Movimientos',
    'nav.accounts': 'Cuentas',
    'nav.budgets': 'Presupuestos',
    'nav.recurring': 'Recurrentes',
    'nav.reports': 'Reportes',
    'nav.settings': 'Configuración',
    'action.add': 'Agregar',
    'action.edit': 'Editar',
    'action.delete': 'Eliminar',
    'action.save': 'Guardar',
    'action.cancel': 'Cancelar',
    'action.undo': 'Deshacer',
    'action.import': 'Importar',
    'action.export': 'Exportar',
    'field.description': 'Descripción',
    'field.amount': 'Monto',
    'field.type': 'Tipo',
    'field.category': 'Categoría',
    'field.date': 'Fecha',
    'field.account': 'Cuenta',
    'field.notes': 'Notas',
    'field.currency': 'Moneda',
    'type.income': 'Ingreso',
    'type.expense': 'Gasto',
    'type.transfer': 'Transferencia',
    'summary.total': 'Balance',
    'summary.income': 'Ingresos',
    'summary.expense': 'Gastos',
    'summary.savings': 'Ahorro',
    'empty.transactions': 'Sin movimientos todavía. Agregá el primero.',
    'empty.accounts': 'Creá tu primera cuenta para empezar.',
    'confirm.delete': '¿Eliminar este movimiento?',
    'error.generic': 'Algo salió mal. Probá de nuevo.',
    'error.quota': 'Se llenó el almacenamiento del navegador. Exportá y liberá espacio.',
    'toast.migrated': 'Se migraron {count} movimientos de la versión anterior.',
    'toast.undo.delete': 'Movimiento eliminado.',
    'budget.exceeded': 'Te pasaste del presupuesto de {category}',
    'budget.warning': 'Llevás {pct}% del presupuesto de {category}',
  },
  en: {
    'app.title': 'Personal Finance',
    'app.tagline': 'Your money, under control.',
    'nav.dashboard': 'Dashboard',
    'nav.transactions': 'Transactions',
    'nav.accounts': 'Accounts',
    'nav.budgets': 'Budgets',
    'nav.recurring': 'Recurring',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'action.add': 'Add',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.undo': 'Undo',
    'action.import': 'Import',
    'action.export': 'Export',
    'field.description': 'Description',
    'field.amount': 'Amount',
    'field.type': 'Type',
    'field.category': 'Category',
    'field.date': 'Date',
    'field.account': 'Account',
    'field.notes': 'Notes',
    'field.currency': 'Currency',
    'type.income': 'Income',
    'type.expense': 'Expense',
    'type.transfer': 'Transfer',
    'summary.total': 'Balance',
    'summary.income': 'Income',
    'summary.expense': 'Expenses',
    'summary.savings': 'Savings',
    'empty.transactions': 'No transactions yet. Add your first one.',
    'empty.accounts': 'Create your first account to get started.',
    'confirm.delete': 'Delete this transaction?',
    'error.generic': 'Something went wrong. Try again.',
    'error.quota': 'Browser storage is full. Export and free up space.',
    'toast.migrated': '{count} transactions migrated from the previous version.',
    'toast.undo.delete': 'Transaction deleted.',
    'budget.exceeded': "You're over budget for {category}",
    'budget.warning': "You've used {pct}% of your {category} budget",
  },
};

let currentLocale: Locale = 'es-AR';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  document.documentElement.lang = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  const raw = dict[currentLocale][key] ?? dict['es-AR'][key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}
