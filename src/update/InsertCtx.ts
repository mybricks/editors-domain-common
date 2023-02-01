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
    entity: T_Entity,
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
		let desc;

		const conAry = this.nowValue.conAry;

		if (nowValue.entity && nowValue.entity.fieldAry.length > 0) {
			desc = `${nowValue.entity.name}`;

			const sql = `INSERT INTO ${nowValue.entity.name} `;

			const fieldAry = [], valueAry = [];
			nowValue.entity.fieldAry.forEach(f => {
				const fieldName = f.name;
				const field = this.getOriField(fieldName);

				if (!field.isPrimaryKey) {
					fieldAry.push(fieldName);

					const con = conAry.find(con => con.to === `/${fieldName}`);
					if (con) {
						const fromPropName = con.from.substring(con.from.indexOf('/') + 1);
						const q = getTypeQuote(field.bizType);
						valueAry.push(`${q}\${params.${fromPropName}}${q}`);
					} else {
						valueAry.push('null');
					}
				}
			});

			const script = `
      (params)=>{
        return \`${sql}(${fieldAry.join(',')}) VALUES (${valueAry.join(',')})\`
      }
      `;
			this.nowValue.script = script;
		} else {
			this.nowValue.script = void 0;
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

	getOriField(fieldName) {
		const oriEntity = this.getOriEntity();
		if (oriEntity) {
			return oriEntity.fieldAry.find(e => e.name === fieldName);
		}
	}

	setEntity(entityId) {
		const entity = this.domainModel.entityAry.find(e => e.id === entityId);
		const ent = entity.toJSON();
		this.nowValue.entity = ent;
	}
}