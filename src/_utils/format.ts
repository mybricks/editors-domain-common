/* eslint-disable no-useless-escape */
import { Field, SelectedField } from '../_types/domain';

/** 转化时间 */
export const formatTime = (date, format) => {
	if (date == null) {
		return '';
	}
	const pad = n => n < 10 ? '0' + n : n;
	const year = date.getFullYear(),
		yearShort = year.toString().substring(2),
		month = date.getMonth() + 1,
		monthPad = pad(month),
		dateInMonth = date.getDate(),
		dateInMonthPad = pad(dateInMonth),
		hour = date.getHours(),
		hourPad = pad(hour),
		minute = date.getMinutes(),
		minutePad = pad(minute),
		second = date.getSeconds(),
		secondPad = pad(second);
	
	return format
		.replace(/yyyy/g, year)
		.replace(/yy/g, yearShort)
		.replace(/MM/g, monthPad)
		.replace(/M/g, month)
		.replace(/DD/g, dateInMonthPad)
		.replace(/D/g, dateInMonth)
		.replace(/HH/g, hourPad)
		.replace(/H/g, hour)
		.replace(/mm/g, minutePad)
		.replace(/m/g, minute)
		.replace(/ss/g, secondPad)
		.replace(/s/g, second);
};

export const spliceDataFormatString = (entityFieldMap: Record<string, Field>, fields: Array<{ key: string; showFormat?: string }> = []) => {
	const deepFormatCodeString = `
		const deepFormat = (item, path) => {
			if (!path.length || !item) { return; }
			const key = path[0].key;
			if (path.length === 1) {
				if (Array.isArray(item)) {
					item.forEach(i => {
						if (path[0].showFormat === 'JSON') {
							try {
								i[key] = i[key] ? JSON.parse(i[key]) : i[key];
							} catch (e) {}
						} else {
							i['_' + key] = i[key];
							i[key] = i[key] ? FORMAT_MAP.formatTime(new Date(i[key]), path[0].showFormat) : null;
						}
					})
				} else {
					if (path[0].showFormat === 'JSON') {
						try {
							item[key] = item[key] ? JSON.parse(item[key]) : item[key];
						} catch (e) {}
					} else {
						item['_' + key] = item[key];
						item[key] = item[key] ? FORMAT_MAP.formatTime(new Date(item[key]), path[0].showFormat) : null;
					}
				}
				
				return ;
			}
			
			if (Array.isArray(item)) {
				item.forEach(i => {
					deepFormat(i, path.slice(1));
				})
			} else {
				deepFormat(item[key], path.slice(1));
			}
		};
	`;
	
	return `
		${deepFormatCodeString}
		rows = Array.from(rows || []).map(item => {
			${JSON.stringify(fields)}.forEach(path => {
				deepFormat(item, path)
			});

			return item;
		});
	`;
};
