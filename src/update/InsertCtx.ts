import { DomainViewModel } from '../types';
import { spliceUpdateSQLByConditions } from "../_utils/sql";
import { getParamsByConditions } from "../_utils/params";

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
		const { conAry, entities, conditions } = this.nowValue;
		let desc = '';

		if (entities?.length && entities[0].fieldAry.length > 0) {
			desc = `${entities[0].name}`;

			let params = getParamsByConditions(conditions.conditions);
			const sql = spliceUpdateSQLByConditions({
				params,
				conditions: conditions,
				connectors: conAry,
				entities: entities,
			})

			console.error(sql);
			
			let script = `
			(params)=>{ 
				return \`${sql}\`;
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

	setEntity(entityId) {
		const entity = this.domainModel.entityAry.find(e => e.id === entityId);
		const ent = entity.toJSON();
		this.nowValue.entities = [ent];
	}
}