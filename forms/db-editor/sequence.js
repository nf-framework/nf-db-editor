import { html } from "polylib";
import { PlForm } from "@nfjs/front-pl/components/pl-form.js";

export default class DbEditorSequence extends PlForm {
    static get properties() {
        return {
            formTitle: { type: String, value: 'Последовательность' },
            seq: { type: Object, value: () => ({}) },
            invalid: { value: false },
            hasChanges: { value: false},
            schemas: { type: Array, value: () => [] },
            obj_name: {},
            obj_schema: {},
            action: {},
            obj: {}
        }
    }

    static get template() {
        return html`
            <pl-flex-layout fit vertical>
                <pl-flex-layout>
                    <pl-button label="Выполнить" variant="primary" dgisabled="[[disableExec(hasChanges,invalid)]]" on-click="[[exec]]"></pl-button>
                    <pl-button label="Просмотр" on-click="[[showCode]]"></pl-button>
                </pl-flex-layout>
                <pl-flex-layout vertical>
                    <pl-combobox label="Схема" value="{{seq.schema}}" orientation="horizontal" data="[[schemas]]" value-property="code" text-property="code" required></pl-combobox>
                    <pl-input label="Наименование" value="{{seq.name}}" orientation="horizontal" required></pl-input>
                    <pl-input label="Минимальное значение" value="{{seq.minvalue}}" orientation="horizontal" type="number" required></pl-input>
                    <pl-input label="Максимальное значение" value="{{seq.maxvalue}}" orientation="horizontal" type="number"></pl-input>
                    <pl-input label="Стартовое значение" value="{{seq.start}}" orientation="horizontal" type="number" required></pl-input>
                    <pl-input label="Инкремент" value="{{seq.increment}}" orientation="horizontal" type="number" required></pl-input>
                    <pl-input label="Сколько кешируется" value="{{seq.cache}}" orientation="horizontal" type="number" required></pl-input>
                    <pl-checkbox label="Зацикливается?" checked="{{seq.cycle}}" orientation="horizontal" required></pl-checkbox>
                    <pl-valid-observer invalid="{{invalid}}"></pl-valid-observer>
                </pl-flex-layout>
            </pl-flex-layout>
            <pl-data-observer id="doSeq" data="{{seq}}" is-changed="{{hasChanges}}"></pl-data-observer>
            <pl-action id="aGetDefinition" endpoint="/@nfjs/db-editor/dbo-compare/sequence/get"></pl-action>
            <pl-action id="aDiff" endpoint="/@nfjs/db-editor/dbo-compare/sequence/diff"></pl-action>
            <pl-action id="aDiffExec" endpoint="/@nfjs/db-editor/dbo-compare/sequence/diffexec"></pl-action>
            <pl-dataset id="dsSchemas" data="{{schemas}}" endpoint="/@nfjs/back/endpoint-sql/db-editor.object-schemas"></pl-dataset>
		`;
    }

    async onConnect() {
        if ((this.action ?? 'add') !== 'add') {
            const seq = await this.$.aGetDefinition.execute({name: this.obj_name,schema: this.obj_schema});
            if (this.action === 'copy') {
                seq.name = seq.name + '_copy';
                seq.$action = 'add';
                this.$.doSeq.snapshot();
                this.seqOld = Object.assign({},this.seq);
                Object.keys(seq).forEach((k) => {
                    this.set(`seq.${k}`, seq[k]);
                })
            } else {
                seq.$action = 'upd';
                this.seq = seq;
                this.observerWork();
                this.seqOld = Object.assign({},this.seq);
            }
        } else {
            const defaultSeq = {
                $action: 'add',
                minvalue: 1,
                start: 1,
                increment: 1,
                cycle: false,
                cache: 1
            };
            this.seqOld = Object.assign({},this.seq);
            this.$.doSeq.snapshot();
            const seq = {...defaultSeq, ...(this.obj || {})};
            Object.keys(seq).forEach((k) => {
                this.set(`seq.${k}`, seq[k]);
            });
        }
        if (!this.schemas || this.schemas.length === 0) this.$.dsSchemas.execute();
    }

    observerWork() {
        this.$.doSeq.reset();
        this.$.doSeq.snapshot();
    }

    async showCode() {
        const { script } = await this.$.aDiff.execute({
            newObj: this.seq,
            oldObj: this.seqOld
        });
        this.openModal(
            'db-editor.show-code',
            { scr: script },
        )
    }

    async exec() {
        await this.$.aDiffExec.execute({
            newObj: this.seq,
            oldObj: this.seqOld
        });
        this.set('seq.$action','upd');
        this.observerWork();
        this.seqOld = Object.assign({},this.seq);
    }

    disableExec(hasChanges, invalid) {
        return !hasChanges || invalid;
    }
}