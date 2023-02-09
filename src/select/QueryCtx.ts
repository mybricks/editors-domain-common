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
}

export type T_Entity = {
	id: string;
	name: string;
	desc?: string;
	isRelationEntity?: boolean;
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

	showPager!: Boolean;

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
		const { entities, conditions, originEntities, orders, limit } = this.nowValue;
		let desc = '';

		entities.filter(entity => entity.fieldAry.length).forEach((entity) => {
			desc = `${desc ? `${desc};\n` : ''}${entity.name} 的 ${entity.fieldAry.map(field => field.name).join(', ')}`;
		}, []);

		if (entities?.length && entities[0].fieldAry.length > 0) {

			let selectScript = "";
			let countScript = "";

			selectScript = `
			(params)=>{

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
					originEntities: ${JSON.stringify(originEntities)},
				});

				return sql;
			}
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
						orders: ${JSON.stringify(orders)},
						originEntities: ${JSON.stringify(originEntities)},
					});
	
					return sql;
				}
				`;
			}

			if (!this.showPager) {
				this.nowValue.script = selectScript;
			} else {
				this.nowValue.script = {
					list: selectScript,
					total: countScript
				};
			}
		} else {
			this.nowValue.script = void 0;
		}

		this.nowValue.desc = desc;
		this.value.set(this.nowValue);

		this.close();
	}

	setEntity(entity: AnyType) {
		const entities = [];
		entities.push(entity.toJSON());

		this.nowValue.entities = entities;
	}

	setField(entity: T_Entity, fieldId: string) {
		const oriEntity = this.domainModel.entityAry.find((e: T_Entity) => e.id === entity.id);
		const nowEntity = this.nowValue.entities.find(e => e.id === entity.id);

		if (!nowEntity) {
			return;
		}

		const field = nowEntity.fieldAry.find(f => f.id === fieldId);

		if (field) {
			nowEntity.fieldAry = nowEntity.fieldAry.filter(f => f.id !== fieldId);
		} else {
			nowEntity.fieldAry = oriEntity.fieldAry
				.map((oriF: T_Field) => {
					let field = nowEntity.fieldAry.find(f => f.id === oriF.id);

					if (field) {//exits
						return field;
					} else if (oriF.id === fieldId) {
						return (oriF as AnyType).toJSON() as T_Field;
					}
				})
				.filter(Boolean);
		}

	}
}