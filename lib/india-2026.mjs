/* India 2026: gazetted holidays for Central Government administrative offices.
 * Primary official source: https://www.cgca.gov.in/ccadl/list-of-holiday
 * Original 2026 DoPT notice: https://nhai.gov.in/assets/pdf/List_of_holidays-2026.pdf
 * This is NOT an exhaustive state / Union Territory calendar. Dates may be
 * amended by government notifications, particularly sighting-based holidays.
 */
export const INDIA_CENTRAL_GAZETTED_2026 = Object.freeze([
  [
    "2026-01-26",
    "Republic Day"
  ],
  [
    "2026-03-04",
    "Holi"
  ],
  [
    "2026-03-21",
    "Id-ul-Fitr"
  ],
  [
    "2026-03-26",
    "Ram Navami"
  ],
  [
    "2026-03-31",
    "Mahavir Jayanti"
  ],
  [
    "2026-04-03",
    "Good Friday"
  ],
  [
    "2026-05-01",
    "Buddha Purnima"
  ],
  [
    "2026-05-27",
    "Id-ul-Zuha (Bakrid)"
  ],
  [
    "2026-06-26",
    "Muharram"
  ],
  [
    "2026-08-15",
    "Independence Day"
  ],
  [
    "2026-08-26",
    "Milad-un-Nabi"
  ],
  [
    "2026-09-04",
    "Janmashtami"
  ],
  [
    "2026-10-02",
    "Mahatma Gandhi's Birthday"
  ],
  [
    "2026-10-20",
    "Dussehra"
  ],
  [
    "2026-11-08",
    "Diwali (Deepavali)"
  ],
  [
    "2026-11-24",
    "Guru Nanak's Birthday"
  ],
  [
    "2026-12-25",
    "Christmas Day"
  ]
].map(([date,name])=>({ date, name, countryCode:'IN', holidayTypes:['Public'], calendarCoverage:'central-gazetted-2026' })));
