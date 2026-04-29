export type HolidayInfo = {
	name: string
	label: string
	type: 'holiday' | 'workday'
}

function dateKey(month: number, day: number) {
	return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addHolidayRange(target: Record<string, HolidayInfo>, month: number, start: number, end: number, name: string, label: string) {
	for (let day = start; day <= end; day++) {
		target[dateKey(month, day)] = { name, label, type: 'holiday' }
	}
}

const holidays: Record<string, HolidayInfo> = {}

addHolidayRange(holidays, 1, 1, 3, '元旦', '元旦')
addHolidayRange(holidays, 2, 15, 23, '春节', '春节')
addHolidayRange(holidays, 4, 4, 6, '清明节', '清明')
addHolidayRange(holidays, 5, 1, 5, '劳动节', '劳动')
addHolidayRange(holidays, 6, 19, 21, '端午节', '端午')
addHolidayRange(holidays, 9, 25, 27, '中秋节', '中秋')
addHolidayRange(holidays, 10, 1, 7, '国庆节', '国庆')

for (const key of ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10']) {
	holidays[key] = { name: '调休上班', label: '班', type: 'workday' }
}

export const HOLIDAYS_2026 = holidays
