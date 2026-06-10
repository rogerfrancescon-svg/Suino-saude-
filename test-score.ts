import { calculateVisitResults } from './src/lib/scoring';
import { SEED_DATA } from './src/lib/seed';

const valdecir = SEED_DATA.find(h => h.farm && h.farm.toLowerCase().includes('valdecir'));
if (valdecir) {
  const results = calculateVisitResults({
    ...valdecir,
    counts: valdecir.counts as any,
    totalAnimals: valdecir.totalAnimals,
    mortality: valdecir.mortality,
    date: valdecir.date,
    housingDate: valdecir.housingDate
  });
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log('Valdecir not found');
}
