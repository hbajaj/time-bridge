/* Saudi Arabia 2027: published official banking holiday calendar from SAMA.
 * https://sama.gov.sa/en-US/Supervision/pages/holidayschedules.aspx
 * Saudi Central Bank lists 07–11 Mar 2027 Eid al-Fitr, 16–20 May 2027
 * Eid al-Adha for financial institutions; national holidays are 22 Feb, 23 Sep.
 * Bank-sector dates are conservatively used for meeting exclusion; not every
 * employer has identical closures. Hijri dates may shift on observation.
 */
const dates=[['2027-02-22','Founding Day']];
for(const [start,end,name] of [
  ['2027-03-07','2027-03-11','Eid al-Fitr holiday (SAMA financial-sector schedule)'],
  ['2027-05-16','2027-05-20','Eid al-Adha holiday (SAMA financial-sector schedule)']
]){
  for(let t=Date.parse(start+'T12:00:00Z');t<=Date.parse(end+'T12:00:00Z');t+=86400000)
    dates.push([new Date(t).toISOString().slice(0,10),name]);
}
dates.push(['2027-09-23','Saudi National Day']);
export const SA_2027_OFFICIAL_CLOSURES=Object.freeze(dates.map(([date,name])=>({date,name,countryCode:'SA',holidayTypes:['Public'],global:true,calendarCoverage:'sa-sama-financial-2027-conservative'})));
