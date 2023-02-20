import { Entity } from '../_types/domain';
import { FieldBizType } from '../_constants/field';

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

export const spliceDataFormatString = (entity: Entity, entities: Entity[]) => {
	const entityMap = {};
	entities.forEach(e => entityMap[e.id] = e);
	/** mapping 字段，存在映射且实体存在 */
	const mappingFields = entity.fieldAry.filter(field => {
		return field.selected && field.mapping?.entity?.fieldAry?.length && entityMap[field.mapping.entity.id];
	});
	let ifString = '';
	let convertString = '';
	
	entity.fieldAry
		.filter(field => field.bizType !== FieldBizType.MAPPING && field.selected)
		.forEach(filed => {
			if (filed.bizType === FieldBizType.DATETIME && filed.showFormat) {
				ifString += `;if (key === '${filed.name}') { item['_' + key] = item[key]; item[key] = FORMAT_MAP.formatTime(new Date(item[key]), '${filed.showFormat}') }\n`;
			}
		});
	/** mapping 字段列表 */
	mappingFields.forEach(field => {
		const entity = field.mapping!.entity!;
		
		convertString += `item._${field.name} = item.${field.name};
		item.${field.name} = {};\n`;
		
		entity.fieldAry.forEach(f => {
			if (f.bizType === FieldBizType.DATETIME && f.showFormat) {
				ifString += `;if (key === '${field.name}_${f.name}') { item['_' + key] = item[key]; item[key] = FORMAT_MAP.formatTime(new Date(item[key]), '${f.showFormat}') }\n`;
			}
			
			convertString += `item.${field.name}.${f.name} = item.${field.name}_${f.name};
				delete item.${field.name}_${f.name};\n`;
		});
	});
	
	return `
		rows = Array.from(rows || []).map(item => {
			Object.keys(item).forEach(key => {
				${ifString}
			});
			
			${convertString}
			
			return item;
		});
	`;
};