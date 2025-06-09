import { BaseInf } from "./common";

/**
 * This is a car
 */
interface Car{
    name:string;
    topSpeed:number;
    isCompanyVehicle?:boolean;
}

/**
 * Example Interface
 * @convoType
 */
export interface ExampleInf extends BaseInf
{
    /**
     * Lots of characters
     * cats of characters
     * @poo bar
     */
    stringProp:string;
    numberProp:number;
    stringPropOp?:string;
    boolOp?:boolean;
    boolValue:boolean;
    nullProp:null;
    undefinedProp:undefined;
    unionProp:'abc'|'123'|'xyz';
    unionPropOptional?:'abc'|123|'xyz'|456;


    aryStringProp:string[];
    aryNumberProp:number[];
    aryStringPropOp?:string[];
    aryNullProp:null[];
    aryUndefinedProp:undefined[];
    aryUnionProp:('abc'|'123'|'xyz')[];
    aryUnionPropOptional?:('abc'|123|'xyz'|456)[];

    objProp:{
        /**
         * Obj name
         * @example fire
         */
        name:string;
        height?:number;
        type:'cat'|'dog'|'car';
    },

    car?:Car;
    /**
     * For going fast
     */
    car2?:Car;
    carMatrix?:Car[][];
    max:string[];
    pp:boolean;
}


