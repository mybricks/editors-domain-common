import { DomainViewModel } from '../typing';

export type T_Field = {
	id,
	isPrimaryKey,
	name,
	desc
}

export type T_Entity = {
	id,
	name,
	desc,
	fieldAry: T_Field[]
}

export default class InsertCtx {
	domainModel: DomainViewModel;

	value: {
		get, set
	};

	paramSchema: {
		type,
		properties
	};

	nowValue: {
		desc: string
		script: string
		entities: T_Entity[],
		conAry: { from: string, to: string }[]
	};

	close;

	blurAry = [];


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
		// console.warn("save", JSON.parse(JSON.stringify(this.nowValue)));
		const { entities } = this.nowValue;
		let desc = '';

		if (entities.length && entities[0].fieldAry.length > 0) {
			desc = `${entities[0].name}`;
		}

		this.nowValue.desc = desc;
		this.value.set(this.nowValue);

		this.close();
	}

	setEntity(entityId: string) {
		const entity = this.domainModel.entityAry.find((e: T_Entity) => e.id === entityId);
		const ent = entity.toJSON();
		this.nowValue.entities = [ent];
	}
}