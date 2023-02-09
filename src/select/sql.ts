/** 根据规则以及实体拼接 select 语句 */
export const spliceSelectSQLByConditions = (fnParams) => {

  /** 字段类型 */
  enum FieldBizType {
    STRING = 'string',
    NUMBER = 'number',
    RELATION = 'relation',
    MAPPING = 'mapping',
  };

  enum FieldDBType {
    VARCHAR = 'varchar',
    BIGINT = 'bigint',
    MEDIUMTEXT = 'mediumtext',
  };

  enum SQLWhereJoiner {
    AND = 'AND',
    OR = 'OR',
  };

  enum SQLOperator {
    EQUAL = '=',
    NOT_EQUAL = '<>',
    LIKE = 'like',
    NOT_LIKE = 'not like',
    IN = 'in',
    NOT_IN = 'not in',
    GE = '>=',
    LE = '<=',
  };

  enum SQLOrder {
    ASC = 'ASC',
    DESC = 'DESC',
  };

  interface Entity {
    id: string;
    name: string;
    desc: string;
    fieldAry: Field[];
    isRelationEntity?: boolean;
  };

  interface Field {
    id: string;
    name: string;
    bizType: FieldBizType;
    dbType: FieldDBType;
    typeLabel: string;
    desc?: string;
    relationEntityId?: string;
    isPrimaryKey?: boolean;
    mapping?: {
      condition: string;
      fieldJoiner: string;
      entity?: Omit<Entity, 'fieldAry'> & { field: Field };
      sql: string;
      desc: string;
    };
  };

  interface Condition {
    fieldId: string;
    entityId: string;
    fieldName: string;
    operator?: string;
    value: string;
    conditions: Condition[];
    whereJoiner: SQLWhereJoiner;
  };

  const getValueByFieldType = (dbType: string, val: string) => {
    switch (dbType) {
    case FieldDBType.VARCHAR: return `'${val}'`;
    case FieldDBType.BIGINT: return val;
    case FieldDBType.MEDIUMTEXT: return `'${val}'`;
    default: return val;
    }
  };

  const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
    if (operator === SQLOperator.LIKE || operator === SQLOperator.NOT_LIKE) {
      return `%${getValueByFieldType(dbType, val)}%`;
    } else if (operator === SQLOperator.IN || operator === SQLOperator.NOT_IN) {
      return `(${val.split(',').map(item => getValueByFieldType(dbType, item)).join(',')})`;
    }
    
    return getValueByFieldType(dbType, val);
  };

  const spliceWhereSQLFragmentByConditions = (fnParams: {
    conditions: Condition[];
    entities: Entity[];
    originEntities: Entity[];
    params: Record<string, unknown>;
    whereJoiner?: SQLWhereJoiner;
  }) => {
    const { conditions, entities, params, whereJoiner, originEntities } = fnParams;
    const curConditions = conditions
      .filter(condition => condition.fieldId)
      .filter(condition => {
        if (condition.conditions) {
          return true;
        } else {
          if (condition.value?.startsWith('{') && condition.value?.endsWith('}')) {
            const curValue = condition.value.substr(1, condition.value.length - 2);

            if (!new RegExp(`^${originEntities.map(e => e.name).join('|')}\\.`).test(curValue)) {
              return params[curValue.substring(curValue.indexOf('.') + 1)] !== undefined;
            }
          } else {
            return condition?.value !== undefined;
          }
        }

        return true;
      });

    let sql = curConditions.length > 1 ? '(' : '';

    curConditions.forEach((condition, index) => {
      if (index > 0) {
        sql += ` ${whereJoiner ?? ''} `;
      }

      if (condition.conditions) {
        sql += spliceWhereSQLFragmentByConditions({
          conditions: condition.conditions,
          entities,
          whereJoiner: condition.whereJoiner,
          params,
          originEntities,
        });
      } else {
        const field = originEntities.find(e => e.id === condition.entityId)?.fieldAry.find(f => f.id === condition.fieldId);

        if (field) {
          let value = condition.value || '';
          let isEntityField = false;
          if (condition.value.startsWith('{') && condition.value.endsWith('}')) {
            const curValue = condition.value.substr(1, condition.value.length - 2);

            if (new RegExp(`^${originEntities.map(e => e.name).join('|')}\\.`).test(curValue)) {
              value = curValue;
              isEntityField = true;
            } else {
              let key = curValue.substring(curValue.indexOf('.') + 1);
              value = `{params.${key}}`;
            }
          }

          sql += `${field.name} ${condition.operator} ${isEntityField ? value : getValueByOperatorAndFieldType(field.dbType, condition.operator!, value)}`;
        }
      }
    });

    sql += curConditions.length > 1 ? ')' : '';
    let prefix = '';

    if (sql && !whereJoiner) {
      prefix = 'WHERE ';
      const entity = entities[0];
      const mappingFields = entity.fieldAry.filter(field => {
        return field.bizType === FieldBizType.MAPPING && field.mapping && originEntities.find(entity => entity.id === field.mapping?.entity?.id);
      });

      mappingFields.forEach(mappingField => {
        const relationField = originEntities.find(e => e.id === mappingField.mapping!.entity!.id)?.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === entity.id);

        if (relationField) {
          prefix += `MAPPING_${mappingField.name}.${relationField.name} = ${entity.name}.id AND `;
        }
      });
    }

    return prefix + sql;
  };


  let { conditions, entities, params, limit, orders, pageIndex, originEntities } = fnParams;

  if (entities.length) {
    const sql: string[] = [];
    const fieldList: string[] = [];
    const entityNames: string[] = [entities[0].name];

    orders = orders.filter(order => order.fieldId);

    /** mapping 字段，存在映射且实体存在 */
    const mappingFields = entities[0].fieldAry.filter(field => {
      return field.bizType === FieldBizType.MAPPING && field.mapping && originEntities.find(entity => entity.id === field.mapping?.entity?.id);
    });

    mappingFields.forEach(mappingField => {
      const entity = mappingField.mapping!.entity!;
      const condition = mappingField.mapping!.condition!;
      const fieldJoiner = mappingField.mapping!.fieldJoiner!;

      const originEntity = originEntities.find(e => e.id === entity.id)!;

      const relationField = originEntity.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === entities[0].id);

      if (!relationField) {
        return;
      }

      const isMaxCondition = condition.startsWith('max(') && condition.endsWith(')');
      let entityName = '';

      if (condition === '-1') {
        entityName = `(SELECT id as MAPPING_${mappingField.name}_id, ${relationField.name}, GROUP_CONCAT(${entity.field.name} SEPARATOR '${fieldJoiner}') ${entity.field.name} FROM ${originEntity.name} GROUP BY ${relationField.name}) AS MAPPING_${mappingField.name}`;
      } else if (isMaxCondition) {
        const filedName = condition.substr(4, condition.length - 5);

        entityName = `(SELECT id as MAPPING_${mappingField.name}_id, ${relationField.name}, ${entity.field.name} FROM ${originEntity.name} WHERE ${filedName} IN (SELECT max(${filedName}) FROM ${originEntity.name} GROUP BY ${relationField.name})) AS MAPPING_${mappingField.name}`;
      }

      entityNames.push(entityName);
    });

    entities.forEach((entity) => {
      fieldList.push(
        ...entity.fieldAry
          .filter(field => field.bizType !== FieldBizType.MAPPING)
          .map(field => `${entity.name}.${field.name}`)
      );
    }, []);
    mappingFields.forEach(field => {
      const entity = field.mapping!.entity!;

      fieldList.push(`MAPPING_${field.name}.${entity.field.name}`);
    });

    sql.push(`SELECT ${fieldList.join(', ')} FROM ${entityNames.join(', ')}`);
    sql.push(spliceWhereSQLFragmentByConditions({
      conditions: [conditions],
      entities,
      params,
      originEntities,
    }));

    if (orders.length) {
      const orderList: string[] = [];
      orders.forEach(order => {
        const mappingField = mappingFields.find(m => m.mapping?.entity?.field.id === order.fieldId);

        if (mappingField) {
          orderList.push(`MAPPING_${mappingField.name}.${mappingField.mapping?.entity?.field.name} ${order.order}`)
        } else {
          const field = entities[0].fieldAry.find(f => f.id === order.fieldId);

          if (field) {
            orderList.push(`${entities[0].name}.${field.name} ${order.order}`);
          }
        }
      });
      orderList.length && sql.push(`ORDER BY ${orderList.join(', ')}`)
    }

    sql.push(`LIMIT ${limit}`);

    if (pageIndex) {
      if (pageIndex.startsWith('{') && pageIndex.endsWith('}')) {
        const curValue = params[pageIndex.slice(pageIndex.indexOf('.') + 1, -1)];

        if (curValue) {
          sql.push(`OFFSET ${(Number(curValue) - 1) * Number(limit)}`);
        }
      } else if (!Number.isNaN(Number(pageIndex))) {
        sql.push(`OFFSET ${(Number(pageIndex) - 1) * Number(limit)}`);
      }
    }

    return sql.join(' ');
  }
};