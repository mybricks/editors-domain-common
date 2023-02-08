import { AnyType } from '../_types';
import { FieldBizType, SQLOrder, SQLWhereJoiner } from '../_constants/field';
import { Entity, Field } from '../_types/domain';

export type T_Field = {
  id: string;
  isPrimaryKey?: boolean;
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
	editorEle!:HTMLElement;

	paramSchema!: Record<string, unknown>;

	domainModel: AnyType;

	value!: {
    get(): AnyType;
		set(value: AnyType): void;
  };

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
		const { entities } = this.nowValue;
		let desc = '';
		
		entities.filter(entity => entity.fieldAry.length).forEach((entity) => {
			desc = `${desc ? `${desc};\n` : ''}${entity.name} 的 ${entity.fieldAry.map(field => field.name).join(', ')}`;
		}, []);
		
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