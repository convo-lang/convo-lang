import { writeFile } from 'fs/promises';
import { convoGraphToConvo } from './convo-graph-converter.js';
import { parseConvoGraphCode } from './convo-graph-parser.js';
import { ConvoEdge, ConvoGraphDb, ConvoInputTemplate, ConvoNode, ConvoNodeStep } from './convo-graph-types.js';

describe('convo-graph-parser',()=>{
    it('should parse graph',()=>{

        const result=parseConvoGraphCode(/*convo*/`

> graph
${'```'} json
{
    "id":5,
    "name":"UI",
    "uuid":"h6Tn8LrkIZPzVY6sTqLD"
}
${'```'}

> node GetCar ( id: "id-GetCar" x: 8 y: 7 )

    > step fire( resetConvo: true )


        > user
        What is the fastest car for going fast and turning left

    > step()

        > describeCar(
            name:string
            topSpeedMph:number
        ) -> (
            return(__args)
        )

        @call
        > user
        Describe the car

> node Race()

    > define
    Stuff=struct(
        name:string
    )

    > step()

        @topTag
        > user
        Simulate a race with the car below

        Car: {{input}}

> edge GetCar() -> Race(
    return(carIsCool)
)

@key TextInput
@x 100
@y 200
> input
Hello

@key JsonInput
> input
${'```'} json
{"someProp":"someValue"}
${'```'}

        `);

        const db=result.result?.db;

        //console.info('ConvoGraphDb',JSON.stringify(db,null,4));

        expect(result.error).toBeUndefined();

        expect(db).not.toBeUndefined();

        if(!db){
            return;
        }

        expect(result.result?.db.metadata).toEqual({
            id:5,
            name:"UI",
            uuid:"h6Tn8LrkIZPzVY6sTqLD"
        });

        let node:ConvoNode|undefined;
        let edge:ConvoEdge|undefined;
        let step:ConvoNodeStep|undefined;
        let input:ConvoInputTemplate|undefined;

        expect(db.nodes.length).toBe(2);
        expect(db.edges.length).toBe(1);
        expect(db.inputs.length).toBe(2);

        node=db.nodes[0];
        expect(node).not.toBeUndefined();
        expect(node?.key).toBe('GetCar');
        expect(node?.id).toBe('id-GetCar');
        expect(node?.x).toBe(8);
        expect(node?.y).toBe(7);
        expect(node?.steps.length).toBe(2);

        step=node?.steps[0];
        expect(step).not.toBeUndefined();
        expect(step?.name).toBe('fire');
        expect(step?.resetConvo).toBe(true);
        expect(step?.convo.trim()).toBe(
            `> user\n        What is the fastest car for going fast and turning left`
        )

        step=node?.steps[1];
        expect(step).not.toBeUndefined();
        expect(step?.name).toBeUndefined();
        expect(step?.resetConvo).toBeUndefined();
        expect(step?.convo.trim()).toBe(
            `> describeCar(\n            name:string\n            topSpeedMph:number\n        ) -> (\n            return(__args)\n        )\n\n\n\n        @call\n        > user\n        Describe the car`
        )


        node=db.nodes[1];
        expect(node).not.toBeUndefined();
        expect(node?.key).toBe('Race');
        expect(node?.id).not.toBeUndefined();
        expect(node?.steps.length).toBe(1);
        expect(node?.sharedConvo?.trim()).toBe(
            `> define\n    Stuff=struct(\n        name:string\n    )`
        )

        step=node?.steps[0];
        expect(step).not.toBeUndefined();
        expect(step?.name).toBeUndefined();
        expect(step?.resetConvo).toBeUndefined();
        expect(step?.convo.trim()).toBe(
            `@topTag\n        > user\n        Simulate a race with the car below\n\n        Car: {{input}}`
        )


        edge=db.edges[0];
        expect(edge).not.toBeUndefined();
        expect(edge?.from).toBe('GetCar');
        expect(edge?.to).toBe('Race');
        expect(edge?.conditionConvo?.trim()).toBe(
            `return(carIsCool)`
        )

        input=db.inputs[0];
        expect(input).not.toBeUndefined();
        expect(input?.key).toBe('TextInput');
        expect(input?.value).toBe('Hello');
        expect(input?.isJson).toBeUndefined();
        expect(input?.x).toBe(100);
        expect(input?.y).toBe(200);

        input=db.inputs[1];
        expect(input).not.toBeUndefined();
        expect(input?.key).toBe('JsonInput');
        expect(input?.value).toBe(`{"someProp":"someValue"}`)
        expect(input?.isJson).toBe(true);

    })

    it('should convert to string graph',async ()=>{

        const db:ConvoGraphDb={
            "metadata":{
                id:5,
                name:"UI",
                uuid:"h6Tn8LrkIZPzVY6sTqLD"
            },
            "nodes": [
                {
                    "id": "id-GetCar",
                    "x": 8,
                    "y": 7,
                    "key": "GetCar",
                    "steps": [
                        {
                            "resetConvo": true,
                            "name": "fire",
                            "convo": "        \n        \n        > user\n        What is the fastest car for going fast and turning left\n\n    "
                        },
                        {
                            "convo": "        \n        \n        > describeCar(\n            name:string\n            topSpeedMph:number\n        ) -> (\n            return(__args)\n        )\n\n\n\n        @call\n        > user\n        Describe the car\n\n"
                        }
                    ]
                },
                {
                    "id": "hg9zT_xvRYS0cfk1DOPIKw",
                    "key": "Race",
                    "steps": [
                        {
                            "convo": "\n\n\n        @topTag\n        > user\n        Simulate a race with the car below\n\n        Car: {{input}}\n\n"
                        }
                    ],
                    "sharedConvo": "    > define\n    Stuff=struct(\n        name:string\n    )\n\n    "
                }
            ],
            "edges": [
                {
                    "id": "ABWD6cfxRj2Ubewgt50pig",
                    "from": "GetCar",
                    "to": "Race",
                    "conditionConvo": "return(carIsCool)"
                }
            ],
            "traversers": [],
            "inputs": [
                {
                    "id": "tiSbjIjJSgGJ7tDxK_IWiA",
                    "value": "Hello",
                    "key": "TextInput",
                    "x": 100,
                    "y": 200
                },
                {
                    "id": "VLDSFkpwSxOx99R9Gayhxw",
                    "isJson": true,
                    "value": "{\"someProp\":\"someValue\"}",
                    "key": "JsonInput"
                }
            ],
            "sourceNodes": []
        }

        const convo=convoGraphToConvo(db);

        // tmp
        await writeFile('/Users/scott/docs/convo-lang/Documents/workflow-text.convo',convo)
    })

    it('should format indents',async ()=>{

        const db:Partial<ConvoGraphDb>={
            nodes:[
                {
                    id:'n1',
                    sharedConvo:'> define\nsomeVar=77',
                    steps:[
                        {
                            convo:'> user\nGo fast!'
                        },
                        {
                            convo:'    > user\n    Turn left!'
                        },
                    ]
                },
                {
                    id:'n2',
                    steps:[
                        {
                            convo:'\n\n\n> add(a:int,b:int) -> (\n    return(add(a b))\n)\n\n@call\n> user\nAdd 100 and 500'
                        }
                    ]
                }
            ],
            edges:[
                {
                    id:'e1',
                    from:'n1',
                    to:'n2',
                    conditionConvo:'r=add(input 7)\nreturn(gt(r 8))'
                }
            ]
        }

        const convo=convoGraphToConvo(db);

        // tmp
        await writeFile('/Users/scott/docs/convo-lang/Documents/formatting.convo',convo)



    });

});
