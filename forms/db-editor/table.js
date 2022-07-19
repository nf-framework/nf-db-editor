import { html, css } from "polylib";
import { PlForm } from "@nfjs/front-pl/components/pl-form.js";
import { cloneDeep, clearObj } from "@nfjs/core/api/common";

export default class DbEditorTable extends PlForm {
    static get properties() {
        return {
            formTitle: { type: String, value: 'Таблица' },
            tabl: {
                type: Object,
                value: () => ({
                    comment:null,
                    schema:null,
                    tablename:null,
                    cols:[],
                    cons:[],
                    indx:[]
                }),
                observer: '_changeTabl'
            },
            consTypes: {
                type: Array,
                value: () => [
                    { value:'c', text:'check' },
                    { value:'f', text:'foreign' },
                    { value:'u', text:'unique' },
                    { value:'p', text:'primary' },
                    { value:'x', text:'exclude' }
                ]
            },
            consUpdDelActions: {
                type: Array,
                value: () => [
                    { value:'a', text:'no action' },
                    { value:'c', text:'cascade' },
                    { value:'r', text:'restrict' },
                    { value:'n', text:'set null' },
                    { value:'d', text:'set default' }
                ]
            },
            colIdentityType: {
                type: Array,
                value: () => [
                    { value:'a', text:'always' },
                    { value:'d', text:'by default' }
                ]
            },
            consDefferables: {
                type: Array,
                value: () => [
                    { value: 'deferred', text: 'На конец транзакции' },
                    { value: 'immediate', text: 'На конец оператора' }
                ]
            },
            addColSamples: {
                type: Array,
                value: () => [
                    { value: 'id' },
                    { value: 'code' },
                    { value: 'caption' },
                    { value: 'pid' },
                    { value: 'hid' },
                    { value: 'note' },
                    { value: 'created_on' },
                    { value: 'updated_on' },
                    { value: 'deleted_on' },
                    { value: 'date begin/end range' },
                ]
            },
            addColSample: {},
            curCons: {
                type: Object,
                value: () => ({
                    ix_columns: []
                }),
                observer: '_changeCurCons'
            },
            config: {
                type: Object,
                value: () => ({})
            },
            invalid: { value: false },
            dataReady: { type: Boolean, value: false },
            hasChanges: { value: false },
            schemas: { type: Array, value: () => [] },
            datatypes: { type: Array, value: () => [] },
            tables: { type: Array, value: () => [] },
            indexMethods: { type: Array, value: () => [] },
            operators: { type: Array, value: () => [] },
            restrictedIdents: { type: Array, value: () => [] },
        }
    }

    static get css() {
        return css`
            .label {
                text-align: center;
            }
            
            .w32px {
                width: 32px;
            }
    
            .w1 {
                flex: 1;
            }
            
            .cols {
                height: 300px;
                width: 100%;
            }
            
            .consCode {
                height: 300px;
                width: 300px;
            }
        `
    }

    static get template() {
        return html`
            <pl-flex-layout fit vertical>
                <pl-flex-layout>
                    <pl-button label="Выполнить" variant="primary" disabled="[[disableExec(hasChanges,invalid)]]" on-click="[[exec]]"></pl-button>
                    <pl-button label="Просмотр" on-click="[[showCode]]"></pl-button>
                </pl-flex-layout>
                <pl-flex-layout fit vertical scrollable>
                    <pl-card header="Основное">
                        <pl-flex-layout vertical>
                            <pl-combobox label="Схема" value="{{tabl.schema}}" orientation="horizontal" data="[[schemas]]" text-property="code" value-property="code" required></pl-combobox>
                            <pl-input label="Наименование" value="{{tabl.tablename}}" orientation="horizontal" pattern="[[config.tableIdentifierPattern]]" required>
                                <pl-validator-restricted-values data="[[restrictedIdents]]"></pl-validator-restricted-values>
                            </pl-input>
                            <pl-input label="Описание" value="{{tabl.comment}}" orientation="horizontal"></pl-input>
                        </pl-flex-layout>
                    </pl-card>
                    <pl-card header="Колонки" fit>
                        <pl-grid data="{{tabl.cols}}" class="cols">
                            <pl-grid-column width="100" fixed>
                                <template>
                                    <style>
                                        pl-flex-layout {
                                            gap: 0px;
                                        }
                                    </style>
                                    <pl-flex-layout>
                                        <pl-icon-button iconset="pl-default" icon="copy" on-click="[[copyColumn]]" variant="link"></pl-icon-button>
                                        <pl-icon-button iconset="pl-default" icon="trashcan" on-click="[[delColumn]]" variant="link"></pl-icon-button>
                                        <pl-icon-button iconset="pl-default" icon="menu" on-click="[[showColumnMenu]]" variant="link"></pl-icon-button>
                                    </pl-flex-layout>
                                </template>
                            </pl-grid-column>
                            <pl-grid-column header="Наименование" field="name">
                                <template>
                                    <pl-input value="{{row.name}}" pattern="[[config.columnIdentifierPattern]]" required stretch>
                                        <pl-validator-restricted-values data="[[restrictedIdents]]"></pl-validator-restricted-values>                                        
                                    </pl-input>
                                </template>
                            </pl-grid-column>
                            <pl-grid-column header="Тип" width="160">
                                <template>
                                    <pl-combobox value="{{row.datatype}}" data="[[datatypes]]" text-property="code" value-property="code" required allow-custom-value stretch></pl-combobox>
                                </template>
                            </pl-grid-column>
                            <pl-grid-column header="Разм." width="80">
                                <template>
                                    <pl-input value="{{row.datatype_length}}" stretch></pl-input>
                                </template>
                            </pl-grid-column>
                            <pl-grid-column header="Обяз." width="50">
                                <template>
                                    <pl-flex-layout justify="center" stretch>
                                        <pl-checkbox orientation="horizontal" checked="{{row.required}}"></pl-checkbox>
                                    </pl-flex-layout>
                                </template>
                            </pl-grid-column>
                            <pl-grid-column header="Описание">
                                <template>
                                    <pl-input value="{{row.comment}}" stretch></pl-input>
                                </template>
                            </pl-grid-column>
                            <pl-grid-column header="По умолчанию">
                                <template>
                                    <pl-input value="{{row.default_value}}" stretch></pl-input>
                                </template>
                            </pl-grid-column>
                            <pl-grid-column header="Внешний ключ">
                                <template>
                                    <pl-combobox value="{{row.fk_tablename}}" data="[[tables]]" value-property="fullname" text-property="fullname" stretch></pl-combobox>
                                </template>
                            </pl-grid-column>
                            <pl-grid-column header="Идентификация">
                                <template>
                                    <pl-combobox value="{{row.identity}}" data="[[colIdentityType]]" stretch></pl-combobox>
                                </template>
                            </pl-grid-column>
                        </pl-grid>
                        <pl-flex-layout slot="header-suffix">
                            <pl-icon-button iconset="pl-default" icon="plus-s" on-click="[[addColumn]]" variant="ghost"></pl-icon-button>
                            <pl-combobox value="{{addColSample}}" data="[[addColSamples]]" text-property="value"></pl-combobox>
                        </pl-flex-layout>
                    </pl-card>
                    <pl-card header="Ограничения" fit>
                        <pl-flex-layout vertical>
                            <template d:repeat="{{tabl.cons}}" d:as="cons">
                                <pl-flex-layout align="center">
                                    <pl-icon-button iconset="pl-default" icon="pencil" on-click="[[updConstraint]]" variant="ghost"></pl-icon-button>
                                    <pl-icon-button iconset="pl-default" icon="copy" on-click="[[copyConstraint]]" variant="ghost"></pl-icon-button>
                                    <pl-icon-button iconset="pl-default" icon="trashcan" on-click="[[delConstraint]]" variant="ghost"></pl-icon-button>
                                    <span>[[consLabel(cons)]]</span>
                                </pl-flex-layout>
                            </template>
                        </pl-flex-layout>
                        <pl-icon-button iconset="pl-default" icon="plus-s"  on-click="[[addConstraint]]" slot="header-suffix" variant="ghost"></pl-icon-button>
                    </pl-card>
                    <pl-card header="Индексы" style="width: 100%;">
                        <pl-flex-layout vertical fit>
                            <pl-flex-layout fit>
                                <div class="label w32px"></div>
                                <div class="label w1">Имя</div>
                                <div class="label w32px">Уник.</div>
                                <div class="label w32px"></div>
                                <div class="label w1">Колонки</div>
                                <div class="label w1">Условие</div>
                            </pl-flex-layout>
                            <template d:repeat="{{tabl.indx}}" d:as="indx">
                                <pl-flex-layout stretch>
                                    <pl-icon-button iconset="pl-default" icon="trashcan" on-click="[[delIndex]]" class="w32px" variant="ghost"></pl-icon-button>
                                    <pl-input value="{{indx.name}}" pattern="[[config.indexIdentifierPattern]]" required stretch class="w1"></pl-input>
                                    <pl-checkbox orientation="horizontal" checked="{{indx.is_unique}}" class="w32px"></pl-checkbox>
                                    <pl-icon-button iconset="pl-default" icon="plus" on-click="[[addIndexColumn]]" class="w32px" variant="ghost"></pl-icon-button>
                                    <pl-flex-layout vertical class="w1">
                                        <template d:repeat="{{indx.columns}}" d:as="indxCol">
                                            <pl-flex-layout>
                                                <pl-combobox value="{{indxCol.name}}" data="[[tabl.cols]]" text-property="name" value-property="name" allow-custom-value stretch></pl-combobox>
                                                <pl-icon-button iconset="pl-default" icon="trashcan" on-click="[[delIndexColumn]]" variant="ghost"></pl-icon-button>
                                            </pl-flex-layout>
                                        </template>
                                    </pl-flex-layout>
                                    <pl-input value="{{indx.where_expr}}" stretch class="w1"></pl-input>
                                </pl-flex-layout>
                            </template>
                        </pl-flex-layout>
                        <pl-icon-button iconset="pl-default" icon="plus-s" on-click="[[addIndex]]" slot="header-suffix" variant="ghost"></pl-icon-button>
                    </pl-card>
                </pl-flex-layout>
                <pl-valid-observer invalid="{{invalid}}"></pl-valid-observer>
            </pl-flex-layout>
            <pl-dropdown id="ddCons">
                <pl-flex-layout vertical stretch>
                    <pl-flex-layout vertical>
                        <pl-input label="Наименование" value="{{curCons.name}}" pattern="[[config.constraintIdentifierPattern]]" orientation="horizontal"></pl-input>
                        <pl-combobox label="Тип" value="{{curCons.type}}" data="[[consTypes]]" orientation="horizontal"></pl-combobox>
                        <pl-input label="Описание" value="{{curCons.comment}}" orientation="horizontal"></pl-input>
                    </pl-flex-layout>
                    <pl-flex-layout hidden="[[!consUseDefer(curCons.type)]]">
                        <pl-combobox label="Отложенная проверка консистентности" value="{{curCons.deferrable}}" data="[[consDefferables]]" orientation="horizontal"></pl-combobox>
                    </pl-flex-layout>
                    <pl-flex-layout hidden="[[!consIsPrimary(curCons.type)]]">
                        <pl-combobox label="Колонка" value="{{curCons.columns}}" data="[[tabl.cols]]" text-property="name" value-property="name" orientation="horizontal"></pl-combobox>
                    </pl-flex-layout>
                    <pl-flex-layout hidden="[[!consIsUnique(curCons.type)]]">
                        <pl-combobox label="Колонки" value="{{curCons.columns}}" data="[[tabl.cols]]" text-property="name" value-property="name" orientation="horizontal"></pl-combobox>
                    </pl-flex-layout>
                    <pl-flex-layout hidden="[[!consIsForeign(curCons.type)]]" vertical>
                        <pl-combobox label="Колонка" value="{{curCons.columns}}" data="[[tabl.cols]]" text-property="name" value-property="name" orientation="horizontal"></pl-combobox>
                        <pl-flex-layout>
                            <pl-input value="{{curCons.r_schema}}" label="Схема таблицы"></pl-input>
                            <pl-input value="{{curCons.r_tablename}}" label="Имя таблицы"></pl-input>
                            <pl-input value="{{curCons.r_columnname}}" label="Колонка - первичный ключ"></pl-input>
                        </pl-flex-layout>
                        <pl-flex-layout>
                            <pl-combobox label="Действие при удалении родительской записи" value="{{curCons.delete_rule}}" data="[[consUpdDelActions]]" stretch></pl-combobox>
                            <pl-combobox label="Действие при исправлении поля в родительской таблице" value="{{curCons.update_rule}}" data="[[consUpdDelActions]]" stretch></pl-combobox>
                        </pl-flex-layout>
                    </pl-flex-layout>
                    <pl-flex-layout hidden="[[!consIsConstraint(curCons.type)]]">
                        <pl-codeeditor value="{{curCons.condition}}" class="consCode" mode="ace/mode/sql"></pl-codeeditor>
                    </pl-flex-layout>
                    <pl-flex-layout hidden="[[!consIsExclude(curCons.type)]]" vertical>
                        <pl-combobox value="{{curCons.ix_method}}" label="Метод индекса" value-property="code" text-property="code" data="[[indexMethods]]" orientation="horizontal" required></pl-combobox>
                            <pl-flex-layout fit>
                                <div class="w32px"></div>
                                <div class="w1">Колонка</div>
                                <div class="w1">Оператор</div>
                            </pl-flex-layout>
                            <template d:repeat="{{curCons.ix_columns}}" d:as="ix_col">
                                <pl-flex-layout fit>
                                    <pl-icon-button iconset="pl-default" icon="trashcan" on-click="[[delConsColumn]]" class="w32px"></pl-icon-button>
                                    <pl-combobox value="{{ix_col.name}}" data="[[tabl.cols]]" value-property="name" text-property="name" class="w1" ></pl-combobox>
                                    <pl-combobox value="{{ix_col.op}}" data="[[operators]]" value-property="code" text-property="code" class="w1"></pl-combobox>
                                </pl-flex-layout>
                            </template>
                            <pl-button label="+ Колонка" on-click="[[addConsColumn]]" size="small"></pl-button>
                            <pl-input value="{{curCons.ix_where_expr}}" label="Условие для частичного ограничения" orientation="horizontal"></pl-input>
                    </pl-flex-layout>                    
                </pl-flex-layout>
            </pl-dropdown>
            <pl-dropdown-menu id="ddMenuCols">
                <pl-dropdown-menu-item label="Копировать в буфер" on-click="[[copyColumnToClipboard]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Вставить из буфера" on-click="[[pasteColumnFromClipboard]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Индекс" on-click="[[addColumnIndex]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Ограничение" on-click="[[addColumnConstraint]]"></pl-dropdown-menu-item>
            </pl-dropdown-menu>
            <pl-data-observer id="doTabl" data="{{tabl}}" is-changed="{{hasChanges}}"></pl-data-observer>
            <pl-action id="aGetDefinition" endpoint="/@nfjs/db-editor/dbo-compare/table/get"></pl-action>
            <pl-action id="aDiff" endpoint="/@nfjs/db-editor/dbo-compare/table/diff"></pl-action>
            <pl-action id="aDiffExec" endpoint="/@nfjs/db-editor/dbo-compare/table/diffexec"></pl-action>
            <pl-action id="aGetRestrictedIdents" data="{{restrictedIdents}}" endpoint="/@nfjs/db-editor/restrictedIdents" method="GET"></pl-action>
            <pl-action id="aGetConfig" data="{{config}}" endpoint="/@nfjs/db-editor/config-ui" method="GET"></pl-action>
            <pl-dataset id="dsSchemas" data="{{schemas}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.object-schemas"></pl-dataset>
            <pl-dataset id="dsDataTypes" data="{{datatypes}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.datatypes"></pl-dataset>
            <pl-dataset id="dsTables" data="{{tables}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.tables-with-primary-key"></pl-dataset>
            <pl-dataset id="dsIndexMethods" data="{{indexMethods}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.index-methods"></pl-dataset>
            <pl-dataset id="dsOperators" data="{{operators}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.operators"></pl-dataset>
		`;
    }

    async onConnect(){
        if (!this.schemas || this.schemas.length === 0) await this.$.dsSchemas.execute();
        this.defaultColumn = {
            name: null,
            datatype: null,
            required: false,
            default_value: null,
            comment: null,
            datatype_length: null,
            fk_tablename: null,
            identity: null
        };
        this.defaultIndex = {
            name: null,
            is_unique: false,
            columns: [],
        };
        this.defaultConstraint = {
            name: null,
            comment: null,
            type: null
        };
        const { obj_name: name, obj_schema: schema, action = 'add' } = this;
        let _tabl; // изначальная версия таблицы
        if (action !== 'add') {
            const tabl = await this.$.aGetDefinition.execute({name,schema});
            tabl.cols = tabl.cols || [];
            tabl.indx = tabl.indx || [];
            tabl.cons = tabl.cons || [];
            if (action === 'copy') {
                tabl.tablename = tabl.tablename + '_copy';
                this.$.doTabl.snapshot();
                _tabl = cloneDeep(this.tabl);
                Object.keys(tabl).forEach((k) => {
                    this.set(`tabl.${k}`, tabl[k]);
                });
            } else {
                this.tabl = tabl;
                this.$.doTabl.reset();
                this.$.doTabl.snapshot();
                _tabl = cloneDeep(this.tabl);
            }
            this.dataReady = true;
        } else {
            _tabl = cloneDeep(this.tabl);
            this.$.doTabl.snapshot();
            if (name) this.set('tabl.tablename', name);
            if (schema) this.set('tabl.schema', schema);
            if (this.obj) {
                Object.keys(this.obj).forEach((k) => {
                    this.set(`tabl.${k}`, this.obj[k]);
                });
            }
            this.dataReady = true;
        }
        clearObj(_tabl);
        this.tablOld = _tabl;
        this.$.aGetRestrictedIdents.execute();
        this.$.aGetConfig.execute();
        this.$.dsDataTypes.execute();
        this.$.dsTables.execute();
        this.$.dsIndexMethods.execute();
        this.$.dsOperators.execute();
    }

    observerWork() {
        this.$.doTabl.reset();
        this.$.doTabl.snapshot();
    }

    async showCode() {
        const _tabl = cloneDeep(this.tabl);
        clearObj(_tabl);
        const { script } = await this.$.aDiff.execute({
            newObj: _tabl,
            oldObj: this.tablOld
        });
        this.openModal(
            'db-editor.show-code',
            { scr: script },
        )
    }

    async exec() {
        const _tabl = cloneDeep(this.tabl);
        clearObj(_tabl);
        await this.$.aDiffExec.execute({
            newObj: _tabl,
            oldObj: this.tablOld
        });
        this.set('tabl.$action','upd');
        this.observerWork();
        this.tablOld = _tabl;
    }

    disableExec(hasChanges, invalid) {
        return !hasChanges || invalid;
    }

    _toggleColumn(column, onoff) {
        if (!column && !column.name) return;
        const colsIndex = this.tabl.cols.findIndex(col => col.name === column.name);
        if (onoff) {
            if (colsIndex === -1)
                this.push('tabl.cols', Object.assign({}, this.defaultColumn, column));
        } else {
            if (colsIndex > -1)
                this.splice('tabl.cols', colsIndex, 1);
        }
    }

    _toggleIndex(index, onoff) {
        if (!index && !index.name) return;
        const indxIndex = this.tabl.indx.findIndex(ind => ind.name === index.name);
        if (onoff) {
            if (indxIndex === -1)
                this.push('tabl.indx', Object.assign({}, this.defaultIndex, index));
        } else {
            if (indxIndex > -1)
                this.splice('tabl.indx', indxIndex, 1);
        }
    }

    _toggleConstraint(constraint, onoff) {
        if (!constraint && !constraint.name) return;
        const consIndex =  this.tabl.cons.findIndex(con => con.name === constraint.name);
        if (onoff) {
            if (consIndex === -1)
                this.push('tabl.cons', Object.assign({}, this.defaultConstraint, constraint));
        } else {
            if (consIndex > -1)
                this.splice('tabl.cons', consIndex, 1);
        }
    }

    _toggleRefColumn(columnName, onoff, opt) {
        if (!columnName) return;
        let {cols,indx,cons} = this.tabl;
        const colsIndex = cols.findIndex(col => col.name === columnName);
        const indxName = this.getObjName('i',columnName);
        const indxIndex = indx.findIndex(indx => indx.name === indxName);
        const consName = this.getObjName('fk',columnName);
        const consIndex = cons.findIndex(cons => cons.name === consName);
        if (onoff) {
            const { refFullName = null, comment = null } = opt;
            if (colsIndex === -1)
                this.push('tabl.cols', {
                    name: columnName,
                    datatype: 'int8',
                    required: true,
                    comment: comment
                });
            if (indxIndex === -1)
                this.push('tabl.indx', {
                    name: indxName,
                    columns: [{name: columnName}]
                });
            if (refFullName && consIndex === -1) {
                const refTable = this.tables.find(i => i.fullname === refFullName);
                if (refTable) {
                    const cons = {
                        name: consName,
                        type: 'f',
                        columns: columnName,
                        r_schema: refTable.schemaname,
                        r_tablename: refTable.tablename,
                        r_columnname: refTable.pk
                    };
                    this.push('tabl.cons', cons);
                    if (refTable.pk_type !== this.tabl.cols[colsIndex].datatype) {
                        this.set(`tabl.cols.${colsIndex}.datatype`, refTable.pk_type);
                    }
                }
            }
        } else {
            const { keepColumn = false } = opt;
            if (colsIndex > -1 && !keepColumn) this.splice('tabl.cols', colsIndex, 1);
            if (indxIndex > -1) this.splice('tabl.indx', indxIndex, 1);
            if (consIndex > -1) this.splice('tabl.cons', consIndex, 1);
        }
    }

    getObjName(prefix='',postfix='',addSchema=false) {
        const {tablename, schema} = this.tabl;
        return `${(addSchema)?schema+'.':''}${(prefix)?prefix+'4':''}${tablename}${(postfix)?'8'+postfix:''}`;
    }

    getFixes(name) {
        const prefix = name.substring(0,name.indexOf('4'));
        let postfix = name.lastIndexOf('8');
        postfix = (postfix === -1)?'':name.substring(postfix+1);
        return {
            prefix,
            postfix
        }
    }

    addColumn(event) {
        switch (this.addColSample) {
            case 'id':
                this.addColumnId();
                break;
            case 'code':
                this.addColumnCode();
                break;
            case 'caption':
                this.addColumnCaption();
                break;
            case 'pid':
                this.addColumnPid();
                break;
            case 'hid':
                this.addColumnHid();
                break;
            case 'note':
                this.addColumnNote();
                break;
            case 'created_on':
                this.addColumnCreatedOn();
                break;
            case 'updated_on':
                this.addColumnUpdatedOn();
                break;
            case 'deleted_on':
                this.addColumnDeletedOn();
                break;
            case 'date begin/end range':
                this.addColumnDates();
                break;
            default:
                this.push('tabl.cols', Object.assign({}, this.defaultColumn));
        }

    }

    addColumnCode() {
        const col = {
            name: "code",
            datatype: "text",
            required: true,
            comment: "Код"
        };
        this._toggleColumn(col,true);
        const conUk = {
            name: this.getObjName('uk',col.name),
            type: 'u',
            columns: col.name
        };
        this._toggleConstraint(conUk,true);
        const con = {
            name: this.getObjName('ch',col.name),
            type: 'c',
            condition: `${col.name} = trim(${col.name})`
        };
        this._toggleConstraint(con,true);
    }
    addColumnCaption() {
        const col = {
            name: "caption",
            datatype: "text",
            required: true,
            comment: "Наименование"
        };
        this._toggleColumn(col,true);
        const conUk = {
            name: this.getObjName('uk',col.name),
            type: 'u',
            columns: col.name
        };
        this._toggleConstraint(conUk,true);
        const con = {
            name: this.getObjName('ch',col.name),
            type: 'c',
            condition: `${col.name} = trim(${col.name})`
        };
        this._toggleConstraint(con,true);
    }
    addColumnNote() {
        const col = {
            name: "note",
            datatype: "text",
            datatype_length: null,
            required: false,
            comment: "Примечание"
        };
        this._toggleColumn(col,true);
    }
    addColumnId() {
        const col = {
            name: "id",
            datatype: "int8",
            datatype_length: null,
            required: true,
            comment: "Id"
        };
        const con = {
            name: this.getObjName('pk'),
            type: 'p',
            columns: 'id'
        }
        this._toggleColumn(col,true);
        this._toggleConstraint(con,true);
    }
    addColumnPid() {
        const refUnit = `${this.tabl.schema}.${(this.tabl.tablename).split('_').slice(0,-1).join('_')}`;
        this._toggleRefColumn('pid', true, {refUnit});
    }
    addColumnHid() {
        const refUnit = `${this.tabl.schema}.${(this.tabl.tablename)}`;
        this._toggleRefColumn('hid', true, {refUnit, comment: 'Иерархия'});
    }
    addColumnDates() {
        const colB = {
            name: "date_begin",
            datatype: "date",
            required: true,
            comment: "Дата начала действия записи",
            default_value: "current_date"
        };
        const colE = {
            name: "date_end",
            datatype: "date",
            required: false,
            comment: "Дата окончания действия записи"
        };
        this._toggleColumn(colB,true);
        this._toggleColumn(colE,true);
        const cons = {
            name: this.getObjName('ch','begin_end'),
            type: 'c',
            condition: 'date_begin <= date_end or date_end is null'
        }
        this._toggleConstraint(cons,true);
    }
    addColumnCreatedOn() {
        const col = {
            name: "created_on",
            datatype: "timestamptz",
            required: true,
            comment: "Дата создания записи",
            default_value: "now()"
        };
        this._toggleColumn(col,true);
    }
    addColumnUpdatedOn() {
        const col = {
            name: "updated_on",
            datatype: "timestamptz",
            required: false,
            comment: "Дата обновления записи"
        };
        this._toggleColumn(col,true);
    }
    addColumnDeletedOn() {
        const col = {
            name: "deleted_on",
            datatype: "timestamptz",
            required: false,
            comment: "Дата удаления записи"
        };
        this._toggleColumn(col,true);
    }

    delColumn(event) {
        const idx = this.tabl.cols.findIndex(i => i === event.model.row);
        this.splice('tabl.cols', idx, 1);
    }

    copyColumn(event) {
        this.push('tabl.cols', Object.assign({}, event.model.row));
    }

    copyColumnToClipboard(event) {
        navigator.clipboard.writeText(JSON.stringify(event.model.row));
    }

    async pasteColumnFromClipboard(event) {
        const _column = await navigator.clipboard.readText();
        const column = JSON.parse(_column);
        delete column['__old'];
        this.push('tabl.cols', column);
    }

    addColumnIndex (event){
        const column = event.model.row;
        const name = this.getObjName('i', column.name);
        const ind = {
            name,
            columns: [{name: column.name}]
        };
        this._toggleIndex(ind,true);
    }

    addColumnConstraint (event){
        const column = event.model.row;
        const name = this.getObjName('ch', column.name);
        const con = {
            name,
            type: 'c'
        };
        this._toggleConstraint(con, true);
    }


    consLabel(cons) {
        let res = cons.name + ' | ';
        if (cons && cons.type) {
            if (cons.type === 'p') {
                res += `Primary key:${cons.columns}`;
            } else if (cons.type === 'c') {
                res += 'Check'
            } else if (cons.type === 'f') {
                res += `Foreign key:${cons.columns}->${cons.r_schema}.${cons.r_tablename}`;
            } else if (cons.type === 'u'){
                res += `Unique:${cons.columns}`;
            } else {
                res += `Exclude:${cons.ix_columns.map(ic => `${ic.name} with ${ic.op}`)}`;
            }
        }
        return res;
    }

    consUseDefer (consType){
        return (['f','u','p','e'].indexOf(consType) > -1);
    }

    consUseWhere (consType){
        return (['u','e'].indexOf(consType) > -1);
    }

    restrictedIdent(value) {
        const res = this.restrColNames.indexOf(value) !== -1;
        return res;
    }

    addIndexColumn(event) {
        const indxIdx = this.tabl.indx.findIndex(i => i === event.model.indx);
        this.push(`tabl.indx.${indxIdx}.columns`, { name: 'newColumn' });
    }
    delIndexColumn(event) {
        const indxIdx = this.tabl.indx.findIndex(i => i === event.model.indx);
        const indxColIdx = this.tabl.indx[indxIdx].columns.findIndex(i => i === event.model.indxCol);
        this.splice(`tabl.indx.${indxIdx}.columns`, indxColIdx, 1);
    }

    addIndex(){
        this.push('tabl.indx', { name: this.getObjName('i'), columns:[]});
    }
    delIndex(event) {
        const indxIdx = this.tabl.indx.findIndex(i => i === event.model.indx);
        this.splice('tabl.indx', indxIdx, 1);
    }

    addConstraint() {
        this.push('tabl.cons',{ name: this.getObjName('ch'), type:'c', ix_columns: []});
    }

    updConstraint(event) {
        this.set('curCons', event.model.cons);
        this.$.ddCons.open(event.target);
    }

    delConstraint(event) {
        const idx = this.tabl.cons.findIndex(i => i === event.model.cons);
        this.splice('tabl.cons', idx, 1);
    }

    copyConstraint(event) {
        this.push('tabl.cons', cloneDeep(event.model.cons));
    }

    addConsColumn(event) {
        this.push(`curCons.ix_columns`, { name: 'newColumn' });
    }
    delConsColumn(event) {
        const consColIdx = this.curCons.ix_columns.findIndex(i => i === event.model.ix_col);
        this.splice(`curCons.ix_columns`, consColIdx, 1);
    }

    consIsConstraint(consType){
        return consType === 'c';
    }
    consIsForeign(consType){
        return consType === 'f';
    }
    consIsUnique(consType){
        return consType === 'u';
    }
    consIsPrimary(consType){
        return consType === 'p';
    }
    consIsExclude(consType){
        return consType === 'x';
    }

    async _changeTabl(value, oldValue, mutation){
        if (!this.dataReady) return;
        // поправить имена индексов и ограничений при изменении имени или схемы таблицы
        if (mutation.action === 'upd' && (mutation.path === 'tabl.tablename' || mutation.path === 'tabl.schema')) {
            this.tabl.indx.forEach((item, index) => {
                const {prefix, postfix} = this.getFixes(item.name);
                const objName = this.getObjName(prefix, postfix);
                if (objName) this.set(`tabl.indx.${index}.name`, objName);
            });
            this.tabl.cons.forEach((item, index) => {
                const {prefix, postfix} = this.getFixes(item.name);
                const objName = this.getObjName(prefix, postfix);
                if (objName) this.set(`tabl.cons.${index}.name`, objName);
            });
        }
        // добавить или удалить индекс и ограничение на колонку - внешний ключ
        const [,sub,subIndex,prop] = mutation.path.split('.');
        if (mutation.action === 'upd' && sub === 'cols' && prop === 'fk_tablename'){
            const { name } = this.tabl.cols[subIndex];
            if (!!mutation.value) {
                this._toggleRefColumn(name, true, {refFullName: mutation.value});
            } else {
                this._toggleRefColumn(name, false, {keepColumn: true});
            }
        }
    }

    _changeCurCons(value, oldValue, mutation) {
        if (!this.dataReady) return;
        const idx = this.tabl.cons.indexOf(value);
        this.set(`tabl.cons.${idx}`, value);
    }

    showColumnMenu(event) {
        this.$.ddMenuCols.open(event.target, undefined, { model: event.model });
    }
    /*



    editorConsCompleter(editor, session, pos, prefix) {
        const res = this.tabl.cols.map(col => ({
            caption: col.name,
            value: col.name,
            meta: `column (${col.datatype})`
        }));
        return res;
    }




    */

}