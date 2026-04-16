import { el } from '@utils/dom.ts';
import { t, setLocale } from '@ui/i18n.ts';
import { toast } from '@ui/toast.ts';
import { applyTheme, type Theme } from '@ui/theme.ts';
import { getUserSettings, updateUserSettings } from '@db/repositories/settings.ts';
import { getUsdToArsRate, setManualRate } from '@services/exchange-rate.ts';
import { listAccounts } from '@db/repositories/accounts.ts';
import { listCategories } from '@db/repositories/categories.ts';
import { listTransactions } from '@db/repositories/transactions.ts';
import { downloadBlob, exportAsJSON } from '@features/import-export/export.ts';
import { importBundle } from '@features/import-export/import.ts';
import { resetDatabase } from '@db/schema.ts';
import { confirmDialog } from '@ui/modal.ts';
import { autoDetectAndParse } from '@services/csv-parser/index.ts';
import { bulkImport, checkStorageQuota } from '@db/repositories/transactions.ts';
import type { TransactionRow } from '@db/schema.ts';
import { friendlyMessage } from '@ui/error-handler.ts';

export async function renderSettings(root: HTMLElement): Promise<void> {
  root.innerHTML = '';
  const settings = await getUserSettings();

  root.appendChild(el('h1', { class: 'view__title' }, [t('nav.settings')]));

  const form = el('form', { class: 'settings-form' });
  form.innerHTML = `
    <label class="field">
      <span>Moneda principal (display)</span>
      <select name="displayCurrency">
        <option value="ARS">ARS — Peso argentino</option>
        <option value="USD">USD — Dólar</option>
        <option value="EUR">EUR — Euro</option>
      </select>
    </label>
    <label class="field">
      <span>Idioma</span>
      <select name="locale">
        <option value="es-AR">Español (AR)</option>
        <option value="en">English</option>
      </select>
    </label>
    <label class="field">
      <span>Tema</span>
      <select name="theme">
        <option value="system">Sistema</option>
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
      </select>
    </label>
    <label class="field field--checkbox">
      <input type="checkbox" name="budgetAlerts" />
      <span>Alertas de presupuesto</span>
    </label>
    <label class="field field--checkbox">
      <input type="checkbox" name="notifications" />
      <span>Notificaciones del navegador</span>
    </label>
    <button type="submit" class="btn btn--primary">${t('action.save')}</button>
  `;
  (form.elements.namedItem('displayCurrency') as HTMLSelectElement).value = settings.displayCurrency;
  (form.elements.namedItem('locale') as HTMLSelectElement).value = settings.locale;
  (form.elements.namedItem('theme') as HTMLSelectElement).value = settings.theme;
  (form.elements.namedItem('budgetAlerts') as HTMLInputElement).checked = settings.budgetAlerts;
  (form.elements.namedItem('notifications') as HTMLInputElement).checked = settings.notifications;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      const fd = new FormData(form);
      const next = {
        displayCurrency: String(fd.get('displayCurrency')) as 'ARS' | 'USD' | 'EUR',
        locale: String(fd.get('locale')) as 'es-AR' | 'en',
        theme: String(fd.get('theme')) as Theme,
        budgetAlerts: fd.has('budgetAlerts'),
        notifications: fd.has('notifications'),
      };
      await updateUserSettings(next);
      setLocale(next.locale);
      applyTheme(next.theme);
      if (next.notifications && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      toast('Configuración guardada.', { level: 'success' });
    })();
  });
  root.appendChild(form);

  // Exchange rate section
  const fxSection = el('section', { class: 'settings-section' });
  fxSection.appendChild(el('h2', {}, ['Tipo de cambio']));
  const rateBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, ['Actualizar USD→ARS (blue)']);
  const rateOut = el('p', { class: 'hint' }, ['']);
  rateBtn.addEventListener('click', async () => {
    try {
      const rate = await getUsdToArsRate('blue');
      rateOut.textContent = `1 USD = ${rate.rate} ARS (${rate.source})`;
      toast('Cotización actualizada.', { level: 'success' });
    } catch (err) {
      toast(friendlyMessage(err), { level: 'error' });
    }
  });
  const manualLabel = el('label', { class: 'field' });
  manualLabel.appendChild(el('span', {}, ['Cotización manual USD→ARS']));
  const manualInput = el('input', { inputmode: 'decimal', placeholder: 'ej: 1050' });
  manualLabel.appendChild(manualInput);
  const manualBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, ['Guardar cotización manual']);
  manualBtn.addEventListener('click', async () => {
    if (!manualInput.value.trim()) return;
    await setManualRate('USD', 'ARS', manualInput.value.trim());
    toast('Cotización manual guardada.', { level: 'success' });
  });
  fxSection.append(rateBtn, rateOut, manualLabel, manualBtn);
  root.appendChild(fxSection);

  // Backup section
  const backupSection = el('section', { class: 'settings-section' });
  backupSection.appendChild(el('h2', {}, ['Backup y datos']));
  const backupBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, ['Exportar todo (JSON)']);
  backupBtn.addEventListener('click', async () => {
    const [accs, cats, txs] = await Promise.all([listAccounts(true), listCategories(), listTransactions()]);
    downloadBlob(exportAsJSON(accs, cats, txs), `finanzas-backup-${Date.now()}.json`);
  });
  const restoreLabel = el('label', { class: 'field' });
  restoreLabel.appendChild(el('span', {}, ['Restaurar desde backup (JSON)']));
  const fileInput = el('input', { type: 'file', accept: 'application/json' });
  restoreLabel.appendChild(fileInput);
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const ok = await confirmDialog('¿Reemplazar los datos actuales? Hacé un export antes si querés.');
    const raw = await file.text();
    try {
      const parsed = JSON.parse(raw) as unknown;
      const result = await importBundle(parsed, ok ? 'replace' : 'merge');
      toast(`Importados: ${result.transactions} movimientos, ${result.accounts} cuentas.`, { level: 'success' });
    } catch (err) {
      toast(friendlyMessage(err), { level: 'error' });
    }
  });

  const csvLabel = el('label', { class: 'field' });
  csvLabel.appendChild(el('span', {}, ['Importar CSV de banco']));
  const csvInput = el('input', { type: 'file', accept: '.csv,text/csv' });
  csvLabel.appendChild(csvInput);
  csvInput.addEventListener('change', async () => {
    const file = csvInput.files?.[0];
    if (!file) return;
    const accs = await listAccounts();
    if (accs.length === 0) {
      toast('Primero creá una cuenta.', { level: 'warning' });
      return;
    }
    const accId = accs[0].id;
    const raw = await file.text();
    const parsed = autoDetectAndParse(raw);
    const completedRows: TransactionRow[] = parsed.rows.map((r) => ({
      ...(r),
      accountId: accId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const result = await bulkImport(completedRows, { deduplicate: true });
    toast(
      `Banco: ${parsed.detectedBank}. Importados: ${result.inserted}, duplicados: ${result.duplicates}.`,
      { level: 'success', duration: 8000 },
    );
    if (parsed.warnings.length > 0) {
      for (const w of parsed.warnings.slice(0, 3)) toast(w, { level: 'warning' });
    }
  });

  const resetBtn = el('button', { type: 'button', class: 'btn btn--danger' }, ['Borrar todos los datos']);
  resetBtn.addEventListener('click', async () => {
    const confirmed = await confirmDialog('Esto eliminará TODO. ¿Seguro?');
    if (!confirmed) return;
    const doubled = await confirmDialog('Última confirmación. No hay vuelta atrás.');
    if (!doubled) return;
    await resetDatabase();
    toast('Base de datos reiniciada.', { level: 'info' });
    window.location.reload();
  });

  const quotaInfo = el('p', { class: 'hint' }, ['Cargando uso de almacenamiento…']);
  void (async () => {
    const q = await checkStorageQuota();
    if (!q) {
      quotaInfo.textContent = 'No se pudo medir el almacenamiento.';
      return;
    }
    quotaInfo.textContent = `Uso de almacenamiento: ${(q.usage / 1e6).toFixed(1)} MB de ${(q.quota / 1e6).toFixed(0)} MB (${Math.round(q.ratio * 100)}%).`;
  })();

  backupSection.append(backupBtn, restoreLabel, csvLabel, quotaInfo, resetBtn);
  root.appendChild(backupSection);
}
