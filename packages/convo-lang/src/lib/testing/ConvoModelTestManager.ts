import { ConvoModelInfo, convoAnyModelName, convoCompletionService, convoConversationConverterProvider } from "@convo-lang/convo-lang";
import { InternalOptions, ReadonlySubject, pushBehaviorSubjectAry } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { ConvoModelTester } from "./ConvoModelTester";
import { ConvoModelTestResult } from './convo-testing-types';

export interface ConvoModelTestManagerOptions
{
    models:ConvoModelInfo[];
    parallel?:boolean;
    printUpdates?:boolean;
    verbose?:boolean;
    defaultModel?:boolean;
}

export class ConvoModelTestManager
{

    private readonly options:InternalOptions<ConvoModelTestManagerOptions>;

    private readonly _testResults:BehaviorSubject<ConvoModelTestResult[]>=new BehaviorSubject<ConvoModelTestResult[]>([]);
    public get testResultsSubject():ReadonlySubject<ConvoModelTestResult[]>{return this._testResults}
    public get testResults(){return this._testResults.value}

    public constructor({
        models,
        parallel=false,
        printUpdates=false,
        verbose=false,
        defaultModel=false,
    }:ConvoModelTestManagerOptions){

        this.options={
            models,
            parallel,
            printUpdates,
            verbose,
            defaultModel,
        }

        if(printUpdates){
            this._testResults.subscribe(this.printUpdate);
        }
    }

    public printUpdate=()=>{
        const grid:Record<string,Record<string,any>>={};
        for(const r of this.testResults){
            const row=grid[r.model]??(grid[r.model]={});
            row['model']=r.model;
            row['ms']=r.durationMs;
            row[r.testName]=r.passed;
            if(r.errorMessage){
                row[`${r.testName}_err`]=r.errorMessage.substring(0,40);
            }
        }

        const rows=Object.values(grid);
        rows.sort((a,b)=>(a['model'] as string).localeCompare(b['model']));
        console.table(rows);

    }

    public printResults(errorsOnly:boolean)
    {
        for(const r of this.testResults){
            if(r.passed && errorsOnly){
                continue;
            }

            console.log(`\n--------------------- ${r.model}:${r.testName} ${r.passed?'passed':'failed'}`);
            const p:Partial<ConvoModelTestResult>={...r};
            delete p.debugOutput;
            delete p.convo;
            console.log(p);

            if(r.debugOutput){
                console.log('<debugOutput>');
                console.log(r.debugOutput.join('\n'));
                console.log('</debugOutput>');
            }

            if(r.convo){
                console.log('convo>');
                console.log(r.convo);
                console.log('</convo>');
            }

            if(r.errorMessage){
                console.log('errorMessage>');
                console.log(r.errorMessage);
                console.log('</errorMessage>');
            }

            console.log(`\n--------------------- end ${r.model}:${r.testName} \n\n`);
        }
    }

    private testNames?:string[];

    public async runTestAsync()
    {
        const testModelAsync=(model:ConvoModelInfo)=>{
            const tester=new ConvoModelTester({
                manager:this,
                model:model.name,
                convoOptions:{
                    completionService:convoCompletionService.all(),
                    converters:convoConversationConverterProvider.all(),
                },
            });

            if(!this.testNames){
                this.testNames=tester.getTestNames();
            }

            return tester.runAllTestsAsync();
        }

        try{

            const models=[...this.options.models];
            if(this.options.defaultModel){
                models.push({name:convoAnyModelName});
            }

            if(this.options.parallel){
                await Promise.all(models.map(testModelAsync));
            }else{
                for(const model of models){
                    await testModelAsync(model);
                }
            }

            this.testResults.sort((a,b)=>`${a.model}:${a.testName}`.localeCompare(`${b.model}:${b.testName}`))

        }catch(ex){
            console.log(`testing failed`,ex);
            process.exit(1);
        }
    }

    public publishResult(result:ConvoModelTestResult){
        pushBehaviorSubjectAry(this._testResults,result);
    }
}
