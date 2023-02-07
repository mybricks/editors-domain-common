import { DomainViewModel } from '../types';

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

const getTypeQuote = (type) => {
	switch (type) {
	case 'string': {
		return '\'';
	}
	case 'number': {
		return '';
	}
	}
};

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
		const nowValue = this.nowValue;
		let desc = '';

		if (nowValue.entities?.length && nowValue.entities[0].fieldAry.length > 0) {
			desc = `${nowValue.entities[0].name}`;
		}

		this.nowValue.desc = desc;
		this.value.set(this.nowValue);

		this.close();
	}

	getOriEntity() {
		const nowEntity = this.nowValue.entities[0];
		if (nowEntity) {
			return this.domainModel.entityAry.find(e => e.id === nowEntity.id);
		}
	}

	getOriField(fieldName) {
		const oriEntity = this.getOriEntity();
		if (oriEntity) {
			return oriEntity.fieldAry.find(e => e.name === fieldName);
		}
	}

	setEntity(entityId) {
		const entity = this.domainModel.entityAry.find(e => e.id === entityId);
		const ent = entity.toJSON();
		this.nowValue.entities = [ent];
	}
}