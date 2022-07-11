import { html, css } from "polylib";
import { PlForm } from "@nfjs/front-pl/components/pl-form.js";
import { cloneDeep, clearObj } from "@nfjs/core/api/common";

export default class DbEditorFunction extends PlForm {
    static get properties() {
        return {
            formTitle: { type: String, value: 'Функция' },
            fnc: { type: Object, value: () => ({ resTypeTable: [], args: [] }) },
            resultKinds: {
                type: Array,
                value: () =>[
                    {value:'single', text:'Одно значение'},
                    {value:'set', text:'Набор'},
                    {value:'void', text:'Ничего'},
                    {value:'table', text:'Таблица'},
                    {value:'trigger', text:'Триггер'},
                ]
            },
            optimizationTypes: {
                type: Array,
                value: () => [
                    {value:'volatile', text:'Нет (VOLATILE)'},
                    {value:'stable', text:'На уровне оператора (STABLE)'},
                    {value:'immutable', text:'На уровне транзакции (IMMUTABLE)'},
                ]
            },
            parallelTypes: {
                type: Array,
                value: () => [
                    {value:'unsafe', text:'Небезопасная (UNSAFE)'},
                    {value:'restricted', text:'Ограниченная (RESTRICTED)'},
                    {value:'safe', text:'Безопасная (SAFE)'},
                ]
            },
            paramModes: {
                type: Array,
                value: () => [
                    {value:'in', text:'in'},
                    {value:'out', text:'out'},
                    {value:'inout', text:'in/out'},
                    {value:'variadic', text:'variadic'},
                ]
            },
            invalid: { value: false },
            hasChanges: { value: false },
            schemas: { type: Array, value: () => [] },
            dataTypes: { type: Array, value: () => [] },
            langs: { type: Array, value: () => [] },
            editor: { type: Object, value: () => ({}) }
        }
    }

    static get css() {
        return css`
            .code {
                height: 400px;
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
                    <pl-card header="Определение">
                        <pl-flex-layout>
                            <pl-flex-layout vertical>
                                <pl-combobox label="Схема" value="{{fnc.schema}}" orientation="horizontal" placeholder="Выберите из списка" text-property="code" data="[[schemas]]" value-property="code" required stretch></pl-combobox>
                                <pl-input label="Наименование" value="{{fnc.name}}" orientation="horizontal" placeholder="Английские строчные буквы, цифры, знак подчеркивания" pattern="[a-z0-9_]" required stretch></pl-input>
                                <pl-input label="Комментарий" value="{{fnc.description}}" orientation="horizontal" stretch></pl-input>
                            </pl-flex-layout>
                            <pl-flex-layout vertical>
                                <pl-combobox label="Язык" value="{{fnc.lang}}" orientation="horizontal" placeholder="Выберите из списка" value-property="code" text-property="code" data="[[langs]]" required></pl-combobox>
                                <pl-flex-layout>
                                    <pl-combobox label="Вид результата" value="{{fnc.resKind}}" orientation="horizontal" placeholder="Выберите из списка" data="[[resultKinds]]" text-property="text" value-property="value" required></pl-combobox>
                                    <pl-button label="+ Колонка" variant="ghost" size="medium" hidden="[[!resTypeIf(fnc.resKind,'table')]]" on-click="[[addResTableCol]]"></pl-button>
                                </pl-flex-layout>
                                <pl-flex-layout hidden="[[!resTypeIf(fnc.resKind,'combo')]]">
                                    <pl-combobox label="Тип результата" value="{{fnc.resType}}" orientation="horizontal" placeholder="Выберите из списка" value-property="code" text-property="code" data="[[dataTypes]]" allow-custom-value></pl-combobox>
                                    <span>[</span>
                                    <pl-checkbox checked="{{fnc.resTypeIsArray}}"></pl-checkbox>
                                    <span>]</span>
                                <pl-flex-layout>
                                <pl-flex-layout hidden="[[!resTypeIf(fnc.resKind,'table')]]" vertical>
                                    <pl-repeat items="{{fnc.resTypeTable}}" as="col">
                                        <template>
                                            <pl-flex-layout>
                                                <pl-input placeholder="имя" value="{{col.name}}"></pl-input>
                                                <pl-combobox placeholder="тип данных" value="{{col.type}}" data="[[dataTypes]]" value-property="code" text-property="code" allow-custom-value></pl-combobox>
                                                <span>[</span>
                                                <pl-checkbox checked="{{col.typeIsArray}}"></pl-checkbox>
                                                <span>]</span>
                                                <pl-icon-button iconset="pl-default" on-click="[[delResTypeTable]]" icon="close-s"></pl-icon-button>
                                            </pl-flex-layout>
                                        </template>
                                    </pl-repeat>
                                </pl-flex-layout>
                            </pl-flex-layout>
                        </pl-flex-layout>        
                    </pl-card>
                    <pl-card header="Настройки">
                        <pl-flex-layout>
                            <pl-flex-layout vertical>
                                <pl-combobox label="Запоминание результатов при использовании функции в запросе" value="{{fnc.volatile}}" orientation="horizontal" data="[[optimizationTypes]]" text-property="text" value-property="value"></pl-combobox>
                                <pl-combobox label="Пометки параллельности для функций" value="{{fnc.parallel}}" orientation="horizontal" data="[[parallelTypes]]" text-property="text" value-property="value"></pl-combobox>
                                <pl-input label="Ожидаемая стоимость выполнения" value="{{fnc.cost}}" type="number" orientation="horizontal"></pl-input>
                                <pl-input label="Ожидаемое количество возвращаемых строк" value="{{fnc.rows}}" type="number" orientation="horizontal"></pl-input>
                            </pl-flex-layout>
                            <pl-flex-layout vertical>
                                <pl-checkbox label="Вернуть null при любом входном параметре null" checked="{{fnc.strict}}" orientation="horizontal" ></pl-checkbox>
                                <pl-checkbox label="Выполнять от имени создателя" checked="{{fnc.secdef}}" orientation="horizontal"></pl-checkbox>
                                <pl-checkbox label="Оконная функция" checked="{{fnc.window}}" hidden="true" orientation="horizontal"></pl-checkbox>
                                <pl-checkbox label="Функция защищенная от утечки памяти" checked="{{fnc.leakproof}}" orientation="horizontal"></pl-checkbox>
                            </pl-flex-layout>
                        </pl-flex-layout>
                    </pl-card>
                    <pl-card header="Аргументы">
                        <pl-flex-layout vertical>
                            <pl-repeat items="{{fnc.args}}" as="item">
                                <template>
                                    <pl-flex-layout align-items="start">
                                        <pl-input value="{{item.name}}" placeholder="Имя" required></pl-input>
                                        <pl-combobox value="{{item.type}}" value-property="code" text-property="code" data="[[dataTypes]]" placeholder="Тип" required allow-custom-value></pl-combobox>
                                        <span>[</span>
                                        <pl-checkbox checked="{{item.typeIsArray}}"></pl-checkbox>
                                        <span>]</span>
                                        <pl-combobox value="{{item.mode}}" data="[[paramModes]]" placeholder="Режим" required text-property="text" value-property="value"></pl-combobox>
                                        <pl-input value="{{item.default}}" placeholder="Значение по-умолчанию"></pl-input>
                                        <pl-icon-button iconset="pl-default" icon="close-s" on-click="[[delArg]]"></pl-icon-button>
                                    </pl-flex-layout>
                                </template>
                            </pl-repeat>
                        </pl-flex-layout>
                        <pl-icon-button iconset="pl-default" slot="header-suffix" icon="plus-s" variant="ghost" on-click="[[addArg]]"></pl-icon-button>
                    </pl-card>  
                    <pl-card header="Код" fit>
                        <pl-codeeditor value="{{fnc.body}}" editor="{{editor}}" class="code" mode="ace/mode/sql"></pl-codeeditor>
                    </pl-card>
                </pl-flex-layout>    
                <pl-valid-observer invalid="{{invalid}}"></pl-valid-observer>
            </pl-flex-layout>
            <pl-data-observer id="doFnc" data="{{fnc}}" is-changed="{{hasChanges}}"></pl-data-observer>
            <pl-action id="aGetDefinition" endpoint="/@nfjs/db-editor/dbo-compare/function/get"></pl-action>
            <pl-action id="aDiff" endpoint="/@nfjs/db-editor/dbo-compare/function/diff"></pl-action>
            <pl-action id="aDiffExec" endpoint="/@nfjs/db-editor/dbo-compare/function/diffexec"></pl-action>
            <pl-dataset id="dsCheckExists" endpoint="/@nfjs/back/endpoint-sql/db-editor.function-exists"></pl-dataset>
            <pl-dataset id="dsSchemas" data="{{schemas}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.object-schemas"></pl-dataset>
            <pl-dataset id="dsDatatypes" data="{{dataTypes}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.datatypes"></pl-dataset>
            <pl-dataset id="dsLangs" data="{{langs}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.code-languages"></pl-dataset>
		`;
    }

    async onConnect() {
        this.defaultArg = {
            name: null,
            type: null,
            typeIsArray: false,
            mode: 'in',
            default: null
        };
        this.defaultResTableCol = {
            name: null,
            type: null,
            typeIsArray: false
        };
        this.$.dsDatatypes.execute();
        this.$.dsLangs.execute();
        let _fnc;
        if ((this.action ?? 'add') !== 'add') {
            const res = await this.$.aGetDefinition.execute({name: this.obj_name, schema: this.obj_schema});
            const fnc = Object.assign({},res);
            if (this.action === 'copy') {
                fnc.name = fnc.name + '_copy';
                fnc.$action = 'add';
                this.$.doFnc.snapshot();
                _fnc = cloneDeep(this.fnc);
                Object.keys(fnc).forEach((k) => {
                    this.set(`fnc.${k}`, fnc[k]);
                })
            } else {
                fnc.$action = 'upd';
                this.fnc = fnc;
                this.observerWork();
                _fnc = cloneDeep(this.fnc);
            }
        } else {
            const defaultFnc = {
                schema: this.obj_schema,
                args: [],
                lang: 'plpgsql',
                resKind: 'void',
                resType: null,
                resTypeIsArray: false,
                resTypeTable: [],
                volatile: 'volatile',
                parallel: 'unsafe',
                cost: 0,
                rows: 0,
                leakproof: false,
                secdef: true,
                strict: false,
                body: '',
                $action: 'add'
            }
            _fnc = cloneDeep(this.fnc);
            this.$.doFnc.snapshot();
            const fnc = {...defaultFnc, ...(this.obj || {})};
            Object.keys(fnc).forEach((k) => {
                this.set(`fnc.${k}`, fnc[k]);
            });
        }
        clearObj(_fnc);
        this.fncOld = _fnc;
        if (!this.schemas || this.schemas.length === 0) this.$.dsSchemas.execute();
    }

    observerWork() {
        this.$.doFnc.reset();
        this.$.doFnc.snapshot();
    }

    async showCode() {
        const { script } = await this.$.aDiff.execute({
            newObj: this.fnc,
            oldObj: this.fncOld
        });
        this.openModal(
            'db-editor.show-code',
            { scr: script },
        )
    }

    async exec (event){
        // проверить при создании новой функции что еще нет такой в бд и запросить подтверждение
        if (this.fnc.$action === 'add') {
            const resCheck = await this.$.dsCheckExists.execute({
                schema: this.fnc.schema,
                name: this.fnc.name
            });
            if (resCheck && resCheck[0].exist) {
                const confirmRes = await this.showConfirm(
                    `В базе данных уже присутствует функция ${this.fnc.schema}.${this.fnc.name}. Продолжить создание новой?`,
                    {
                        header: 'Внимание',
                        buttons: [
                            {label: 'Нет', variant: 'secondary', action: false},
                            {label: 'Да', variant: 'primary', action: true}
                        ]
                    }
                );
                if (!confirmRes) return;
            }
        }
        try {
            const _fnc = cloneDeep(this.fnc);
            clearObj(_fnc);
            await this.$.aDiffExec.execute({
                newObj: this.fnc,
                oldObj: this.fncOld
            });
            this.set('fnc.$action','upd');
            this.observerWork();
            this.fncOld = _fnc;
        } catch(e) {
            const nfStack = this.$.aDiffExec?.lastExecuteInfo?.nfStack;
            if (nfStack) {
                const position = NF.getPath(nfStack, '0.detail.position');
                if (position && position > 0) {
                    const {script} = await this.$.aDiff.execute({
                        newObj: this.fnc,
                        oldObj: this.fncOld
                    });
                    const bodyPos = script.indexOf(this.fnc.body);
                    const pos = position - bodyPos;
                    this.navigateToPosition(pos);
                }
            } else {
                let msg = e.message;
                if (e instanceof Response) {
                    msg = await e.text();
                }
                await this.showAlert(msg);
            }
        }
    }

    disableExec(hasChanges, invalid) {
        return !hasChanges || invalid;
    }

    addArg(event) {
        event.stopPropagation();
        this.push('fnc.args',Object.assign({},this.defaultArg));
    }

    delArg(event) {
        const idx = this.fnc.args.findIndex(x => x === event.model.item);
        this.splice('fnc.args', idx, 1);
    }

    resTypeIf(resKind, kind) {
        if (kind === 'combo') {
            if (resKind === 'single' || resKind === 'set') return true;
        } else {
            if (resKind === 'table') return true;
        }
        return false;
    }

    addResTableCol(event) {
        this.push('fnc.resTypeTable',Object.assign({},this.defaultResTableCol));
    }

    delResTypeTable(event) {
        const idx = this.fnc.resTypeTable.findIndex(x => x === event.model.item);
        this.splice('fnc.resTypeTable', idx, 1);
    }

    onClickArray(event) {
        event.stopPropagation();
    }

    async editorCompleter(editor, session, pos, prefix, callback) {
        const res = this.fnc.args.map(arg => ({
            caption: arg.name,
            value: arg.name,
            meta: `argument (${arg.type})`
        }));
        const localVarsRegexp = /declare\s+(.*?)\s+begin/si;
        const lvarsMatch = this.fnc.body.match(localVarsRegexp);
        if (lvarsMatch) {    const [, localVars] = lvarsMatch;
            const varsRegexp =/(?<var>[^\s]+)\s+(?<type>[^\s]*);/mig;
            const varsMatch = localVars.match(varsRegexp);
            if (varsMatch) {
                varsMatch.forEach((m) => {
                    varsRegexp.lastIndex = 0;
                    const {groups: chM} = varsRegexp.exec(m);
                    if (chM) {
                        res.push({
                            caption: chM.var,
                            value: chM.var,
                            meta: `local (${chM.type})`
                        });
                    }
                });
            }
        }

        const prefixPrefix = prefix.split('.')[0] || '';
        if (this.fnc.resKind === 'trigger' && (prefixPrefix === 'new' || prefixPrefix === 'old')) {
            let tableName = this.fnc.name.substring(this.fnc.name.indexOf('4')+1);
            const postfix = tableName.lastIndexOf('8');
            tableName = (postfix === -1) ? tableName : tableName.substring(0, postfix);
            if (tableName) {
                const response = await NF.requestServer(
                    '/@editor-provider-completer/',
                    {
                        headers: {'Content-Type': 'application/json'},
                        method: 'POST',
                        body: JSON.stringify({
                            provider: 'default',
                            component: 'dataset',
                            tableName: `${this.fnc.schema}.${tableName}`,
                            prefix
                        }),
                    }
                );
                const jsonData = await response.json();
                jsonData.data.map(item => {
                    if (item.meta === 'column') {
                        res.push({
                            caption: prefixPrefix + '.' + item.name,
                            value: prefixPrefix + '.' + item.name,
                            meta: `column (${item.datatype})`
                        });
                    }
                });
            }
        }
        return res;
    }

    navigateToPosition(position) {
        const lines = this.editor.session.doc.getAllLines()
        let row = 0, syms = 0, col = 0;
        for (const l = lines.length; row < l; row++) {
            syms = syms + lines[row].length + 1; //1 это перенос строки
            if (syms > position) {
                col = position - (syms - lines[row].length);
                break;
            }
        }
        this.editor.navigateTo(row,col);
        this.editor.scrollToLine(row,true);
    }
}