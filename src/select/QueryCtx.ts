import { AnyType } from '../_types';
import { CountFieldId, SQLOrder, SQLWhereJoiner } from '../_constants/field';
import { spliceWhereSQLByConditions } from '../_utils/sql';

export type T_Field = {
  id,
  isPrimaryKey?: boolean;
  name,
  desc
}

export type T_Entity = {
  id,
  name,
  desc,
  fieldAry: T_Field[]
}

export type T_Condition = {
	/** 是否判断数据为空，为空时条件不生效 */
	checkExist?: boolean;
  fieldId: string;
	entityId?: string;
  fieldName: string;
  operator?: string;
  value?: string;
	
	conditions?: T_Condition[];
	whereJoiner?: SQLWhereJoiner;
}

export default class QueryCtx {
	editorEle:HTMLElement;

	paramSchema: Record<string, unknown>;

	domainModel: AnyType;

	value: {
    get, set
  };

	nowValue: {
    desc: string
    sql: string
    entities: T_Entity[],
    conditions: T_Condition,
    limit: number | string;
		pageIndex?: string;
		orders: Array<{ fieldId: string; fieldName: string; order: SQLOrder; entityId: string }>;
  };

	close;

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
		
		entities.forEach((entity) => {
			desc = `${desc ? `${desc};\n` : ''}${entity.name} 的 ${entity.fieldAry.map(field => field.name).join(', ')}`;
		}, []);
		
		this.nowValue.desc = desc;
		this.value.set(this.nowValue);
		
		this.close();
	}

	setEntity(entity: AnyType) {
		// const index = this.nowValue.entities?.findIndex(e => e.id === entity.id);
		//
		// if (index >= 0) {
		// 	this.nowValue.entities.splice(index, 1);
		// } else {
		// 	this.nowValue.entities.push(entity.toJSON());
		// }
		this.nowValue.entities = [entity.toJSON()];
	}

	setField(entity: T_Entity, fieldId: string) {
		const oriEntity = this.domainModel.entityAry.find((e: T_Entity) => e.id === entity.id);
		const nowEntity = this.nowValue.entities.find(e => e.id === entity.id);
		
		if (!nowEntity) {
			return;
		}
		
		// count 判断
		if (fieldId === CountFieldId) {
			const field = nowEntity.fieldAry.find(f => f.id === fieldId);
			
			if (field) {
				nowEntity.fieldAry = nowEntity.fieldAry.filter(f => f.id !== fieldId);
			} else {
				nowEntity.fieldAry = [{ id: CountFieldId, name: '查询总数', desc: 'COUNT(*)' }];
			}
		} else {
			const field = nowEntity.fieldAry.find(f => f.id === fieldId);
			/** 求总数跟其他字段互斥 */
			nowEntity.fieldAry = nowEntity.fieldAry.filter(f => f.id !== CountFieldId);
			
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
}