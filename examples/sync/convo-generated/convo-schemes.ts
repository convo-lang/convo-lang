import { z } from "zod";

export const ExampleCompPropsConvoBindingScheme=z.object({
    name:z.string(),
    age:z.number().optional(),
});

export const HatConvoBindingScheme=z.object({
    size:z.number(),
    style:z.string(),
}).describe("Fucking cool swag");

export const PersonConvoBindingScheme=z.object({
    age:z.number(),
    job:z.string(),
    name:z.string(),
}).describe("Some people man 🤷");

export const ExampleInfConvoBindingScheme=z.object({
    stringProp:z.string().describe("Lots of characters\ncats of characters\n@poo bar"),
    numberProp:z.number(),
    stringPropOp:z.string().optional(),
    boolOp:z.boolean().optional(),
    boolValue:z.boolean(),
    nullProp:z.null(),
    undefinedProp:z.undefined(),
    unionProp:z.union([z.literal("abc"),z.literal("123"),z.literal("xyz")]),
    unionPropOptional:z.union([z.literal("abc"),z.literal("xyz"),z.literal(123),z.literal(456)]).optional(),
    aryStringProp:z.string().array(),
    aryNumberProp:z.number().array(),
    aryStringPropOp:z.string().array().optional(),
    aryNullProp:z.null().array(),
    aryUndefinedProp:z.undefined().array(),
    aryUnionProp:z.union([z.literal("abc"),z.literal("123"),z.literal("xyz")]).array(),
    aryUnionPropOptional:z.union([z.literal("abc"),z.literal("xyz"),z.literal(123),z.literal(456)]).array().optional(),
    objProp:z.object({
        name:z.string().describe("Obj name\n@example fire"),
        height:z.number().optional(),
        type:z.union([z.literal("cat"),z.literal("dog"),z.literal("car")]),
    }),
    car:z.object({
        name:z.string(),
        topSpeed:z.number(),
        isCompanyVehicle:z.boolean().optional(),
    }).optional().describe("This is a car"),
    car2:z.object({
        name:z.string(),
        topSpeed:z.number(),
        isCompanyVehicle:z.boolean().optional(),
    }).optional().describe("For going fast"),
    carMatrix:z.object({
        name:z.string(),
        topSpeed:z.number(),
        isCompanyVehicle:z.boolean().optional(),
    }).array().array().optional(),
    max:z.string().array(),
    pp:z.boolean(),
    name:z.string(),
}).describe("Example Interface");

