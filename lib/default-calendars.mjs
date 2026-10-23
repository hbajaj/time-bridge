/* TimeBridge default-location offline calendars 2026-2027.
 * US source: https://piv.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
 * India 2027: DoPT F.No.12/2/2023-JCA dated July 16, 2026, Annexure I.
 * Nigeria 2026: Federal Ministry of Information and National Orientation
 * public holiday declarations (fmino.gov.ng), and fixed national holidays.
 * Nigeria 2027: statutory and Easter dates only; no unannounced Eid dates.
 * All snapshots are national/federal or central-government baselines, not
 * a guarantee of every state, private-sector, lunar or new ad-hoc closure.
 */
import { INDIA_CENTRAL_GAZETTED_2026 } from './india-2026.mjs';
const rows=Object.freeze({
  "US-2026": [
    [
      "2026-01-01",
      "New Year's Day"
    ],
    [
      "2026-01-19",
      "Birthday of Martin Luther King, Jr."
    ],
    [
      "2026-02-16",
      "Washington's Birthday"
    ],
    [
      "2026-05-25",
      "Memorial Day"
    ],
    [
      "2026-06-19",
      "Juneteenth National Independence Day"
    ],
    [
      "2026-07-03",
      "Independence Day (observed)"
    ],
    [
      "2026-09-07",
      "Labor Day"
    ],
    [
      "2026-10-12",
      "Columbus Day"
    ],
    [
      "2026-11-11",
      "Veterans Day"
    ],
    [
      "2026-11-26",
      "Thanksgiving Day"
    ],
    [
      "2026-12-25",
      "Christmas Day"
    ]
  ],
  "US-2027": [
    [
      "2027-01-01",
      "New Year's Day"
    ],
    [
      "2027-01-18",
      "Birthday of Martin Luther King, Jr."
    ],
    [
      "2027-02-15",
      "Washington's Birthday"
    ],
    [
      "2027-05-31",
      "Memorial Day"
    ],
    [
      "2027-06-18",
      "Juneteenth National Independence Day (observed)"
    ],
    [
      "2027-07-05",
      "Independence Day (observed)"
    ],
    [
      "2027-09-06",
      "Labor Day"
    ],
    [
      "2027-10-11",
      "Columbus Day"
    ],
    [
      "2027-11-11",
      "Veterans Day"
    ],
    [
      "2027-11-25",
      "Thanksgiving Day"
    ],
    [
      "2027-12-24",
      "Christmas Day (observed)"
    ]
  ],
  "IN-2027": [
    [
      "2027-01-26",
      "Republic Day"
    ],
    [
      "2027-03-10",
      "Id-ul-Fitr (moon-sighting subject to change)"
    ],
    [
      "2027-03-23",
      "Holi"
    ],
    [
      "2027-03-26",
      "Good Friday"
    ],
    [
      "2027-04-15",
      "Ram Navami"
    ],
    [
      "2027-04-19",
      "Mahavir Jayanti"
    ],
    [
      "2027-05-17",
      "Id-ul-Zuha (moon-sighting subject to change)"
    ],
    [
      "2027-05-20",
      "Buddha Purnima"
    ],
    [
      "2027-06-16",
      "Muharram (moon-sighting subject to change)"
    ],
    [
      "2027-08-15",
      "Independence Day"
    ],
    [
      "2027-08-15",
      "Milad-un-Nabi (moon-sighting subject to change)"
    ],
    [
      "2027-08-25",
      "Janmashtami"
    ],
    [
      "2027-10-02",
      "Mahatma Gandhi's Birthday"
    ],
    [
      "2027-10-09",
      "Dussehra"
    ],
    [
      "2027-10-29",
      "Diwali (Deepavali)"
    ],
    [
      "2027-11-14",
      "Guru Nanak's Birthday"
    ],
    [
      "2027-12-25",
      "Christmas Day"
    ]
  ],
  "NG-2026": [
    [
      "2026-01-01",
      "New Year's Day"
    ],
    [
      "2026-03-19",
      "Eid-ul-Fitr - officially declared"
    ],
    [
      "2026-03-20",
      "Eid-ul-Fitr - officially declared"
    ],
    [
      "2026-04-03",
      "Good Friday"
    ],
    [
      "2026-04-06",
      "Easter Monday"
    ],
    [
      "2026-05-01",
      "Workers' Day"
    ],
    [
      "2026-05-27",
      "Eid-ul-Adha - officially declared"
    ],
    [
      "2026-05-28",
      "Eid-ul-Adha - officially declared"
    ],
    [
      "2026-06-12",
      "Democracy Day"
    ],
    [
      "2026-08-25",
      "Eid-el-Maulud"
    ],
    [
      "2026-10-01",
      "Independence Day"
    ],
    [
      "2026-12-25",
      "Christmas Day"
    ],
    [
      "2026-12-26",
      "Boxing Day"
    ]
  ],
  "NG-2027": [
    [
      "2027-01-01",
      "New Year's Day"
    ],
    [
      "2027-03-26",
      "Good Friday"
    ],
    [
      "2027-03-29",
      "Easter Monday"
    ],
    [
      "2027-05-01",
      "Workers' Day"
    ],
    [
      "2027-06-12",
      "Democracy Day"
    ],
    [
      "2027-10-01",
      "Independence Day"
    ],
    [
      "2027-12-25",
      "Christmas Day"
    ],
    [
      "2027-12-26",
      "Boxing Day"
    ]
  ]
});
export function publishedDefaultCalendar(country,year){
 const key=`${country}-${year}`;
 if(key==='IN-2026')return {data:INDIA_CENTRAL_GAZETTED_2026,source:'india-gazetted-2026',coverage:'India central-government gazetted dates only; state and regional holidays not complete',completeness:'regional-incomplete'};
 if(!Object.prototype.hasOwnProperty.call(rows,key))return null;
 const partial=key==='NG-2027';
 const coverage=partial?'Nigeria 2027 partial baseline: fixed public holidays and Easter only; Eid/Maulud dates await official announcement. Do not treat unlisted dates as confirmed working days.':country==='IN'?'India DoPT 2027 Delhi/New Delhi central-government gazetted holidays; lunar dates and other regional calendars can differ.':country==='US'?'US federal observed holidays from OPM; states and private employers may differ.':'Nigeria nationally published holidays; local and future special closures may differ.';
 return {data:rows[key].map(([date,name])=>({date,name,countryCode:country,holidayTypes:['Public'],global:true})),source:`published-${country.toLowerCase()}-${year}`,coverage,completeness:partial?'partial':country==='IN'?'regional-incomplete':'published-baseline'};
}
