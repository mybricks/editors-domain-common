import { Entity } from '../_types/domain';
import { FieldBizType, FieldDBType } from '../_constants/field';
import { AnyType } from '../_types';

/** 根据连接获取值校验的 script 片段 */
export const generateValidateScript = (entity: Entity, conAry: Array<{ from: string; to: string }>) => {
	let validateScript = 'for(let key of Object.keys(params)) {\n' +
		'if (params[key] === undefined || params[key] === null) { continue; }\n';
	const needValueFields = entity.fieldAry
		.filter(field => field.bizType !== FieldBizType.MAPPING && !field.isPrimaryKey && !field.isPrivate);
	const stringFieldNames = needValueFields
		.filter(field => (field.dbType === FieldDBType.VARCHAR || field.dbType === FieldDBType.MEDIUMTEXT) && field.bizType !== FieldBizType.ENUM)
		.map(field => conAry.find(con => con.to === `/${field.name}`))
		.filter(Boolean)
		.map((con: AnyType) => `"${con.from.substring(con.from.indexOf('/') + 1)}"`)
		.join(', ');
	
	if (stringFieldNames) {
		validateScript += `if ([${stringFieldNames}].includes(key)) {
					if (typeof params[key] !== "string" && typeof params[key] !== "number") {
						throw new Error("请求参数字段 " + key + " 必须为字符串或数字类型");
					}
				}\n`;
	}
	const bigintFieldNames = needValueFields
		.filter(field => field.dbType === FieldDBType.BIGINT)
		.map(field => conAry.find(con => con.to === `/${field.name}`))
		.filter(Boolean)
		.map((con: AnyType) => `"${con.from.substring(con.from.indexOf('/') + 1)}"`)
		.join(', ');
	
	if (bigintFieldNames) {
		validateScript += `if ([${bigintFieldNames}].includes(key)) {
					if (typeof params[key] !== "number" && parseInt(params[key]) != params[key]) {
						throw new Error("请求参数字段 " + key + " 必须为数字类型");
					}
				}\n`;
	}
	needValueFields
		.filter(field => field.bizType === FieldBizType.ENUM)
		.forEach(field => {
			const con = conAry.find(con => con.to === `/${field.name}`);
		
			if (con) {
				const fromPropName = con.from.substring(con.from.indexOf('/') + 1);
			
				validateScript += `if (key === "${fromPropName}") {
						const enumValues = ${JSON.stringify(field.enumValues ?? [])};
						if (enumValues.length <= 0) {
							if (typeof params[key] !== "string" && typeof params[key] !== "number") {
								throw new Error("请求参数字段 " + key + " 必须为字符串或数字类型");
							}
						} else {
							let parsedValue = params[key];
							try {
								parsedValue = JSON.parse(parsedValue);
							} catch (e) {}
							if (Array.isArray(parsedValue)) {
								for (let enumIndex = 0; enumIndex < parsedValue.length; enumIndex++) {
									if (!enumValues.includes(parsedValue[enumIndex])) {
										throw new Error("请求参数字段 " + key + " 中每一项必须为枚举值 " + enumValues.join("/") + " 其中之一");
									}
								}
							} else if (!enumValues.includes(String(parsedValue))) {
								throw new Error("请求参数字段 " + key + " 必须为枚举值 " + enumValues.join("/") + " 其中之一");
							}
						}
					}\n`;
			}
		});
	validateScript += '}';
	
	return validateScript;
};
