export interface ExampleCompPropsConvoBinding{
    name:string;
    age?:number;
}

/**
 * Fucking cool swag
 */
export interface HatConvoBinding{
    size:number;
    style:string;
}

/**
 * Some people man 🤷
 */
export interface PersonConvoBinding{
    age:number;
    job:string;
    name:string;
}

/**
 * Example Interface
 */
export interface ExampleInfConvoBinding{
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
    unionProp:"abc"|"123"|"xyz";
    unionPropOptional?:"abc"|"xyz"|123|456;
    aryStringProp:(string)[];
    aryNumberProp:(number)[];
    aryStringPropOp?:(string)[];
    aryNullProp:(null)[];
    aryUndefinedProp:(undefined)[];
    aryUnionProp:("abc"|"123"|"xyz")[];
    aryUnionPropOptional?:("abc"|"xyz"|123|456)[];
    objProp:{
        /**
         * Obj name
         * @example fire
         */
        name:string;
        height?:number;
        type:"cat"|"dog"|"car";
    };
    /**
     * This is a car
     */
    car?:{
        name:string;
        topSpeed:number;
        isCompanyVehicle?:boolean;
    };
    /**
     * For going fast
     */
    car2?:{
        name:string;
        topSpeed:number;
        isCompanyVehicle?:boolean;
    };
    carMatrix?:(({
        name:string;
        topSpeed:number;
        isCompanyVehicle?:boolean;
    })[])[];
    max:(string)[];
    pp:boolean;
    name:string;
}

