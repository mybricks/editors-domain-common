import { AnyType } from '../_types';
import { SQLOrder, SQLWhereJoiner } from '../_constants/field';
import { FieldBizType, FieldDBType, SQLOperator, spliceWhereSQLFragmentByConditions, getValueByOperatorAndFieldType, getValueByFieldType, spliceSelectSQLByConditions, spliceSelectCountSQLByConditions } from '../_utils/sql';


export type T_Field = {
	id: string;
	isPrimaryKey?: boolean;
	/** 私有字段 */
	isPrivate?: boolean;
	name: string;
	desc?: string;
	bizType: string;
	/** 关联的实体表 ID */
	relationEntityId?: string;
	selected?: boolean;
}

export type T_Entity = {
	id: string;
	name: string;
	desc?: string;
	selected?: boolean;
	fieldAry: T_Field[];
}

export type T_Condition = {
	fieldId: string;
	entityId?: string;
	fieldName: string;
	operator?: string;
	value?: string;

	conditions?: T_Condition[];
	whereJoiner?: SQLWhereJoiner;
}

export default class QueryCtx {
	editorEle!: HTMLElement;

	paramSchema!: Record<string, unknown>;

	domainModel: AnyType;

	value!: {
		get(): AnyType;
		set(value: AnyType): void;
	};

	showPager!: boolean;

	nowValue!: {
		desc: string
		sql: string
		entities: T_Entity[],
		conditions: T_Condition,
		limit: number | string;
		pageIndex?: string;
		orders: Array<{ fieldId: string; fieldName: string; order: SQLOrder; entityId: string }>;
	};

	close!: () => void;

	blurAry = [];

	addBlur(fn) {
		this.blurAry.push(fn);
	}

	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());

			this.blurAry = [];
		}
	}

	save() {
		const { entities, conditions, orders, limit, pageIndex } = this.nowValue;
		let desc = '';

		entities.filter(entity => entity.fieldAry.length && entity.selected).forEach((entity) => {
			desc = `${desc ? `${desc};\n` : ''}${entity.name} 的 ${entity.fieldAry.filter(f => f.selected).map(field => field.name).join(', ')}`;
		}, []);

		if (entities?.length && entities[0].fieldAry.length > 0) {

			let selectScript = '';
			let countScript = '';

			selectScript = `
			((params)=>{

				const FieldDBType = ${JSON.stringify(FieldDBType)};
				const SQLOperator = ${JSON.stringify(SQLOperator)};
				const FieldBizType = ${JSON.stringify(FieldBizType)};
				const spliceWhereSQLFragmentByConditions = ${spliceWhereSQLFragmentByConditions.toString()};
				const getValueByOperatorAndFieldType = ${getValueByOperatorAndFieldType.toString()};
				const getValueByFieldType = ${getValueByFieldType.toString()};
				const spliceSelectSQLByConditions = ${spliceSelectSQLByConditions.toString()};
				
				let sql = spliceSelectSQLByConditions({
					params: params || {},
					conditions: ${JSON.stringify(conditions)} || [],
					entities: ${JSON.stringify(entities)},
					limit: ${JSON.stringify(limit)},
					orders: ${JSON.stringify(orders)},
					pageIndex: ${JSON.stringify(pageIndex)},
				});

				console.error("aaaaa", sql)

				return sql;
			})({name: "zhangshan"})
			`;

			if (this.showPager) {
				countScript = `
				(params)=>{

					const FieldDBType = ${JSON.stringify(FieldDBType)};
					const SQLOperator = ${JSON.stringify(SQLOperator)};
					const FieldBizType = ${JSON.stringify(FieldBizType)};
					const spliceWhereSQLFragmentByConditions = ${spliceWhereSQLFragmentByConditions.toString()};
					const getValueByOperatorAndFieldType = ${getValueByOperatorAndFieldType.toString()};
					const getValueByFieldType = ${getValueByFieldType.toString()};
					const spliceSelectCountSQLByConditions = ${spliceSelectCountSQLByConditions.toString()};
					
					let sql = spliceSelectCountSQLByConditions({
						params: params || {},
						conditions: ${JSON.stringify(conditions)} || [],
						entities: ${JSON.stringify(entities)},
					});
	
					return sql;
				}
				`;
			}

			if (!this.showPager) {
				this.nowValue.script = selectScript;
				
				console.log('SELECT SQL: ', selectScript);
			} else {
				this.nowValue.script = {
					list: selectScript,
					total: countScript
				};
				
				console.log('SELECT SQL: ', {
					list: selectScript,
					total: countScript
				});
			}
		} else {
			this.nowValue.script = void 0;
		}

		this.nowValue.desc = desc;
		this.value.set(this.nowValue);

		this.close();
	}

	setEntity(entity: AnyType) {
		this.nowValue.entities.forEach(en => {
			en.selected = false;
			en.fieldAry.forEach((f) => f.selected = false);
		});
		entity.selected = true;
		entity.fieldAry[0].selected = true;
	}

	setField(entity: T_Entity, fieldId: string) {
		const field = entity.fieldAry.find(f => f.id === fieldId);

		if (field) {
			field.selected = !field.selected;
		}

	}
}