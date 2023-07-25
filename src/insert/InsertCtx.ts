import { FieldBizType } from '../_constants/field';
import { AnyType } from '../_types';

export type T_Field = {
  id,
  isPrimaryKey,
  name,
  desc
	dbType: string;
	bizType: FieldBizType;
	isPrivate: boolean;
	defaultValueWhenCreate?: string;
	enumValues?: string[];
}

export type T_Entity = {
	id,
	name,
	desc,
	fieldAry: T_Field[];
	selected: boolean;
}

export default class InsertCtx {
	domainModel: AnyType;

	value!: {
		get, set
	};

	paramSchema!: {
		type,
		properties
	};

	nowValue!: {
    desc: string
    script?: string
		entities: T_Entity[],
		conAry: { from: string, to: string }[]
	};

	close;

	blurAry: AnyType[] = [];
	batch?: boolean;


	//------------------------------------------------------------

	addBlur(fn) {
		this.blurAry.push(fn);
	}

	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());
		}
	}

	save() {
		const { entities } = this.nowValue;
		let desc = '';

		if (entities.length && entities[0].fieldAry.length > 0) {
			desc = `${entities[0].name}`;
		}
		
		this.nowValue.script = void 0;
		this.nowValue.desc = desc;
		this.value.set(this.nowValue);

		this.close();
	}

	setEntity(entityId: string) {
		const entity = this.domainModel.entityAry.find(e => e.id === entityId);
		
		if (entity) {
			this.nowValue.entities = [{ ...entity.toJSON(), selected: true }];
			this.nowValue.conAry = [];
		}
	}
}
