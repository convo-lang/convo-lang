export interface ConvoModelTestResult
{
    model:string;
    testName:string;
    passed:boolean;
    errorMessage?:string;
    errorStack?:string;
    warnings?:string[];
    comments?:string[];
    convo:string;
    debugOutput?:string[];
    durationMs:number;
}
