import { PlElement, css } from "polylib";
class PlValidatorRestrictedValues extends PlElement {
    static get properties() {
        return {
            data: { type: Array, value: () => [] }
        }
    }
    static get css() {
        return css`
           :host {
                display: none;
            }
		`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.parentElement.validators.push(this.validate.bind(this));
    }

    disconnectedCallback(){
        super.disconnectedCallback();
        const idx = this.parentElement.validators.find(this.validate.bind(this));
        if (idx) this.parentElement.validators.splice(idx, 1);
    }

    validate(value) {
        if (this.data.indexOf(value) !== -1) {
            return 'Значение попадает в запрещенный список.';
        }
    }
}

customElements.define('pl-validator-restricted-values', PlValidatorRestrictedValues);
