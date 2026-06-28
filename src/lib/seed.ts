import { VisitData, Phase } from '../types';
import { calculateVisitResults } from './scoring';

export const SEED_DATA: Partial<VisitData>[] = [
  {
    id: 1716940800000,
    producer: 'Pastre',
    farm: 'Luiz Forchezatto',
    date: '2026-04-29',
    phase: 'Terminação',
    feed: 'Crescimento 1',
    meds: 'Enramicina 8%',
    housingDate: '2026-04-07',
    mortality: 0,
    totalAnimals: 1200,
    temp: '',
    humidity: '',
    co2: '',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 22, sneeze: 5, e2: 0, e3: 2 },
    notes: `Peso inicial: 25,28 kg
Consumo do lote conforme tabela: 29,8 kg
A regulagem dos comedouros encontra-se adequada.
Observam-se algumas fezes com consistência pastosa.
Adicionalmente à medicação injetável, sugere-se a administração de ácido via água.
Foram identificados quadros respiratórios leves.
Recomendou-se a aplicação de medicação injetável e nebulização com Virkon.`
  },
  {
    id: 1716940800001,
    producer: 'Pastre',
    farm: 'Jarlei Toniello',
    date: '2026-04-29',
    phase: 'Terminação',
    feed: 'Terminação 2',
    meds: 'Enramicina 8%',
    housingDate: '2026-02-10',
    mortality: 2,
    totalAnimals: 390,
    temp: '',
    humidity: '',
    co2: '',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 14, sneeze: 0, e2: 0, e3: 1 },
    notes: `Peso médio dos animais alojados: 24,82 kg.
Foi observada a presença de gás no final do barracão, provavelmente devido ao acúmulo de sujidade nas últimas baias (conforme documentado em foto).
Identificou-se um leve quadro respiratório, caracterizado por tosse seca, que sugere a possibilidade de infecção por Mycoplasma.
Considerando o baixo índice respiratório, sugere-se a administração de medicação de carência zero aos animais afetados.
É fundamental reforçar a limpeza das baias para prevenir a formação de gases e o surgimento de novos quadros respiratórios.
O consumo de ração está 2,8 kg abaixo do esperado.
Houve o registro de 2 animais mortos.`
  },
  {
    id: 1716940800002,
    producer: 'Pastre',
    farm: 'Eladio Cumerlato',
    date: '2026-05-19',
    phase: 'Terminação' as Phase,
    feed: 'Terminação 1',
    meds: 'Doxiciclina 50% + Tiamulina 80%',
    housingDate: '2026-03-11',
    mortality: 3,
    totalAnimals: 353,
    temp: '16.5',
    humidity: '73.9',
    co2: '700',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 18, sneeze: 0, e2: 0, e3: 0 },
    notes: `Animais com quadro respiratório evidente, registro em foto 
Ja chegaram com quadro entérico 
Então com 4Kg a baixo`
  },
  {
    id: 1716940800003,
    producer: 'Pastre',
    farm: 'Laudir Galante',
    date: '2026-05-19',
    phase: 'Terminação' as Phase,
    feed: 'Crescimento 2',
    meds: 'Florfenicol 30% + Lincomicina 44%',
    housingDate: '2026-04-14',
    mortality: 10,
    totalAnimals: 1200,
    temp: '19.2',
    humidity: '67',
    co2: '1700',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 8, sneeze: 7, e2: 5, e3: 16 },
    notes: `Fezes Pastosas 
Leve respiratório 
Presença de artrite
Coletados pulmão swabe retal histopatologia (linfonodo mesentério, pulmão)`
  },
  {
    id: 1716940800004,
    producer: 'Pastre',
    farm: 'Violar Ferrari',
    date: '2026-05-19',
    phase: 'Terminação' as Phase,
    feed: 'Crescimento 3',
    meds: 'Enramicina 8%',
    housingDate: '2026-03-30',
    mortality: 13,
    totalAnimals: 1800,
    temp: '19',
    humidity: '73',
    co2: '3420',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 22, sneeze: 27, e2: 0, e3: 2 },
    notes: `Presença alta de gas no final do barracao de cima
Enterico sobre controle e leve respiratório 
Animais estavam com diarreia na ração crescimento 2 e cortou na entrada da ração crescimento 3
Consumo abaixo da tabela 7 kg`
  },
  {
    id: 1716940800005,
    producer: 'Pastre',
    farm: 'Tanamara Kirst',
    date: '2026-05-19',
    phase: 'Terminação' as Phase,
    feed: 'Crescimento 1',
    meds: 'Enramicina 8%',
    housingDate: '2026-05-04',
    mortality: 8,
    totalAnimals: 1535,
    temp: '20',
    humidity: '63',
    co2: '1100',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 41, sneeze: 21, e2: 5, e3: 0 },
    notes: `Alerta de co² 1200 no barracão de cima 
Relato de animais estercando mole animais com quadro entérico evidente
 Consumo 1,2kg abaixo da tabela
Baia muito sujas de fezes moles`
  },
  {
    id: 1716940800006,
    producer: 'Pastre',
    farm: 'Jones Gemi',
    date: '2026-05-19',
    phase: 'Terminação' as Phase,
    feed: 'Crescimento 2',
    meds: 'Florfenicol 30% + Lincomicina 44%',
    housingDate: '2026-04-07',
    mortality: 2,
    totalAnimals: 799,
    temp: '18.5',
    humidity: '64',
    co2: '700',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 15, sneeze: 1, e2: 0, e3: 3 },
    notes: `Desafio entérico na saída da ração crescimento 2 e início da ração crescimento 3 melhorou com Neomicina 
Consumo esta dentro da tabela, consumindo ração velha até amanhã`
  },
  {
    id: 1716940800007,
    producer: 'Pastre',
    farm: 'Wanderlei Richit',
    date: '2026-05-20',
    phase: 'Terminação' as Phase,
    feed: 'Crescimento 3',
    meds: 'Enramicina 8%',
    housingDate: '2026-03-23',
    mortality: 8,
    totalAnimals: 800,
    temp: '16.2',
    humidity: '71',
    co2: '1300',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 14, sneeze: 14, e2: 0, e3: 0 },
    notes: `Reclamação do cliente sobre algumas cargas de ração fina
Foi tomado ação de aumentar granulometria 
Consumo 6kg abaixo 
Lincomicina nao foi efetivo contra os entéricos`
  },
  {
    id: 1716940800008,
    producer: 'Pastre',
    farm: 'Delcio Renosto',
    date: '2026-06-03',
    phase: 'Terminação',
    feed: 'Terminação 2',
    meds: 'Enramicina 8%',
    housingDate: '2026-03-27',
    mortality: 2,
    totalAnimals: 360,
    temp: '10.5',
    humidity: '85',
    co2: '850',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 18, sneeze: 7, e2: 0, e3: 0 },
    notes: `Próximo lote será o lote teste`
  },
  {
    id: 1716940800009,
    producer: 'Pastre',
    farm: 'Roni José Zanela',
    date: '2026-06-03',
    phase: 'Terminação',
    feed: 'Crescimento 2',
    meds: 'Florfenicol 30% + Lincomicina 44%',
    housingDate: '2026-05-05',
    mortality: 1,
    totalAnimals: 575,
    temp: '18',
    humidity: '68',
    co2: '2600',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 37, sneeze: 14, e2: 0, e3: 0 },
    notes: `Regular a cada 10 minutos a abertura de cortinas programação amônia ( esta a cada 15 min)
Manter um vão aberto, nao deixando lacrar 100% as cortinas`
  },
  {
    id: 1716940800010,
    producer: 'Pastre',
    farm: 'Gilmar Miglioretto',
    date: '2026-06-03',
    phase: 'Terminação' as Phase,
    feed: 'Alojamento',
    meds: 'Amoxicilina 50% + Colistina 50%',
    housingDate: '2026-05-28',
    mortality: 0,
    totalAnimals: 540,
    temp: '19.7',
    humidity: '57',
    co2: '500',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 5, sneeze: 12, e2: 0, e3: 0 },
    notes: `Origem diversa (Mossa 10)
Animais desaparrelhos, refugos no meio
Passou por quadro entérico (resolvido com acido`
  },
  {
    id: 1716940800011,
    producer: 'Pastre',
    farm: 'Altivo Dani',
    date: '2026-06-03',
    phase: 'Terminação',
    feed: 'Crescimento 2',
    meds: 'Florfenicol 30% + Lincomicina 44%',
    housingDate: '2026-04-21',
    mortality: 4,
    totalAnimals: 1015,
    temp: '21',
    humidity: '59',
    co2: '1400',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 12, sneeze: 6, e2: 0, e3: 0 },
    notes: ``
  },
  {
    id: 1716940800012,
    producer: 'Pastre',
    farm: 'Valdecir Forchezato',
    date: '2026-06-03',
    phase: 'Terminação',
    feed: 'Terminação 2',
    meds: 'Enramicina 8%',
    housingDate: '2026-03-02',
    mortality: 10,
    totalAnimals: 580,
    temp: '20',
    humidity: '60',
    co2: '650',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 6, sneeze: 0, e2: 0, e3: 0 },
    notes: `Quadro de app no animais`
  },
  {
    id: 1716940800013,
    producer: 'Pastre',
    farm: 'José Trojan',
    date: '2026-06-03',
    phase: 'Terminação',
    feed: 'Crescimento 1',
    meds: 'Enramicina 8%',
    housingDate: '2026-05-11',
    mortality: 6,
    totalAnimals: 1260,
    temp: '20',
    humidity: '58',
    co2: '580',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 37, sneeze: 42, e2: 0, e3: 0 },
    notes: `Tosse bem carregada acompanhada de batedeira e alguns casos entéricos 
Iniciou tratamento com trimetox`
  },
  {
    id: 1716940800014,
    producer: 'Auriverde',
    farm: 'Creche baixo peso',
    date: '2026-06-03',
    phase: 'Creche (leitões desmamados)' as Phase,
    feed: 'Inicial',
    meds: '',
    housingDate: '2026-05-01',
    mortality: 0,
    totalAnimals: 1400,
    temp: '21.3',
    humidity: '79',
    co2: '836',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 56, sneeze: 55, e2: 0, e3: 0 },
    notes: `Os animais localizados na porção inicial do barracão inferior estão consumindo a ração inicial.Durante o período de consumo da ração inicial, observa-se um desafio respiratório aumentado.Sugerido realizar tratamento do lote`
  },
  {
    id: 1716940800015,
    producer: 'Auriverde',
    farm: 'Elton dupon',
    date: '2026-06-09',
    phase: 'Terminação' as Phase,
    feed: 'Crescimento 2',
    meds: '',
    housingDate: '2026-03-01',
    mortality: 8,
    totalAnimals: 1600,
    temp: '20',
    humidity: '77',
    co2: '710',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 37, sneeze: 21, e2: 0, e3: 0 },
    notes: `Cochos com regulagens mais abertas.Pelete mais quebradiço e menor.22 ton. barracão 122 ton. barracão 2Próxima carga: terça.`
  },
  {
    id: 1716940800016,
    producer: 'Auriverde',
    farm: 'Paulo kunh',
    date: '2026-06-09',
    phase: 'Terminação' as Phase,
    feed: 'Alojamento',
    meds: '',
    housingDate: '2026-04-01',
    mortality: 0,
    totalAnimals: 1280,
    temp: '22.4',
    humidity: '67',
    co2: '640',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 33, sneeze: 26, e2: 0, e3: 3 },
    notes: `Alojado com 16,04 kg/leitão.Quadros de encefalite no alojamento (amoxicilina via água, 3º dia) apresentando bom resultado.Volume de ração: 14 ton no silo.`
  },
  {
    id: 1716940800017,
    producer: 'Auriverde',
    farm: 'Claudia herrmann',
    date: '2026-06-09',
    phase: 'Terminação' as Phase,
    feed: 'Terminação 1',
    meds: '',
    housingDate: '2026-03-01',
    mortality: 35,
    totalAnimals: 1950,
    temp: '',
    humidity: '',
    co2: '1200',
    duration: 'Insignificante (< 24h)',
    counts: { cough: 33, sneeze: 10, e2: 0, e3: 0 },
    notes: `Sintomas de APP nos dois barracões de cima.Será tratado com tilmicosina.Ração no silo: 14 toneladas de ração.`
  }
];

export function getSeededVisits(): VisitData[] {
  return SEED_DATA.map(d => {
    const results = calculateVisitResults(d);
    return {
      ...d,
      results
    } as VisitData;
  });
}
