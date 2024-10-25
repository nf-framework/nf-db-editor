import path from 'path';

import * as objects from '@nfjs/dbo-compare';
import { web, dbapi } from '@nfjs/back';
import { api as nfApi, config } from '@nfjs/core';
import { registerCustomElementsDir } from "@nfjs/front-server";

import * as api from './src/db-editor.js';

const meta = {
    require: {
        after: '@nfjs/back'
    }
};

const __dirname = path.join(path.dirname(decodeURI(new URL(import.meta.url).pathname))).replace(/^\\([A-Z]:\\)/, "$1");
let menu = await nfApi.loadJSON(__dirname+'/menu.json');

async function init() {
    registerCustomElementsDir('@nfjs/db-editor/components');

    const objTypes = {
        function: 'DboFunction',
        sequence: 'DboSequence',
        table: 'DboTable',
        trigger: 'DboTrigger',
        view: 'DboView'
    }
    web.on(
        'POST',
        '/@nfjs/db-editor/dbo-compare/:object/:method',
        { middleware: ['session','json'] },
        async (context) => {
            let res, connect;
            try {
                const { object, method } = context.params;
                const args = context.body.args;
                const { provider } = args

                const obj = objects[objTypes[object]];
                connect = await dbapi.getConnect(context, { provider });
                switch (method) {
                    case 'get': {
                        res = await obj.get(connect._connect, args);
                        break;
                    }
                    case 'diff': {
                        const { newObj, oldObj } = args;
                        const diffRes = await obj.diff(newObj, oldObj, { simple: false });
                        res = { script: obj.diffToScript(diffRes) };
                        break;
                    }
                    case 'diffexec': {
                        const { newObj, oldObj } = args;
                        const diffRes = await obj.diff(newObj, oldObj, { simple: false });
                        const script = obj.diffToScript(diffRes);
                        await connect._connect.query({text: script});
                        break;
                    }
                    default: break;
                }
                context.send({ data: res });
            } catch (e) {
                context.code(500).send(e.message);
            } finally {
                if (connect) connect.release();
            }
        }
    );

    web.on(
        'GET',
        '/@nfjs/db-editor/restrictedIdents',
        {},
        async (context) => { context.send({ data: api.restrictedIdents });
    });

    web.on(
        'GET',
        '/@nfjs/db-editor/config-ui',
        async (context) => {
            context.send({
                data: Object.assign({
                    tableIdentifierPattern: '^[a-z]{1}[0-9a-z_]*$',
                    viewIdentifierPattern: '^v4[a-z]{1}[0-9a-z_]*$',
                    functionIdentifierPattern: '^f4[a-z]{1}[0-9a-z_]*$',
                    sequenceIdentifierPattern: '^s4[a-z]{1}[0-9a-z_]*$',
                    triggerIdentifierPattern: '^tr4[a-z]{1}[0-9a-z_]*$',
                    indexIdentifierPattern: '^i4[a-z]{1}[0-9a-z_]*$',
                    columnIdentifierPattern: '^[a-z]{1}[0-9a-z_]*$',
                    constraintIdentifierPattern: '^(ch|fk|uk|ex|pk)4[a-z]{1}[0-9a-z_]*$',
                    objectIdentifierPrefixDelimiter: '4',
                    objectIdentifierPostfixDelimiter: '8'
                }, config?.['@nfjs/db-editor']?.ui ?? {})
            });
        }
    );

    web.on(
        'POST',
        '/@nfjs/db-editor/:method',
        { middleware: ['session','json'] },
        async (context) => {
            try {
                const {method} = context.params;
                const resMethodExec = await api[method](context, context.body.args);
                context.send({ data: resMethodExec});
            } catch (e) {
                context.code(500).send(e.message);
            }
        }
    );
}

export {
    meta,
    init,
    menu
};
