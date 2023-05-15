import { AnyType } from '../_types';

export type T_Field = {
  id,
  isPrimaryKey,
  name,
  desc,
  dbType
}

export type T_Entity = {
  id,
  name,
  desc,
  fieldAry: T_Field[]
}

export type T_Condition = string

export default class QueryCtx {
	paramSchema!: Record<string, unknown>;

	entityInfo!: {
    [id: string]: {
      type: 'foreigner' | 'primary',
      field: AnyType
    }
  };

	entityAry!: AnyType[];

	domainModel: AnyType;

	isEntityForeigner(id: string) {
		return this.entityInfo[id].type === 'foreigner';
	}

	fieldModel: AnyType;

	value!: {
    get, set
  };

	nowValue!: {
    desc: string
    sql?: string
    entity: T_Entity,
    type: 'foreigner' | 'primary'
    fieldJoiner: string,
    condition: T_Condition
  };

	close;

	blurAry: Array<() => void> = [];

	addBlur(fn: () => void) {
		this.blurAry.push(fn);
	}

	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());

			this.blurAry = [];
		}
	}

	save() {
		const nowValue = this.nowValue;
		const entity = nowValue.entity;
		let desc;

		if (entity && entity.fieldAry) {
			desc = `${nowValue.entity.name} 的 ${entity.fieldAry.map(field => field.name).join(',')}`;
		} else {
			this.nowValue.sql = void 0;
		}
		this.nowValue.desc = desc;

		this.value.set(this.nowValue);

		this.close();
	}

	getOriEntity() {
		const nowEntity = this.nowValue.entity;
		if (nowEntity) {
			return this.domainModel.entityAry.find(e => e.id === nowEntity.id);
		}
	}

	getOriField(fieldId) {
		const oriEntity = this.getOriEntity();
		if (oriEntity) {
			return oriEntity.fieldAry.find(e => e.id === fieldId);
		}
	}

	setEntity(entity) {
		const ent = entity.toJSON();
		ent.field = ent.fieldAry[0];
		delete ent.fieldAry;

		this.nowValue.entity = ent;
		const info = this.entityInfo[ent.id];

		this.nowValue.type = info.type;
	}

	setField(fieldId) {
		const nowEntity = this.nowValue.entity;
		const oriEntity = this.domainModel.entityAry.find(e => e.id === nowEntity.id);

		if (nowEntity.fieldAry === void 0) {
			nowEntity.fieldAry = [];
		}

		if (nowEntity.fieldAry.find(f => f.id === fieldId)) {//exist
			nowEntity.fieldAry = nowEntity.fieldAry.filter(f => f.id !== fieldId);
		} else {
			nowEntity.fieldAry = oriEntity.fieldAry.map(oriF => {
				let field = nowEntity.fieldAry.find(f => f.id === oriF.id);
				if (field) {//exits
					return field;
				} else if (oriF.id === fieldId) {
					return oriEntity.fieldAry.find(f => f.id === fieldId).toJSON() as any;
				}
			}).filter(f => f);
		}
	}
}
