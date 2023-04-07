import { getQuoteByFieldType } from "../_utils/field";
import { DefaultValueWhenCreate, FieldBizType } from "../_constants/field";
import { safeEncodeURIComponent } from "../_utils/util";
import { AnyType } from "../_types";

export type T_Field = {
  id,
  isPrimaryKey,
  name,
  desc
	dbType: string;
	bizType: FieldBizType;
	isPrivate: boolean;
	defaultValueWhenCreate?: string;
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
		let desc = "";

		if (entities.length && entities[0].fieldAry.length > 0) {
			desc = `${entities[0].name}`;
			
			const sql = `INSERT INTO ${entities[0].name} `;
			
			const fieldAry: string[] = [], valueAry: string[] = [];
			entities[0].fieldAry.forEach(field => {
				if (field.bizType !== FieldBizType.MAPPING) {
					fieldAry.push(field.name);
					
					const con = conAry.find(con => con.to === `/${field.name}`);
					if (con) {
						const fromPropName = con.from.substring(con.from.indexOf("/") + 1);
						const q = getQuoteByFieldType(field.dbType);
						valueAry.push(`\${(params.${fromPropName} === undefined || params.${fromPropName} === null) ? null : \`${q}\${params.${fromPropName}}${q}\`}`);
					} else {
						if (field.isPrimaryKey) {
							valueAry.push("${genUniqueId()}");
						} else if (field.name === "_STATUS_DELETED") {
							valueAry.push("0");
						} else if (["_UPDATE_TIME", "_CREATE_TIME"].includes(field.name) || field.defaultValueWhenCreate === DefaultValueWhenCreate.CURRENT_TIME) {
							valueAry.push("${Date.now()}");
						} else {
							valueAry.push("null");
						}
					}
				}
			});
			
			const script = `
      (params, context)=>{
        const { genUniqueId } = context;
        return \`${sql}(${fieldAry.join(",")}) VALUES (${valueAry.join(",")})\`
      }
      `;
			
			this.nowValue.script = safeEncodeURIComponent(script);
		} else {
			this.nowValue.script = void 0;
		}

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