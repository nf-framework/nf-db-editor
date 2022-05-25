import { html, css } from "polylib";
import { PlForm } from "@nfjs/front-pl/components/pl-form.js";
import {clearObj, cloneDeep} from "@nfjs/core/api/common";
export default class DbEditorObjects extends PlForm {
    static get properties() {
        return {
            formTitle: { type: String, value: 'Объекты базы данных' },
            objPages: {
                type: Array,
                value: () => ([])
            },
            selectedObjType: {
                type: String,
                value: 'all'
            },
            objSchemas: { value: () => ([]) },
            objects: { value: () => ([]) },
            objectsInWork: { value: () => ([]) },
            activeObjSchema: { },
            objectActiveTab: { }
        }
    }

    static get css() {
        return css`
            pl-grid {
                --pl-grid-cell-min-height: 24px;
            }
            .objtab {
                width: 400px;
                height: 100%;
            }
            .schemas-grid {
                height: 240px;
                width: 100%;
            }
        `;
    }

    static get template() {
        return html`
            <pl-flex-layout fit>
                <pl-flex-layout class="objtab" vertical>
                    <pl-flex-layout>
                        <pl-button variant="primary" label="Добавить" on-click="[[onMenuObjectNew]]">
                            <pl-icon iconset="pl-default" size="16" icon="plus" slot="prefix"></pl-icon>
                        </pl-button>
                        <pl-icon-button iconset="pl-default" icon="menu" on-click="[[onMenuMain]]"></pl-icon-button>
                    </pl-flex-layout>
                    <pl-tabpanel>
                        <pl-tab header="Объекты">
                            <pl-flex-layout fit vertical>
                                <pl-flex-layout class="schemas-grid">
                                    <pl-grid data="[[objSchemas]]" selected="{{activeObjSchema}}">
                                        <pl-flex-layout slot="top-toolbar">
                                            <pl-filter-container data="{{objSchemas}}">
                                                <pl-filter-item field="code">
                                                    <pl-input></pl-input>
                                                </pl-filter-item>
                                            </pl-filter-container>
                                        </pl-flex-layout>
                                        <pl-grid-column field="code" header="Схемы"></pl-grid-column>
                                    </pl-grid>
                                </pl-flex-layout>
                                <pl-flex-layout fit>
                                    <pl-grid data="[[objects]]" selected="{{activeObj}}">
                                        <pl-flex-layout slot="top-toolbar">
                                            <pl-icon-button iconset="pl-default" icon="database" variant="ghost" on-click="[[setSelectedObjTypeAll]]"></pl-icon-button>
                                            <pl-icon-button iconset="pl-default" icon="table" variant="ghost" on-click="[[setSelectedObjTypeTable]]"></pl-icon-button>
                                            <pl-icon-button iconset="pl-default" icon="view" variant="ghost" on-click="[[setSelectedObjTypeView]]"></pl-icon-button>
                                            <pl-icon-button iconset="pl-default" icon="function" variant="ghost" on-click="[[setSelectedObjTypeFunction]]"></pl-icon-button>
                                            <pl-icon-button iconset="pl-default" icon="trigger" variant="ghost" on-click="[[setSelectedObjTypeTrigger]]"></pl-icon-button>
                                            <pl-icon-button iconset="pl-default" icon="sequence" variant="ghost" on-click="[[setSelectedObjTypeSequence]]"></pl-icon-button>
                                            <pl-input stretch></pl-input>
                                        </pl-flex-layout>
                                        <pl-grid-column header="Имя объекта" field="obj_name"></pl-grid-column>
                                        <pl-grid-column action width="100">
                                            <template>
                                                <style>
                                                    pl-flex-layout {
                                                        gap: 0px;
                                                    }
                                                </style>
                                                <pl-flex-layout>
                                                    <pl-icon-button iconset="pl-default" icon="pencil" on-click="[[onObjUpd]]" size="14" variant="link"></pl-icon-button>
                                                    <pl-icon-button iconset="pl-default" icon="copy" on-click="[[onObjCopy]]" variant="link" size="14"></pl-icon-button>
                                                    <pl-icon-button iconset="pl-default" icon="menu" on-click="[[onObjMenu]]" variant="link" size="14"></pl-icon-button>
                                                </pl-flex-layout>
                                            </template>
                                        </pl-grid-column>
                                    </pl-grid>
                                </pl-flex-layout>
                            </pl-flex-layout>
                        </pl-tab>
                        <pl-tab header="Сущности">
                        </pl-tab>
                    </pl-tabpanel>
                </pl-flex-layout>
                <pl-flex-layout>
                </pl-flex-layout>
            </pl-flex-layout>
            <pl-dropdown-menu id="ddMenuObjectNew">
                <pl-dropdown-menu-item label="Схема" on-click="[[onAddSchema]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Таблица" on-click="[[onAddTable]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Представление" on-click="[[onAddView]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Функция" on-click="[[onAddFunction]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Триггер" on-click="[[onAddTrigger]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Последовательность" on-click="[[onAddSequence]]"></pl-dropdown-menu-item>
            </pl-dropdown-menu>
            <pl-dropdown-menu id="ddMenuObject">
                <pl-dropdown-menu-item label="Удалить" on-click="[[onObjDel]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="select * from" on-click="[[onObjSelectFrom]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="openapi" on-click="[[onObjGenOpenapiForTable]]"></pl-dropdown-menu-item>
            </pl-dropdown-menu>
            <pl-dropdown-menu id="ddMenuMain">
                <pl-dropdown-menu-item label="Выполнить запрос" on-click="[[onNewQuery]]"></pl-dropdown-menu-item>
                <pl-dropdown-menu-item label="Выдать необходимые права" on-click="[[onGrantAll]]"></pl-dropdown-menu-item>
            </pl-dropdown-menu>
            <pl-dataset id="dsObjSchemas" data="{{objSchemas}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.object-schemas"></pl-dataset>
            <pl-dataset id="dsObj" data="{{objects}}" args="[[_compose('schema;type',activeObjSchema.code,selectedObjType)]]" execute-on-args-change required-args="schema" endpoint="/@nfjs/back/endpoint-sql/db-editor.objects"></pl-dataset>
            <pl-action id="aDropObject" endpoint="/@nfjs/db-editor/drop"></pl-action>
		`;
    }
    onConnect() {
        this.$.dsObjSchemas.execute()
            .then(() => {
                if (this.objSchemas?.[0]) this.activeObjSchema = this.objSchemas[0];
            });
    }

    async objOperation(obj) {
        await this.open(`db-editor.${obj.obj_type}`, obj);
        if (this.activeObjSchema) this.$.dsObj.execute();
    }

    onAddObject(type) {
        const obj_schema = this.activeObjSchema?.code;
        const obj_type = type;
        const params = {
            obj_schema,
            obj_name: null,
            obj_fullname: null,
            obj_type,
            action: 'add',
            new_schema: obj_schema,
            new_name: null,
            new_action: 'add'
        }
        this.objectActiveTab = this.push('objectsInWork', params) - 1;
        this.objOperation(params);
    }

    onObjUpd(event, action) {
        const { obj_type, obj_schema, obj_name, obj_fullname } = event.model.row;
        const params = {
            obj_schema,
            obj_name,
            obj_fullname,
            obj_type,
            action: action || 'upd',
            new_schema: obj_schema,
            new_name: obj_name,
            new_action: action || 'upd'
        }
        let idx = this.objectsInWork.findIndex( o => o.new_name === obj_name && o.new_schema === obj_schema && o.new_action === 'upd' );
        if (idx < 0) idx = this.push('objectsInWork', params) -1;
        this.objectActiveTab = idx;
        this.objOperation(params);
    }

    onObjCopy(event) {
        this.onObjUpd(event, 'copy');
    }

    async onObjDel(event) {
        const { obj_identity: objIdentity, obj_type: objType } = event.model.row;
        const resConfirm = await this.showConfirm(
            `Подтвердите полное удаление объекта ${objIdentity}.`,
            {
                header: 'Внимание',
                buttons: [
                    {label: 'Нет', variant: 'secondary', action: false,},
                    {label: 'Удалить', variant: 'primary', negative: true, action: true}
                ]
            }
        );
        if (resConfirm) {
            await this.$.aDropObject.execute({ objIdentity, objType });
            this.$.dsObj.execute();
        }
    }

    onObjMenu(event) {
        this.$.ddMenuObject.open(event.target, undefined, { model: event.model });
    }

    onObjSelectFrom() { alert('Not implemented') }

    onObjGenOpenapiForTable() { alert('Not implemented') }

    onAddFunction() { this.onAddObject('function'); }
    onAddTrigger() { this.onAddObject('trigger'); }
    onAddView() { this.onAddObject('view'); }
    onAddTable() { this.onAddObject('table'); }
    onAddSequence() { this.onAddObject('sequence'); }
    onAddSchema() { alert('Not implemented') }

    onNewQuery() { alert('Not implemented') }
    onGrantAll() {  }

    onMenuObjectNew(event) {
        this.$.ddMenuObjectNew.open(event.target);
    }

    onMenuMain(event) {
        this.$.ddMenuMain.open(event.target);
    }



    setSelectedObjTypeAll() {
        this.selectedObjType = 'all';
    }
    setSelectedObjTypeTable() {
        this.selectedObjType = 'table';
    }
    setSelectedObjTypeView() {
        this.selectedObjType = 'view';
    }
    setSelectedObjTypeFunction() {
        this.selectedObjType = 'function';
    }
    setSelectedObjTypeTrigger() {
        this.selectedObjType = 'trigger';
    }
    setSelectedObjTypeSequence() {
        this.selectedObjType = 'sequence';
    }


}