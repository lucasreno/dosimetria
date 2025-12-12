export interface MinimumWage {
  start: string; // ISO date YYYY-MM-DD
  end?: string;
  value: number;
  law: string;
}

export const MINIMUM_WAGE_HISTORY: MinimumWage[] = [
  { start: '2024-01-01', value: 1412.00, law: 'Decreto 11.864/2023' },
  { start: '2023-05-01', end: '2023-12-31', value: 1320.00, law: 'MP 1.172/2023' },
  { start: '2023-01-01', end: '2023-04-30', value: 1302.00, law: 'MP 1.143/2022' },
  { start: '2022-01-01', end: '2022-12-31', value: 1212.00, law: 'MP 1.091/2021' },
  { start: '2021-01-01', end: '2021-12-31', value: 1100.00, law: 'MP 1.021/2020' },
  { start: '2020-02-01', end: '2020-12-31', value: 1045.00, law: 'MP 919/2020' },
  { start: '2020-01-01', end: '2020-01-31', value: 1039.00, law: 'MP 916/2019' },
  { start: '2019-01-01', end: '2019-12-31', value: 998.00, law: 'Decreto 9.661/2019' },
  { start: '2018-01-01', end: '2018-12-31', value: 954.00, law: 'Decreto 9.255/2017' },
  { start: '2017-01-01', end: '2017-12-31', value: 937.00, law: 'Decreto 8.948/2016' },
  { start: '2016-01-01', end: '2016-12-31', value: 880.00, law: 'Decreto 8.618/2015' },
  { start: '2015-01-01', end: '2015-12-31', value: 788.00, law: 'Decreto 8.381/2014' },
  { start: '2014-01-01', end: '2014-12-31', value: 724.00, law: 'Decreto 8.166/2013' },
  { start: '2013-01-01', end: '2013-12-31', value: 678.00, law: 'Decreto 7.872/2012' },
  { start: '2012-01-01', end: '2012-12-31', value: 622.00, law: 'Decreto 7.655/2011' },
  { start: '2011-03-01', end: '2011-12-31', value: 545.00, law: 'Lei 12.382/2011' },
  { start: '2011-01-01', end: '2011-02-28', value: 540.00, law: 'MP 516/2010' },
  { start: '2010-01-01', end: '2010-12-31', value: 510.00, law: 'Lei 12.255/2010' },
];

export function getMinimumWage(dateStr: string): MinimumWage | undefined {
    if (!dateStr) return undefined;
    return MINIMUM_WAGE_HISTORY.find(w => {
        const afterStart = w.start <= dateStr;
        const beforeEnd = !w.end || w.end >= dateStr;
        return afterStart && beforeEnd;
    });
}

export const fineFractions = [
    { label: '1/30 (Mínimo Legal)', value: 1/30 },
    { label: '1/20', value: 1/20 },
    { label: '1/10', value: 1/10 },
    { label: '1/5', value: 1/5 },
    { label: '1/3', value: 1/3 },
    { label: '1/2', value: 1/2 },
    { label: '1 (Integral)', value: 1 },
    { label: '2 vezes', value: 2 },
    { label: '3 vezes', value: 3 },
    { label: '5 vezes (Máximo Legal)', value: 5 },
];

export function calculateFine(days: number, wage: number, fraction: number): number {
    return days * (wage * fraction);
}
