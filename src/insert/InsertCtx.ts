import { getQuoteByFieldType } from "../_utils/field";
import { DefaultValueWhenCreate, FieldBizType } from "../_constants/field";
import { safeEncodeURIComponent } from "../_utils/util";
import { AnyType } from "../_types";
import { generateValidateScript } from "../_utils/validate";
import { Entity } from "../_types/domain";

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
						/** 多级结构 */
						const fromPropName = con.from.substring(con.from.indexOf("/") + 1);
						const q = getQuoteByFieldType(field.dbType);
						valueAry.push(`\${(params.${fromPropName} === undefined || params.${fromPropName} === null) ? null : \`${q}\${params.${fromPropName}}${q}\`}`);
					} else {
						if (field.isPrimaryKey) {
							valueAry.push("${genUniqueId()}");
						} else if (field.name === "_STATUS_DELETED") {
							valueAry.push("0");
						} else if (
							["_UPDATE_TIME", "_CREATE_TIME"].includes(field.name)
							|| (field.bizType === FieldBizType.DATETIME && field.defaultValueWhenCreate === DefaultValueWhenCreate.CURRENT_TIME)
						) {
							valueAry.push("${Date.now()}");
						} else if (field.defaultValueWhenCreate !== undefined && field.defaultValueWhenCreate !== null) {
							const q = getQuoteByFieldType(field.dbType);
							
							valueAry.push(`${q}${field.defaultValueWhenCreate}${q}`);
						} else {
							valueAry.push("null");
						}
					}
				}
			});
			
			let script: string;
			if (this.batch) {
				script = `
		      (values, context)=>{
		        const { genUniqueId } = context;
		        for (let i = 0; i < values.length; i++) {
		          const params = values[i];
		          ${generateValidateScript(entities[0] as Entity, conAry)}
		        }
		        return \`${sql}(${fieldAry.join(",")}) VALUES \${values.map(params => \`(${valueAry.join(",")})\`).join(', ')}\`;
		      }
		      `;
			} else {
				script = `
		      (params, context)=>{
		        const { genUniqueId } = context;
		        ${generateValidateScript(entities[0] as Entity, conAry)}
		        return \`${sql}(${fieldAry.join(",")}) VALUES (${valueAry.join(",")})\`;
		      }
		      `;
			}
			
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
