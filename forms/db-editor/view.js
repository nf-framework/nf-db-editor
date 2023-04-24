import { html } from "polylib";
import { PlForm } from "@nfjs/front-pl/components/pl-form.js";

export default class DbEditorView extends PlForm {
    static get properties() {
        return {
            formTitle: { type: String, value: 'Представление' },
            view: { type: Object, value: () => ({}) },
            gen: { type: Object, value: () => ({ joinWithoutUniq: false, base: false }) },
            invalid: { value: false },
            hasChanges: { value: false },
            schemas: { type: Array, value: () => [] },
            tabl: { type: Array, value: () => [] },
            obj_name: {},
            obj_schema: {},
            action: {},
            obj: {}
        }
    }

    static get template() {
        return html`
            <pl-flex-layout vertical fit>
                <pl-flex-layout>
                    <pl-button label="Выполнить" variant="primary" disabled="[[disableExec(hasChanges,invalid)]]" on-click="[[exec]]"></pl-button>
                    <pl-button label="Просмотр" on-click="[[showCode]]"></pl-button>
                    <pl-button label="Сгенерировать по таблице" on-click="[[showGen]]"></pl-button>
                </pl-flex-layout>
                <pl-flex-layout vertical fit>
                    <pl-combobox label="Схема" value="{{view.schema}}" orientation="horizontal" data="[[schemas]]" value-property="code" text-property="code" required></pl-combobox>
                    <pl-input label="Наименование" value="{{view.name}}" orientation="horizontal" required></pl-input>
                    <pl-input label="Описание" value="{{view.description}}" orientation="horizontal"></pl-input>
                    <pl-codeeditor value="{{view.body}}" mode="ace/mode/sql"></pl-codeeditor>
                    <pl-valid-observer invalid="{{invalid}}"></pl-valid-observer>
                </pl-flex-layout>    
            </pl-flex-layout>
            <pl-dropdown id="ddGen">
                <pl-flex-layout vertical>
                    <pl-combobox label="Схема" value="{{gen.schema}}" data="[[schemas]]" value-property="code" text-property="code" required></pl-combobox>
                    <pl-combobox label="Таблица" value="{{gen.name}}" data="[[tabl]]" value-property="code" text-property="code" required></pl-combobox>
                    <pl-checkbox label="Соединять таблицы без уникальных ключей" checked="{{gen.joinWithoutUniq}}"></pl-checkbox>
                    <pl-checkbox label="Базовая (только поля таблицы)" checked="{{gen.base}}"></pl-checkbox>
                    <pl-button label="Выполнить" on-click="[[genByTable]]"></pl-button>
                </pl-flex-layout>
            </pl-dropdown>
            <pl-data-observer id="doView" data="{{view}}" is-changed="{{hasChanges}}"></pl-data-observer>
            <pl-action id="aGetDefinition" endpoint="/@nfjs/db-editor/dbo-compare/view/get"></pl-action>
            <pl-action id="aDiff" endpoint="/@nfjs/db-editor/dbo-compare/view/diff"></pl-action>
            <pl-action id="aDiffExec" endpoint="/@nfjs/db-editor/dbo-compare/view/diffexec"></pl-action>
            <pl-dataset id="dsSchemas" data="{{schemas}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.object-schemas"></pl-dataset>
            <pl-dataset id="dsTabl" data="{{tabl}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.tables-in-schema" args="[[_compose('schema',gen.schema)]]" required-args="schema" execute-on-args-change></pl-dataset>
            <pl-action id="aGenScript" endpoint="/@nfjs/db-editor/genViewByTable"></pl-action>
		`;
    }

    async onConnect() {
        if ((this.action ?? 'add') !== 'add') {
            const view = await this.$.aGetDefinition.execute({name: this.obj_name, schema: this.obj_schema});
            if (this.action === 'copy') {
                view.name = view.name + '_copy';
                view.$action = 'add';
                this.$.doView.snapshot();
                this.viewOld = Object.assign({}, this.view);
                Object.keys(view).forEach((k) => {
                    this.set(`view.${k}`, view[k]);
                })
            } else {
                view.$action = 'upd';
                this.view = view;
                this.observerWork();
                this.viewOld = Object.assign({},this.view);
            }
        } else {
            const defaultView = {
                name: null,
                schema: this.obj_schema ?? null,
                description: null,
                body: null,
                $action: 'add'
            };
            this.viewOld = Object.assign({},this.view);
            this.$.doView.snapshot();
            const view = {...defaultView, ...(this.obj || {})};
            Object.keys(view).forEach((k) => {
                this.set(`view.${k}`, view[k]);
            });
            if (this.obj?.tablename) {
                this.set('gen.schema', this.obj.schema);
                this.set('gen.name', this.obj.tablename);
                await this.genByTable();
                if (this.obj?.bodyWhere) {
                    if (this.view.body.match(/\bwhere\b/)) {
                        this.set('view.body', this.view.body + '\n and' + this.obj.bodyWhere);
                    } else {
                        this.set('view.body', this.view.body + '\n where' + this.obj.bodyWhere);
                    }
                }
            }
        }
        if (!this.schemas || this.schemas.length === 0) this.$.dsSchemas.execute();
    }

    observerWork() {
        this.$.doView.reset();
        this.$.doView.snapshot();
    }

    async showCode() {
        const { script } = await this.$.aDiff.execute({
            newObj: this.view,
            oldObj: this.viewOld
        });
        this.openModal(
            'db-editor.show-code',
            { scr: script },
        )
    }

    async exec() {
        await this.$.aDiffExec.execute({
            newObj: this.view,
            oldObj: this.viewOld
        });
        this.set('view.$action','upd');
        this.observerWork();
        this.viewOld = Object.assign({},this.view);
    }

    disableExec(hasChanges, invalid) {
        return !hasChanges || invalid;
    }

    showGen(event) {
        if (this.view.schema) this.set('gen.schema', this.view.schema);
        this.$.ddGen.open(event.target);
    }

    async genByTable() {
        const genScript = await this.$.aGenScript.execute(this.gen);
        if (genScript) {
            this.set('view.schema', genScript.schema);
            this.set('view.name', genScript.name);
            this.set('view.body', genScript.body);
        }
        this.$.ddGen.close();
    }
}

