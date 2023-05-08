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

export const spliceDataFormatString = (entityFieldMap: Record<string, Field>, fields: SelectedField[] = []) => {
	const deepFormatCodeString = `
		const deepFormat = (item, path) => {
			if (!path.length || !item) { return; }
			const key = path[0].key;
			if (path.length === 1) {
				if (Array.isArray(item)) {
					item.forEach(i => {
						i['_' + key] = i[key];
						i[key] = FORMAT_MAP.formatTime(new Date(i[key]), path[0].showFormat);
					})
				} else {
					item['_' + key] = item[key];
					item[key] = FORMAT_MAP.formatTime(new Date(item[key]), path[0].showFormat);
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
	
	const needFormatPaths = fields.map(field => [...field.fromPath.map(p => ({ key: entityFieldMap[p.entityId + p.fieldId].name })), { key: entityFieldMap[field.entityId + field.fieldId].name, showFormat: entityFieldMap[field.entityId + field.fieldId].showFormat }]);
	return `
		${deepFormatCodeString}
		rows = Array.from(rows || []).map(item => {
			${JSON.stringify(needFormatPaths)}.forEach(path => {
				deepFormat(item, path)
			});

			return item;
		});
	`;
};
