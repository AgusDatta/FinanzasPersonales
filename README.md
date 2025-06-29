# 📊 Dashboard de Finanzas Personales

Una aplicación web sencilla para registrar, visualizar y exportar tus ingresos y gastos. Permite agregar movimientos, filtrarlos por fecha, visualizar estadísticas en gráficos y exportar la información en distintos formatos.

---

## 🚀 Características

* Agregar ingresos y gastos con descripción, monto, categoría y fecha.
* Filtrar por rango de fechas.
* Visualizar resumen de totales e información segmentada en gráficos.
* Exportar los datos como:

  * 📄 CSV
  * 🧾 JSON
  * 🖼 PNG
  * 📘 PDF
* Importar datos desde un archivo `.json`.
* Editar movimientos desde el historial (modal emergente flotante).
* Eliminar movimientos individuales.

---

## 📁 Estructura del proyecto

```
📆 finanzas-personales
├── index.html
├── style.css
├── script.js
├── README.md
```

---

## 💠 Tecnologías utilizadas

* HTML5
* CSS3
* JavaScript
* [Chart.js](https://www.chartjs.org/) — para generar gráficos dinámicos.
* [html2canvas](https://html2canvas.hertzen.com/) — para exportar a imagen.
* [jsPDF](https://github.com/parallax/jsPDF) — para exportar a PDF.

---

## 📝 Uso

1. **Cloná o descargá** este repositorio:

```bash
git clone https://github.com/tu-usuario/finanzas-personales.git
```

2. **Abrí el archivo `index.html`** en tu navegador:

```bash
cd finanzas-personales
start index.html
```

3. Comenzá a cargar movimientos y visualizá tus estadísticas.

---

## 📷 Capturas

### Dashboard principal

![dashboard](./capturas/dashboard.png)

### Modal de edición

![modal-editar](./capturas/modal-editar.png)

> 💡 Si querés agregar tus propias capturas, guardalas en una carpeta `/capturas` y actualizá las rutas arriba.

---

## 📌 Notas

* Los datos se guardan en `localStorage`, por lo que se mantienen aunque cierres el navegador.
* Si eliminás todos los movimientos o borrás el almacenamiento del navegador, los datos se perderán.
* Al exportar en PNG o PDF, la vista se genera desde el área contenida en `#export-area`.

---

## 📄 Licencia

Este proyecto es de uso libre. Podés modificarlo, compartirlo y adaptarlo según tus necesidades.
¡Ideal para uso personal o como base para proyectos educativos!

---

## 👨‍💼 Autor

Desarrollado por \[Tu Nombre o Alias].
