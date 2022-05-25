import { dbapi } from '@nfjs/back';
import { common, config } from '@nfjs/core';
import { DboTable } from '@nfjs/dbo-compare';

// взято из postgresql9.6 select string_agg(''''||word||'''',',') from pg_get_keywords() where catcode = 'R'
// eslint-disable-next-line max-len
const restrictedIdents = ['all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric', 'both', 'case', 'cast', 'check', 'collate', 'column', 'constraint', 'create', 'current_catalog', 'current_date', 'current_role', 'current_time', 'current_timestamp', 'current_user', 'default', 'deferrable', 'desc', 'distinct', 'do', 'else', 'end', 'except', 'false', 'fetch', 'for', 'foreign', 'from', 'grant', 'group', 'having', 'in', 'initially', 'intersect', 'into', 'lateral', 'leading', 'limit', 'localtime', 'localtimestamp', 'not', 'null', 'offset', 'on', 'only', 'or', 'order', 'placing', 'primary', 'references', 'returning', 'select', 'session_user', 'some', 'symmetric', 'table', 'then', 'to', 'trailing', 'true', 'union', 'unique', 'user', 'using', 'variadic', 'when', 'where', 'window', 'with'];

/**
 * Получение настроек работы основной формы
 * @param {RequestContext} context контекст выполнения запроса к веб-серверу
 * @returns {Promise<Object>}
 */
async function getOptions(context) {
    const res = {};
    // данные из текущей бд
    const dbRes = await dbapi.query(
        'select (select k.schema_name from information_schema.schemata k where k.schema_name = \'nfd\') as "useNfd"',
        {},
        { context }
    );
    const db = dbRes?.data?.[0] ?? {};
    // настройки из конфига
    const cfg = config?.['@nfjs/db-editor'] ?? {};
    Object.assign(res, { grantAllFunction: 'nfc.f_db8grant_all' }, cfg, db);
    return res;
}

/**
 * Выполнение выдачи прав
 * @param {RequestContext} context - сессионные даные пользователя
 * @param {Object} args - параметры выполнения
 * @param {string} args.grantAllFunction - имя функции бд для выдачи прав на объекты
 * @returns {Promise<void>}
 */
async function executeGrant(context, args) {
    const { grantAllFunction } = args;
    if (grantAllFunction) {
        await dbapi.func(grantAllFunction, {}, { context });
    }
}

/**
 * Получение скрипта удаления объекта
 * @param {RequestContext} context контекст выполнения запроса к веб-серверу
 * @param {Object} args параметры выполнения
 * @param {string} args.objType тип удаляемого объекта
 * @param {string} args.objIdentity полное имя
 * @param {string} args.provider имя провайдера данных, в котором удаляется
 * @returns {Promise<void>}
 */
async function drop(context, args) {
    const { objType, objIdentity, provider = 'default' } = args;
    const s = (objType === 'trigger') ?
        `drop ${objType} if exists "${objIdentity.split('.')[2]}" on "${objIdentity.split('.')[0]}"."${objIdentity.split('.')[1]}";` :
        `drop ${objType} if exists ${objIdentity}`;
    await dbapi.query(s, {}, { context, provider });
}

const types = {
    int2: 'integer',
    int4: 'integer',
    int8: 'integer',
    numeric: 'number',
    float4: 'number',
    float8: 'number',
    bool: 'boolean',
    date: 'date',
    timestamp: 'date-time',
    timestamptz: 'date-time'
};

/**
 * Получение объекта для описания в нотации openapi по объекту таблицы
 * @param {RequestContext} context контекст выполнения запроса к веб-серверу
 * @param {Object} args параметры выполнения
 * @param {TableDboType} args.tabl описатель таблицы
 * @returns {Object}
 */
async function getOpenapiObjByTable(context, args) {
    const { tabl } = args;
    const res = {
        type: 'object',
        description: tabl.comment,
        properties: {}
    };
    tabl.cols.forEach((col) => {
        if (['id', 'pid', 'org', 'grp'].indexOf(col.name) === -1) {
            const clm = {
                description: col.comment
            };
            if (col.fk_tablename) clm.description += `. Справочник ${col.fk_tablename}`;
            clm.type = (col.datatype in types) ? types[col.datatype] : 'string';
            if (clm.type === 'date' || clm.type === 'date-time') {
                clm.format = clm.type;
                clm.type = 'string';
            }
            if (!col.required) clm.nullable = true;
            res.properties[col.name] = clm;
        }
    });
    res.required = tabl.cols.filter(c => (['id', 'pid', 'org', 'grp'].indexOf(c.name) === -1)).map(col => col.name);
    return res;
}

/**
 * Формирование текста представления по описателю таблицы
 * @param {TableDboType} table описатель таблицы
 * @param {Array<RefColDboType>} refCols колонки-внешние ключи с подысканными уникальными ключами таблиц, на которые они ссылаются
 * @returns {string}
 */
function createView(table, refCols) {
    if (refCols && Array.isArray(refCols) && refCols.length > 0) {
        refCols.forEach((refCol) => {
            const col = table.cols.find(column => column.name === refCol.columns);
            if (col) {
                col.unique_cols = refCol.unique_cols;
                col.alias = `ref_${refCol.columns}`;
                col.r_schema = refCol.r_schema;
                col.r_tablename = refCol.r_tablename;
                col.r_columnname = refCol.r_columnname;
            }
        });
    }
    let script = `create or replace view ${table.schema}.v4${table.tablename} as select `;
    script += table.cols
        .map(col => `main.${col.name}${(col.unique_cols) ? `,\r\n${col.unique_cols.map(uc => `${col.alias}.${uc} as ${col.name}_${uc}`).join(',\r\n')}` : ''}`)
        .join(',\r\n');
    script += `\r\n  from ${table.schema}.${table.tablename} as main\r\n`;
    script += table.cols
        .filter(f => f.r_tablename)
        // eslint-disable-next-line max-len
        .map(ref => `${(ref.required) ? ' ' : ' left '}join ${ref.r_schema}.${ref.r_tablename} as ${ref.alias} on ${ref.alias}.${ref.r_columnname} = main.${ref.name}`)
        .join('\r\n');
    return script;
}

/**
 * Генерация кода стандартного представления по имени таблицы
 * @param {RequestContext} context контекст выполнения запроса к веб-серверу
 * @param {Object} args параметры выполнения
 * @param {string} args.schema схема таблицы, на основе которой генерация представления
 * @param {string} args.name имя таблицы
 * @param {boolean} [args.joinWithoutUniq] признак - соединять с таблицами, в которых нет уникального ключа для определения
 * выводимого значения к полю - внешнему ключу
 * @param {string} [args.provider] имя провайдера данных
 * @returns {Promise<ViewDboType>}
 */
async function genViewByTable(context, args) {
    const { provider = 'default', schema, name, joinWithoutUniq = false } = args;
    let connect;
    try {
        connect = await dbapi.getConnect(context, { provider });
        const tbl = await DboTable.get(connect._connect, { schema, name });
        if (!tbl) throw new Error(`Таблица ${schema}.${name} не найдена в базе данных.`);
        const refCons = tbl.cons.filter((con) => (con.type === 'f' && ['pid', 'org', 'grp'].indexOf(con.columns) === -1));
        let refCols;
        if (refCons.length > 0) {
            refCols = await DboTable.getRefColsByCons(connect._connect, refCons);
            if (!joinWithoutUniq) refCols = refCols.filter((f) => f.unique_cols !== null);
        }
        const s = createView(tbl, refCols);
        const mtch = s.match(/^create or replace view (\S+)\.(\S+) as ([\s\S]+)$/m);
        return { schema: mtch[1], name: mtch[2], body: mtch[3], description: '' };
    } finally {
        if (connect) connect.release();
    }
}

export {
    restrictedIdents,
    getOptions,
    executeGrant,
    drop,
    getOpenapiObjByTable,
    createView,
    genViewByTable
};
