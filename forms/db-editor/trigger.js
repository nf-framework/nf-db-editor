import { html, css } from "polylib";
import { PlForm } from "@nfjs/front-pl/components/pl-form.js";

export default class DbEditorTriger extends PlForm {
    static get properties() {
        return {
            formTitle: { type: String, value: 'Триггер' },
            trig: { type: Object, value: () => ({}) },
            fncNameByTable: { type: Boolean, value: false },
            constr: {
                type: Array,
                value: () => ([
                    {id:'n',caption:'Нет'},
                    {id:'y',caption:'Да. Неоткладываемый.'},
                    {id:'ydi',caption:'Да. Откладываемый. Изначально сразу.'},
                    {id:'ydd',caption:'Да. Откладываемый. Изначально на конец транзакции.'}
                ])
            },
            invalid: { value: false },
            hasChanges: { value: false },
            schemas: { type: Array, value: () => [] },
            tabl: { type: Array, value: () => [] },
            fnc: { type: Array, value: () => [] }
        }
    }

    static get css() {
        return css` 
            pl-icon {
                cursor: pointer;
            }
        `
    }

    static get template() {
        return html`
            <pl-flex-layout vertical fit>
                <pl-flex-layout>
                    <pl-button label="Выполнить" variant="primary" dgisabled="[[disableExec(hasChanges,invalid)]]" on-click="[[exec]]"></pl-button>
                    <pl-button label="Просмотр" on-click="[[showCode]]"></pl-button>
                </pl-flex-layout>
                <pl-flex-layout vertical>
                    <pl-flex-layout>
                        <pl-flex-layout vertical>
                            <pl-input label="Наименование" value="{{trig.name}}" orientation="horizontal" required>
                                <pl-icon slot="suffix" iconset="pl-default" icon="reload" on-click="[[genName]]"></pl-icon>
                            </pl-input>
                            <pl-combobox label="Схема таблицы" value="{{trig.schema}}" orientation="horizontal" required value-property="code" text-property="code" data="[[schemas]]"></pl-combobox>
                            <pl-combobox label="Наименование таблицы" value="{{trig.tablename}}" orientation="horizontal" required data="[[tabl]]" value-property="code" text-property="code"></pl-combobox>
                            <pl-input label="Описание" value="{{trig.description}}" orientation="horizontal"></pl-input>
                            <pl-radio-group label="Момент срабатывания" selected="{{trig.act_timing}}" orientation="horizontal" required>
                                <pl-radio-button name="before" label="До"></pl-radio-button>
                                <pl-radio-button name="after" label="После"></pl-radio-button>
                                <pl-radio-button name="instead of" label="Вместо"></pl-radio-button>
                            </pl-radio-group>
                            <pl-radio-group label="Объем срабатывания" selected="{{trig.act_scope}}" orientation="horizontal" required>
                                <pl-radio-button name="row" label="Построчно"></pl-radio-button>
                                <pl-radio-button name="statement" label="Оператор"></pl-radio-button>
                            </pl-radio-group>
                            <pl-combobox label="Триггер - ограничение" value="{{trig.constr}}" data="[[constr]]" orientation="horizontal" value-property="id" text-property="caption" required></pl-combobox>
                        </pl-flex-layout>
                        <pl-card header="События" border>
                            <pl-checkbox caption="Добавление" checked="{{trig.on_insert}}"></pl-checkbox>
                            <pl-checkbox caption="Исправление" checked="{{trig.on_update}}"></pl-checkbox>
                            <pl-checkbox caption="Удаление" checked="{{trig.on_delete}}"></pl-checkbox>
                            <pl-checkbox caption="truncate" checked="{{trig.on_truncate}}"></pl-checkbox>
                        </pl-card>
                    </pl-flex-layout>
                    <pl-card header="Выполняемая функция" border>
                        <pl-flex-layout vertical>
                            <pl-combobox label="Схема" value="{{trig.function_schema}}" orientation="horizontal" required value-property="code" text-property="code" data="[[schemas]]"></pl-combobox>
                            <pl-combobox label="Наименование" value="{{trig.function_name}}" orientation="horizontal" required data="[[fnc]]" value-property="code" text-property="code"></pl-combobox>
                        </pl-flex-layout>
                        <pl-checkbox caption="Ограничить по имени таблицы" checked="{{fncNameByTable}}" slot="header-suffix"></pl-checkbox>
                    </pl-card>
                    <pl-valid-observer invalid="{{invalid}}"></pl-valid-observer>
                </pl-flex-layout>
            </pl-flex-layout>
            <pl-data-observer id="doTrig" data="{{trig}}" is-changed="{{hasChanges}}"></pl-data-observer>
            <pl-action id="aGetDefinition" endpoint="/@nfjs/db-editor/dbo-compare/trigger/get"></pl-action>
            <pl-action id="aDiff" endpoint="/@nfjs/db-editor/dbo-compare/trigger/diff"></pl-action>
            <pl-action id="aDiffExec" endpoint="/@nfjs/db-editor/dbo-compare/trigger/diffexec"></pl-action>
            <pl-dataset id="dsSchemas" data="{{schemas}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.object-schemas"></pl-dataset>
            <pl-dataset id="dsTabl" data="{{tabl}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.tables-in-schema" args="[[_compose('schema',trig.schema)]]" required-args="schema" execute-on-args-change></pl-dataset>
            <pl-dataset id="dsFnc" data="{{fnc}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.suitable-functions-for-trigger" args="[[_compose('schema;by_table;tablename',trig.function_schema,fncNameByTable,trig.tablename)]]" required-args="schema" execute-on-args-change></pl-dataset>
		`;
    }

    async onConnect() {
        if ((this.action ?? 'add') !== 'add') {
            const [,tablename,] = this.obj_fullname.split('.');
            const trig = await this.$.aGetDefinition.execute({name: this.obj_name,schema: this.obj_schema, tablename});
            if (this.action === 'copy') {
                trig.name = trig.name + '_copy';
                trig.$action = 'add';
                this.$.doTrig.snapshot();
                this.trigOld = Object.assign({},this.trig);
                Object.keys(trig).forEach((k) => {
                    this.set(`trig.${k}`, trig[k]);
                })
            } else {
                trig.$action = 'upd';
                this.trig = trig;
                this.observerWork();
                this.trigOld = Object.assign({},this.trig);
            }
        } else {
            const defaultTrig = {
                schema: this.obj_schema,
                constr: 'n',
                act_scope: 'row',
                act_timing: 'before',
                on_insert: false,
                on_update: false,
                on_delete: false,
                on_truncate: false,
            }
            this.trigOld = Object.assign({},this.trig);
            this.$.doTrig.snapshot();
            const trig = {...defaultTrig, ...(this.obj || {})};
            Object.keys(trig).forEach((k) => {
                this.set(`trig.${k}`, trig[k]);
            });
        }
        if (!this.schemas || this.schemas.length === 0) this.$.dsSchemas.execute();
    }

    observerWork() {
        this.$.doTrig.reset();
        this.$.doTrig.snapshot();
    }

    async showCode() {
        const { script } = await this.$.aDiff.execute({
            newObj: this.trig,
            oldObj: this.trigOld
        });
        this.openModal(
            'db-editor.show-code',
            { scr: script },
        )
    }

    async exec() {
        await this.$.aDiffExec.execute({
            newObj: this.trig,
            oldObj: this.trigOld
        });
        this.set('trig.$action','upd');
        this.observerWork();
        this.trigOld = Object.assign({},this.trig);
    }

    disableExec(hasChanges, invalid) {
        return !hasChanges || invalid;
    }

    genName() {
        this.set('trig.name',`tr4${this.trig.tablename}8${this.trig.act_timing}`);
    }
}