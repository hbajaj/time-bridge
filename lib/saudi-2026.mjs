/* Saudi Arabia 2026: conservative closure calendar from the official Saudi
 * Air Navigation Services aviation circular 02/2026 (1 Jan 2026):
 * https://aimss.sans.com.sa/assets/FileManagerFiles/AIC/OE-eAIC-2026-02-en-SA.pdf
 * Sector-specific closures are deliberately included to avoid recommending dates
 * that may be unavailable; they are not a uniform guarantee for all employers.
 * Eid observance can change by official moon-sighting announcement.
 */
const dates=[['2026-02-22','Founding Day']];
for(const [start,end,name] of [
  ['2026-03-14','2026-03-24','Eid al-Fitr holiday (SANS official closure window)'],
  ['2026-05-22','2026-06-01','Eid al-Adha holiday (SANS official closure window)']
]){
  for(let time=Date.parse(start+'T12:00:00Z');time<=Date.parse(end+'T12:00:00Z');time+=86400000){
    dates.push([new Date(time).toISOString().slice(0,10),name]);
  }
}
dates.push(['2026-09-23','Saudi National Day']);
export const SA_2026_OFFICIAL_CLOSURES = Object.freeze(dates.map(([date,name])=>({
  date,name,countryCode:'SA',holidayTypes:['Public'],global:true,
  calendarCoverage:'sa-official-sans-2026-conservative'
})));
