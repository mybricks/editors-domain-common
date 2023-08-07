import { Entity, Field } from '../_types/domain';
import { MethodList } from '../_constants/method';
import { AnyType } from '../_types';
import { FieldBizType } from '../_constants/field';

export type SuggestionType = {
	label: string;
	apply?: string;
	detail?: string;
	type?: string;
	docs?: string;
	properties?: Array<SuggestionType>;
};

/** 获取实体字段提示信息 */
export const getEntityCompletions = (params: {
	entity: Entity;
	entityAry: Entity[];
	entityIdChain: string[];
	isRoot?: boolean;
}) => {
	const { entity, entityAry, isRoot, entityIdChain } = params;
	const _prop: SuggestionType[] = [];
	const curEntity = entityAry.find(e => e.id === entity?.id);

	if (curEntity) {
		const notMapping = entityIdChain[entityIdChain.length - 2] === curEntity.id;
		const fieldAry = curEntity.fieldAry.filter(field => entity.fieldAry.some(f => f.id === field.id && !f.isPrivate));
		fieldAry.forEach(field => {
			if (notMapping && field.bizType === FieldBizType.MAPPING) {
				return;
			}
			const suggestion: SuggestionType = {
				label: field.name,
				apply: field.name,
				docs: field.name,
				detail: field.name
			};

			if (field?.mapping?.entity?.fieldAry?.length && !notMapping) {
				suggestion.properties = getEntityCompletions({
					entity: field.mapping.entity,
					entityAry,
					entityIdChain: [...entityIdChain, curEntity.id],
				});
			} else {
				suggestion.apply = field.name + '$';
			}
			_prop.push(suggestion);
		});

		return isRoot ? [{ label: '$', insertText: '$', docs: '实体字段', detail: '实体字段', properties: _prop }] : _prop;
	}

	return _prop;
};

/** 获取 code 编辑器提示信息 */
export const getMethodCompletions = () => {
	const _prop: SuggestionType[] = [];
	MethodList.forEach(category => {
		category.methods.forEach(method => {
			_prop.push({
				type: 'function',
				label: method.method,
				apply: method.method + method.suffix,
				detail: method.description
			});
		});
	});

	return _prop;
};

/** 根据 filedName 列表递归获取字段 */
const getFieldByFieldNames = (filedName: string[], entity: Entity, entityAry: Entity[]) => {
	if (!filedName.length) {
		return;
	}
	let curEntity = entityAry.find(e => e.id === entity.id);

	if (!curEntity) {
		return;
	}
	curEntity = { ...curEntity, fieldAry: curEntity.fieldAry.filter(f => entity.fieldAry.find(ff => ff.id === f.id)) };
	const name = filedName.shift();
	const originField = entity.fieldAry.find(f => f.name === name);

	if (!originField) {
		return;
	}
	/** Hack 逻辑，判断是否是总数字段 */
	if (originField?.name === '总数' && originField?.desc === '查询数据总数') {
		return originField;
	}

	const field = curEntity.fieldAry.find(f => f.name === name);

	if (filedName.length && !field?.mapping?.entity?.fieldAry?.length) {
		return;
	}

	return filedName.length ? getFieldByFieldNames(filedName, field?.mapping?.entity as Entity, entityAry) : field;
};

/** 根据 fieldName 列表获取对应的字段层级 */
const getFieldPathByFieldNames = (filedName: string[], entity: Entity, entityAry: Entity[]) => {
	if (!filedName.length) {
		return;
	}

	let index = 0;
	let mappingEntity: AnyType = entity;
	let curEntity: AnyType;
	let returnField: AnyType;

	while (index < filedName.length) {
		curEntity = entityAry.find(e => e.id === mappingEntity?.id);

		if (!curEntity) {
			return;
		}

		curEntity = { ...curEntity, fieldAry: curEntity.fieldAry.filter(f => mappingEntity.fieldAry.find(ff => ff.id === f.id)) };
		const originField = mappingEntity.fieldAry.find(f => f.name === filedName[index]);

		if (!originField) {
			return;
		}
		let field;
		/** Hack 逻辑，判断是否是总数字段 */
		if (originField?.name === '总数' && originField?.desc === '查询数据总数') {
			field = originField;
		} else {
			field = curEntity.fieldAry.find(f => f.name === filedName[index]) as Field;
		}

		if (!field) {
			return;
		}

		returnField = {
			fieldId: field.id,
			fieldName: field.name,
			entityId: mappingEntity.id,
			fromPath: !index ? [] : [...returnField.fromPath, { ...returnField, fromPath: [] }],
		};

		index++;
		mappingEntity = field?.mapping?.entity;
	}

	return returnField;
};

/** 提取所有计算字段使用到的实体字段 */
export const getFieldsFromCalcRule = (calcRule: string, entity: Entity, entityAry: Entity[], parentField: Field) => {
	const fieldNames = calcRule.match(/(\$\.[^$\s\t]+\$)/g) ?? [];
	const parentSelectedField = { fieldId: parentField.id, fieldName: parentField.name, entityId: (parentField as AnyType).parent.id, fromPath: [] };

	return fieldNames
		.map(name => {
			return getFieldPathByFieldNames(name.match(/^\$\.([^$\s\t]+)\$$/)?.[1]?.split('.') ?? [], entity, entityAry);
		})
		.filter(Boolean)
		.reduce(
			(pre, field) => {
				return [
					...pre,
					field,
					...field.fromPath.map((path, index) => {
						return { ...path, fromPath: field.fromPath.slice(0, index) };
					})
				];
			},
			[]
		)
		.map(field => ({ ...field, fromPath: [{ ...parentSelectedField }, ...field.fromPath] }))
		.concat(parentSelectedField);
};

/** 获取计算字段类型 */
export const getFieldTypeFromCalcRule = (calcRule: string, entity: Entity, entityAry: Entity[]) => {
	if (calcRule) {
		if (/^\$\.[^$\s\t]+\$$/.test(calcRule)) {
			const field = getFieldByFieldNames(calcRule.match(/^\$\.([^$\s\t]+)\$$/)?.[1]?.split('.') ?? [], entity, entityAry);

			return field?.bizType;
		} else if (/^([^$\s\t(]+)\(.*\)$/.test(calcRule)) {
			const methodString = calcRule.match(/^([^$\s\t(]+)\(.*\)$/)?.[1];

			if (methodString) {
				let method: AnyType = null;

				for (let i = 0; i < MethodList.length; i++) {
					const item = MethodList[i];
					method = item.methods.find(m => m.method === methodString.toUpperCase());

					if (method) {
						break;
					}
				}

				return method?.returnType;
			}
		} else {
			const fieldNames = calcRule.match(/(\$\.[^$\s\t]+\$)/g) ?? [];
			let field: AnyType = null;

			for (let i = 0; i < fieldNames.length; i++) {
				field = getFieldByFieldNames(fieldNames[i].match(/^\$\.([^$\s\t]+)\$$/)?.[1]?.split('.') ?? [], entity, entityAry);

				if (!field) {
					return;
				}
			}

			return field?.bizType;
		}
	}
};

export const formatSQLByCalcRule = (calcRule: string, parentField: Field) => {
	return calcRule.replace(/(\$\.[^$\s\t]+\$)/g, ($0) => {
		return $0
			.replace(/^\$\./, `MAPPING_${parentField.name}_`)
			.replace(/\$$/, '')
			.replace(/\./g, '_');
	});
};