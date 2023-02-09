import {DomainViewModel} from '../typing';
import {getQuoteByFieldType} from '../_utils/field';
import {FieldBizType} from '../_constants/field';

export type T_Field = {
  id,
  isPrimaryKey,
  name,
  desc
	dbType: string;
	bizType: FieldBizType;
	isPrivate: boolean;
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
    script?: string
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
		const { entities, conAry } = this.nowValue;
		let desc = '';

		if (entities.length && entities[0].fieldAry.length > 0) {
			desc = `${entities[0].name}`;
			
			const sql = `INSERT INTO ${entities[0].name} `;
			
			const fieldAry: string[] = [], valueAry: string[] = [];
			entities[0].fieldAry.forEach(field => {
				if (!field.isPrimaryKey && field.bizType !== FieldBizType.MAPPING) {
					fieldAry.push(field.name);
					
					const con = conAry.find(con => con.to === `/${field.name}`);
					if (con) {
						const fromPropName = con.from.substring(con.from.indexOf('/') + 1);
						const q = getQuoteByFieldType(field.dbType);
						valueAry.push(`\${params.${fromPropName} === undefined ? null : \`${q}\${params.${fromPropName}}${q}\`}`);
					} else {
						if (field.name === '_status_deleted') {
							valueAry.push('0');
						} else if (field.bizType === FieldBizType.DATETIME) {
							valueAry.push('${Date.now()}');
						} else {
							valueAry.push('null');
						}
					}
				}
			});
			
			const script = `
      (params)=>{
        return \`${sql}(${fieldAry.join(',')}) VALUES (${valueAry.join(',')})\`
      }
      `;
			console.log('script', script);
			this.nowValue.script = script;
		} else {
			this.nowValue.script = void 0;
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