import { html } from "polylib";
import { PlForm } from "@nfjs/front-pl/components/pl-form.js";

export default class DbEditorShowCode extends PlForm {
    static get properties() {
        return {
            scr: { type: String, value: undefined},
        }
    }

    static get template() {
        return html`
            <pl-card header="Изменения" fit>
                <pl-codeeditor value="{{scr}}" mode="ace/mode/sql"></pl-codeeditor>
                <pl-flex-layout slot="footer">
                    <pl-button label="Закрыть" on-click="[[close]]"></pl-button>
                </pl-flex-layout>
            </pl-card>
		`;
    }
}