import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { VisitData } from '../types';
import { formatDateBR, getIdealTempRange } from './utils';
import { calculateVisitResults } from './scoring';

// Extending jsPDF with autotable types
declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
    lastAutoTable: {
      finalY: number;
    };
  }
}

export function exportToPDF(records: VisitData[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 14;

  records.forEach((d, idx) => {
    if (idx > 0) doc.addPage();
    let y = 14;

    // Header Branding
    doc.setFillColor(15, 63, 138);
    doc.rect(0, 0, W, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE AVALIAÇÃO SANITÁRIA — SUINOSAÚDE PRO', margin, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Data da Visita: ' + formatDateBR(d.date), W - margin, 17, { align: 'right' });
    
    if (records.length > 1) {
      doc.text(`Relatório Individual ${idx + 1} de ${records.length}`, W - margin, 11, { align: 'right' });
    }
    
    y = 34;

    // I. Identification Section
    doc.setTextColor(15, 63, 138);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('I. IDENTIFICAÇÃO E DADOS GERAIS', margin, y);
    y += 4;
    doc.line(margin, y, W - margin, y);
    y += 5;

    let ageStr = '';
    if (d.housingDate && d.date) {
      const [y1, m1, d1] = d.housingDate.split('-').map(Number);
      const [y2, m2, d2] = d.date.split('-').map(Number);
      if (y1 && y2) {
        const time1 = Date.UTC(y1, m1 - 1, d1);
        const time2 = Date.UTC(y2, m2 - 1, d2);
        const elapsedDays = Math.max(0, Math.round((time2 - time1) / (1000 * 60 * 60 * 24)));
        ageStr = `${elapsedDays} dias`;
      }
    }

    const idBody = [
      ['Cliente Associado', d.producer],
      ['Unidade / Produtor', d.farm],
      ['Lote', d.batch || 'Não informado'],
      ['Idade do Lote', ageStr || 'Não informada'],
      ['Fase de Produção', d.phase],
      ['Efetivo do Lote', `${d.totalAnimals} animais`],
    ];

    if (d.feed && d.feed.trim() !== '') idBody.push(['Ração Atual', d.feed]);
    if (d.meds && d.meds.trim() !== '') idBody.push(['Protocolo Medicamentoso', d.meds]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [245, 245, 245], textColor: [40, 40, 40], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
      body: idBody
    });

    y = doc.lastAutoTable.finalY + 10;

    // II. Global Health Score Section
    const scoreColor = d.results.scoreStatus === 'Excelente' ? [46, 160, 67] : 
                      d.results.scoreStatus === 'Atenção' ? [210, 153, 34] : [218, 54, 51];
    
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.rect(margin, y, W - (margin * 2), 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`SCORE DE SAÚDE DO LOTE: ${d.results.score}/100`, margin + 6, y + 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CLASSIFICAÇÃO: ${d.results.scoreStatus.toUpperCase()}`, margin + 6, y + 12);
    
    // Tiny label on the right of the score bar
    doc.setFontSize(7);
    doc.text('ÍNDICE CALCULADO PELO ALGORITMO SUINOSAÚDE', W - margin - 5, y + 9, { align: 'right' });
    y += 24;

    // III. Environmental Analysis (Only if at least one parameter is present)
    const hasTemp = d.temp && d.temp.trim() !== '';
    const hasHum = d.humidity && d.humidity.trim() !== '';
    const hasCo2 = d.co2 && d.co2.trim() !== '';

    if (hasTemp || hasHum || hasCo2) {
      doc.setTextColor(15, 63, 138);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('III. ANÁLISE DE AMBIÊNCIA', margin, y);
      y += 4;
      doc.line(margin, y, W - margin, y);
      y += 5;

      const envAnalysis: any[] = [['Parâmetro', 'Valor Coletado', 'Faixa Ideal', 'Status']];
      
      if (hasTemp) {
        const tempVal = Number(d.temp);
        const { min, max, label } = getIdealTempRange(d.phase || '', d.date, d.housingDate);
        envAnalysis.push(['Temperatura (°C)', `${tempVal}°C`, label, (tempVal >= min && tempVal <= max) ? 'CONFORME' : 'FORA DA FAIXA']);
      }
      if (hasHum) {
        const humVal = Number(d.humidity);
        envAnalysis.push(['Umidade Relativa (%)', `${humVal}%`, '55 - 75%', (humVal >= 55 && humVal <= 75) ? 'CONFORME' : 'FORA DA FAIXA']);
      }
      if (hasCo2) {
        const co2Val = Number(d.co2);
        envAnalysis.push(['Nível de CO2 (ppm)', `${co2Val} ppm`, '< 2500 ppm', co2Val < 2500 ? 'CONFORME' : 'EXCESSIVO']);
      }

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [15, 63, 138], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        body: envAnalysis.slice(1),
        head: [envAnalysis[0]],
        didParseCell: (data: any) => {
          if (data.column.index === 3 && data.row.index > -1) {
            if (data.cell.raw === 'CONFORME') data.cell.styles.textColor = [0, 150, 0];
            else data.cell.styles.textColor = [200, 0, 0];
          }
        }
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // IV. Health Indices
    doc.setTextColor(15, 63, 138);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('IV. ÍNDICES SANITÁRIOS', margin, y);
    y += 4;
    doc.line(margin, y, W - margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [15, 63, 138], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Categoria', 'Sintoma / Indicador', 'Frequência / Taxa %', 'Meta / Limiar', 'Avaliação']],
      body: [
        ['Respiratório', 'Tosses', `${d.results.cFreq.toFixed(1)}%`, '5.0%', d.results.cFreq <= 5 ? 'OK' : 'ALERTA'],
        ['Respiratório', 'Espirros', `${d.results.sFreq.toFixed(1)}%`, '10.0%', d.results.sFreq <= 10 ? 'OK' : 'ALERTA'],
        ['Entérico', 'Diarreia Líquida', `${d.results.liqFreq.toFixed(1)}%`, '5.0%', d.results.liqFreq <= 5 ? 'OK' : 'ALERTA'],
        ['Mortalidade', 'Mortalidade Acumulada', `${d.results.mortalityRate.toFixed(1)}%`, d.results.mortalityMeta > 0 ? `${d.results.mortalityMeta.toFixed(1)}%` : '-', (d.results.mortalityMeta > 0 && d.results.mortalityRate <= d.results.mortalityMeta) || (d.results.mortalityMeta === 0 && d.results.mortalityRate === 0) ? 'OK' : 'ALERTA']
      ],
      didParseCell: (data: any) => {
        if (data.column.index === 4 && data.row.index > -1) {
          if (data.cell.raw === 'ALERTA') {
            data.cell.styles.textColor = [200, 0, 0];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    y = doc.lastAutoTable.finalY + 13;

    // V. Conclusion & Signature
    const alerts: string[] = [];
    
    if (d.results.scoreStatus === 'Atenção' || d.results.scoreStatus === 'Crítico') {
      const breakdown = d.results.scoreBreakdown;
      const deductions = [
        { name: 'Tosse', value: breakdown?.coughDeduction || 0, text: 'A incidência de tosse está impactando significativamente a avaliação. Recomendamos atenção prioritária ao quadro respiratório.' },
        { name: 'Espirro', value: breakdown?.sneezeDeduction || 0, text: 'O nível de espirros foi um fator de alto impacto na nota. Verifique a ventilação e a qualidade do ar no galpão.' },
        { name: 'Diarreia', value: breakdown?.entericDeduction || 0, text: 'Os quadros entéricos reduziram a pontuação do lote. Direcione esforços para a avaliação de manejo e saúde intestinal.' },
        { name: 'Mortalidade', value: breakdown?.mortalityDeduction || 0, text: 'A taxa de mortalidade prejudicou fortemente o resultado global da avaliação. Aconselha-se investigar e intervir rapidamente nas causas.' },
        { name: 'Ambiência', value: breakdown?.environmentDeduction || 0, text: 'Desvios de ambiência (temperatura, umidade ou CO2) reduziram a pontuação final. Faça ajustes nos controles de climatização.' }
      ];
      
      const worst = deductions.reduce((prev, current) => (prev.value > current.value) ? prev : current);
      
      if (worst.value > 0) {
        alerts.push(`Ponto de Maior Atenção (${worst.name}): ${worst.text}`);
      }
    }

    if (d.results.cFreq > 5) alerts.push(`Frequência de tosses está em ${d.results.cFreq.toFixed(1)}% (Meta: 5.0%).`);
    if (d.results.sFreq > 10) alerts.push(`Frequência de espirros está em ${d.results.sFreq.toFixed(1)}% (Meta: 10.0%).`);
    if (d.results.liqFreq > 5) alerts.push(`Frequência de diarreia está em ${d.results.liqFreq.toFixed(1)}% (Meta: 5.0%).`);
    if (d.results.mortalityRate > (d.results.mortalityMeta || 0) && d.results.mortalityMeta > 0) alerts.push(`Mortalidade registrada de ${d.results.mortalityRate.toFixed(1)}% supera a meta calculada de ${d.results.mortalityMeta.toFixed(1)}%.`);
    if (d.co2 && Number(d.co2) > 2500) alerts.push('Qualidade do Ar: Níveis de CO2 elevados (acima de 2500ppm).');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 63, 138);
    doc.text('V. CONCLUSÕES E RECOMENDAÇÕES TÉCNICAS', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    if (alerts.length > 0) {
      alerts.forEach(a => {
        doc.text(`• ${a}`, margin + 2, y, { maxWidth: W - (margin * 2) - 4 });
        y += 6;
      });
    } else {
      doc.text('Lote apresenta conformidade sanitária nos parâmetros avaliados. Manter manejo padrão.', margin + 2, y);
      y += 6;
    }

    // VI. Additional Field Notes
    if (d.notes && d.notes.trim() !== '') {
      y += 4;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 63, 138);
      doc.text('VI. NOTAS DE CAMPO / OBSERVAÇÕES', margin, y);
      y += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const notesLines = doc.splitTextToSize(d.notes, W - (margin * 2) - 4);
      doc.text(notesLines, margin + 2, y);
      y += (notesLines.length * 4) + 4;
    }

    // Professional Disclaimer
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    const disclaimer = "Este documento é um relatório técnico gerado pelo sistema SuinoSaúde. As conclusões baseiam-se em amostragem clínica realizada no momento da visita. Este relatório não substitui o diagnóstico laboratorial definitivo quando necessário.";
    doc.text(disclaimer, margin, H - 12, { maxWidth: W - (margin * 2) });
  });

  const finalName = records.length === 1 
    ? `SuinoSaude_Relatorio_${records[0].producer.replace(/\s+/g, '_')}_${formatDateBR(records[0].date).replace(/\//g, '-')}.pdf`
    : `SuinoSaude_Export_Consolidado_${records.length}_Visitas.pdf`;

  doc.save(finalName);
}

export function exportToExcel(records: VisitData[]) {
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Dashboard / Main Records
  const dashboardData = records.map(d => {
    let ageDays = 0;
    if (d.housingDate && d.date) {
      const hd = new Date(d.housingDate + 'T00:00:00');
      const vd = new Date(d.date + 'T00:00:00');
      ageDays = Math.floor((vd.getTime() - hd.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      Cliente: d.producer,
      Produtor: d.farm,
      Lote: d.batch || '',
      Data_Visita: formatDateBR(d.date),
      Data_Alojamento: d.housingDate ? formatDateBR(d.housingDate) : '',
      Idade_Lote_Dias: ageDays > 0 ? ageDays : '',
      Fase: d.phase,
      Animais_Alojados: d.totalAnimals,
      Mortalidade_Numero: d.mortality || 0,
      Score_Geral: Number(d.results.score.toFixed(2)),
      Status: d.results.scoreStatus,
      Mortalidade_Atual_P: Number(d.results.mortalityRate.toFixed(2)),
      Mortalidade_Projetada_P: Number(d.results.projectedMortalityRate.toFixed(2)),
      Meta_Mortalidade_P: d.results.mortalityMeta > 0 ? Number(d.results.mortalityMeta.toFixed(2)) : null,
      Tosse_P: Number(d.results.cFreq.toFixed(2)),
      Espirro_P: Number(d.results.sFreq.toFixed(2)),
      Diarreia_Liquida_P: Number(d.results.liqFreq.toFixed(2)),
      Temp_C: d.temp && d.temp.trim() !== '' ? Number(d.temp) : null,
      Umidade_P: d.humidity && d.humidity.trim() !== '' ? Number(d.humidity) : null,
      CO2_ppm: d.co2 && d.co2.trim() !== '' ? Number(d.co2) : null,
      Racao_Agua: d.feed,
      Medicatorio: d.meds,
      Observacoes: d.notes || ''
    };
  });
  const wsDash = XLSX.utils.json_to_sheet(dashboardData);
  XLSX.utils.book_append_sheet(wb, wsDash, 'Resumo do Lote');

  // Sheet 2: Raw Counts (Detailed Data)
  const rawData = records.map(d => ({
    Data: formatDateBR(d.date),
    Cliente: d.producer,
    Produtor: d.farm,
    Lote: d.batch || '',
    Fase: d.phase,
    Animais_Alojados: d.totalAnimals,
    Tosses_Baias: d.counts.cough,
    Espirros_Baias: d.counts.sneeze,
    Fecal_E1_Normais: d.results.e1,
    Fecal_E2_Pastosas: d.counts.e2,
    Fecal_E3_Liquidas: d.counts.e3,
    Mortos: d.mortality || 0
  }));
  const wsRaw = XLSX.utils.json_to_sheet(rawData);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Dados Brutos');

  // Sheet 3: Organograma Sanitário
  const orgData = records.map(d => {
    let ageStr = '';
    if (d.housingDate && d.date) {
      const [y1, m1, d1] = d.housingDate.split('-').map(Number);
      const [y2, m2, d2] = d.date.split('-').map(Number);
      if (y1 && y2) {
        const time1 = Date.UTC(y1, m1 - 1, d1);
        const time2 = Date.UTC(y2, m2 - 1, d2);
        const elapsedDays = Math.max(0, Math.round((time2 - time1) / (1000 * 60 * 60 * 24)));
        ageStr = `${elapsedDays}`;
      }
    }
    return {
      Data: formatDateBR(d.date),
      Cliente: d.producer,
      Produtor: d.farm,
      Lote: d.batch || '',
      Fase: d.phase,
      Racao: d.feed,
      Medicao: d.meds,
      Idade_Dias: ageStr ? Number(ageStr) : null,
      Score: Number(d.results.score.toFixed(2)),
      Status: d.results.scoreStatus,
      Mortalidade_P: Number(d.results.mortalityRate.toFixed(2)),
      Tosse_P: Number(d.results.cFreq.toFixed(2)),
      Espirro_P: Number(d.results.sFreq.toFixed(2)),
      Diarreia_Liquida_P: Number(d.results.liqFreq.toFixed(2))
    };
  }).sort((a, b) => Number(a.Idade_Dias || 0) - Number(b.Idade_Dias || 0)); // Sort by age

  const wsOrg = XLSX.utils.json_to_sheet(orgData);
  XLSX.utils.book_append_sheet(wb, wsOrg, 'Organograma Sanitário');

  // Sheet 4: Environmental Details (Only showing rows with data)
  const envDataRows = records
    .filter(d => (d.temp && d.temp.trim() !== '') || (d.humidity && d.humidity.trim() !== '') || (d.co2 && d.co2.trim() !== ''))
    .map(d => {
      const hasT = d.temp && d.temp.trim() !== '';
      const hasH = d.humidity && d.humidity.trim() !== '';
      const hasC = d.co2 && d.co2.trim() !== '';
      
      const t = hasT ? Number(d.temp) : null;
      const h = hasH ? Number(d.humidity) : null;
      const c = hasC ? Number(d.co2) : null;

      let tempStatus: string | null = null;
      if (hasT && t !== null) {
        const { min, max } = getIdealTempRange(d.phase || '', d.date, d.housingDate);
        tempStatus = (t >= min && t <= max) ? 'CONFORME' : 'FORA DA FAIXA';
      }
      
      return {
        Data: formatDateBR(d.date),
        Cliente: d.producer,
        Produtor: d.farm,
        Lote: d.batch || '',
        'Temperatura (°C)': t,
        'Status Temperatura': tempStatus,
        'Umidade (%)': h,
        'Status Umidade': hasH ? ((h! >= 55 && h! <= 75) ? 'CONFORME' : 'FORA DA FAIXA') : null,
        'CO2 (ppm)': c,
        'Status CO2': hasC ? (c! < 2500 ? 'CONFORME' : 'EXCESSIVO (ALERTA)') : null
      };
    });

  if (envDataRows.length > 0) {
    const wsEnv = XLSX.utils.json_to_sheet(envDataRows);
    XLSX.utils.book_append_sheet(wb, wsEnv, 'Detalhes Ambientais');
  }

  // Sheet 4: Reference Thresholds
  const refData = [
    ['Parâmetro', 'Limiar de Alerta', 'Descrição Técnica'],
    ['Tosse Média', '5%', 'Indicativo de pneumonia enzoótica ou gripe suína.'],
    ['Espirro Médio', '10%', 'Sugestivo de rinite atrófica progressiva.'],
    ['Diarreia Líquida (E3)', '5%', 'Nível de intervenção imediata.'],
    ['CO2', '2500 ppm', 'Limite para manutenção da qualidade respiratória.'],
    ['Temperatura', '16-30 °C', 'Varia conforme a fase (Maternidade>Creche>Terminação).'],
    ['Umidade', '50-75%', 'Ideal para evitar proliferação de patógenos.']
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refData);
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referencias Tecnicas');

  const filename = records.length === 1 
    ? `SuinoSaude_FullExport_${records[0].producer.replace(/\s+/g, '_')}.xlsx`
    : `SuinoSaude_Export_Consolidado.xlsx`;

  XLSX.writeFile(wb, filename);
}

export function exportToWhatsApp(records: VisitData[]) {
  const summary = records.map(d => {
    let msg = `🐖 *SuinoSaúde - Relatório*\n` +
              `👤 *Cliente:* ${d.producer}\n` +
              `📍 *Produtor:* ${d.farm}\n` +
              `📅 *Data:* ${formatDateBR(d.date)}\n` +
              `📊 *Score:* ${d.results.score}/100 (${d.results.scoreStatus})\n`;
    
    // Always show health indices as they are core to the visit
    msg += `🫁 *Tosse:* ${d.results.cFreq.toFixed(1)}%\n` +
           `🤧 *Espirro:* ${d.results.sFreq.toFixed(1)}%\n` +
           `💧 *Diarreia:* ${d.results.liqFreq.toFixed(1)}%\n` +
           `☠️ *Mortalidade:* ${d.results.mortalityRate.toFixed(1)}%\n`;

    let ageStr = '';
    if (d.housingDate && d.date) {
      const [y1, m1, d1] = d.housingDate.split('-').map(Number);
      const [y2, m2, d2] = d.date.split('-').map(Number);
      if (y1 && y2) {
        const time1 = Date.UTC(y1, m1 - 1, d1);
        const time2 = Date.UTC(y2, m2 - 1, d2);
        const elapsedDays = Math.max(0, Math.round((time2 - time1) / (1000 * 60 * 60 * 24)));
        ageStr = `${elapsedDays}`;
      }
    }

    if (d.batch && d.batch.trim() !== '') msg += `📦 *Lote:* ${d.batch}\n`;
    if (d.phase && d.phase.trim() !== '') msg += `🏷️ *Fase:* ${d.phase}\n`;
    if (ageStr) msg += `⏳ *Idade:* ${ageStr} dias\n`;
    if (d.feed && d.feed.trim() !== '') msg += `🌾 *Ração:* ${d.feed}\n`;
    if (d.meds && d.meds.trim() !== '') msg += `💊 *Medicação:* ${d.meds}\n`;

    if (d.temp && d.temp.trim() !== '') msg += `🌡️ *Temp:* ${d.temp}°C\n`;
    if (d.humidity && d.humidity.trim() !== '') msg += `💧 *UR:* ${d.humidity}%\n`;
    if (d.co2 && d.co2.trim() !== '') msg += `🌫️ *CO2:* ${d.co2} ppm\n`;
    if (d.notes && d.notes.trim() !== '') msg += `📝 *Obs:* ${d.notes}\n`;
    
    msg += `━━━`;
    return msg;
  }).join('\n\n');

  const text = encodeURIComponent(summary);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

export function exportBackupToExcel(history: VisitData[]) {
  const wb = XLSX.utils.book_new();
  
  const backupRows = history.map(v => ({
    'ID': v.id,
    'Cliente_Associado': v.producer,
    'Unidade_Produtor': v.farm,
    'Lote': v.batch || '',
    'Data_Visita': v.date,
    'Fase_Producao': v.phase,
    'Racao_Atual': v.feed || '',
    'Protocolo_Medicamentoso': v.meds || '',
    'Data_Alojamento': v.housingDate || '',
    'Total_Animais': v.totalAnimals || 0,
    'Mortalidade_Lote': v.mortality || 0,
    'Temperatura_C': v.temp || '',
    'Umidade_Relativa': v.humidity || '',
    'CO2_ppm': v.co2 || '',
    'Duracao_Sintomas': v.duration || '',
    'Contagem_Tosse': v.counts?.cough ?? 0,
    'Contagem_Espirro': v.counts?.sneeze ?? 0,
    'Contagem_Fezes_Pastosas': v.counts?.e2 ?? 0,
    'Contagem_Fezes_Liquidas': v.counts?.e3 ?? 0,
    'Observacoes': v.notes || '',
    'Imagens_Urls': v.images ? JSON.stringify(v.images) : '[]'
  }));

  const ws = XLSX.utils.json_to_sheet(backupRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Backup_SuinoSaude_Historico');

  const filename = `SuinoSaude_Backup_Planilha_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function importBackupFromExcel(file: File): Promise<VisitData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Não foi possível ler o arquivo.');
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet);

        const visits: VisitData[] = rows.map(row => {
          const id = Number(row['ID']) || Date.now();
          const producer = String(row['Cliente_Associado'] ?? '');
          const farm = String(row['Unidade_Produtor'] ?? '');
          const batch = row['Lote'] !== undefined ? String(row['Lote']) : '';
          const date = String(row['Data_Visita'] ?? new Date().toISOString().slice(0, 10));
          const phase = String(row['Fase_Producao'] ?? '') as any;
          const feed = String(row['Racao_Atual'] ?? '');
          const meds = String(row['Protocolo_Medicamentoso'] ?? '');
          const housingDate = String(row['Data_Alojamento'] ?? '');
          const totalAnimals = Number(row['Total_Animais']) || 0;
          const mortality = Number(row['Mortalidade_Lote']) || 0;
          const temp = String(row['Temperatura_C'] ?? '');
          const humidity = String(row['Umidade_Relativa'] ?? '');
          const co2 = String(row['CO2_ppm'] ?? '');
          const duration = String(row['Duracao_Sintomas'] ?? 'Insignificante (< 24h)') as any;
          
          const counts = {
            cough: Number(row['Contagem_Tosse']) || 0,
            sneeze: Number(row['Contagem_Espirro']) || 0,
            e2: Number(row['Contagem_Fezes_Pastosas']) || 0,
            e3: Number(row['Contagem_Fezes_Liquidas']) || 0
          };

          const notes = row['Observacoes'] ? String(row['Observacoes']) : '';
          let images: string[] = [];
          try {
            if (row['Imagens_Urls']) {
              images = JSON.parse(row['Imagens_Urls']);
            }
          } catch {
            images = [];
          }

          const results = calculateVisitResults({
            id, producer, farm, batch, date, phase, feed, meds, housingDate, totalAnimals, mortality, temp, humidity, co2, duration, counts
          });

          return {
            id,
            producer,
            farm,
            batch,
            date,
            phase,
            feed,
            meds,
            housingDate,
            mortality,
            totalAnimals,
            temp,
            humidity,
            co2,
            duration,
            counts,
            results,
            notes,
            images
          };
        });

        resolve(visits);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
